package services

import (
	"log"
	"net"
	"strconv"
	"sync"
	"time"

	"xand/config"
	"xand/models"
	"xand/utils"
)

type NodeDiscovery struct {
	cfg  *config.Config
	prpc *PRPCClient
	geo  *utils.GeoResolver

	knownNodes map[string]*models.Node // Key: IP (or IP:Port if multiple nodes per IP possible? ID is best)
	nodesMutex sync.RWMutex

	stopChan chan struct{}
}

func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver) *NodeDiscovery {
	return &NodeDiscovery{
		cfg:  cfg,
		prpc: prpc,
		geo:  geo,

		knownNodes: make(map[string]*models.Node),
		stopChan:   make(chan struct{}),
	}
}

// Start begins the background polling routines and bootstrapping
func (nd *NodeDiscovery) Start() {
	// 1. Bootstrap immediately
	go nd.Bootstrap()

	// 2. Start Loops
	go nd.runDiscoveryLoop()
	go nd.runStatsLoop()
	go nd.runHealthLoop()
}

func (nd *NodeDiscovery) Stop() {
	close(nd.stopChan)
}

func (nd *NodeDiscovery) runDiscoveryLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.DiscoveryInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.discoverPeers()
		case <-nd.stopChan:
			return
		}
	}
}

func (nd *NodeDiscovery) runStatsLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.StatsInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.collectStats()
		case <-nd.stopChan:
			return
		}
	}
}

func (nd *NodeDiscovery) runHealthLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.HealthCheckInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.healthCheck()
		case <-nd.stopChan:
			return
		}
	}
}

// Bootstrap loads initial nodes from config and starts discovery
func (nd *NodeDiscovery) Bootstrap() {
	log.Println("Starting Bootstrap process...")
	// for _, seed := range nd.cfg.Server.SeedNodes {
	// 	log.Printf("Bootstrapping from seed: %s", seed)
	// 	nd.processNodeAddress(seed)
	// }
	if len(nd.cfg.Server.SeedNodes) == 0 {
		log.Println("WARNING: No seed nodes configured! Set SEED_NODES environment variable.")
		return
	}

	for _, seed := range nd.cfg.Server.SeedNodes {
		log.Printf("Bootstrapping from seed: %s", seed)
		nd.processNodeAddress(seed)
	}

	// Wait for initial connection
	time.Sleep(2 * time.Second)
	// Run initial collection immediately after bootstrap phase to populate data quickly
	go nd.discoverPeers()
	go nd.healthCheck()  // Pings to verify online status
	go nd.collectStats() // Get initial stats
}

// discoverPeers iterates known nodes and asks for their peers
func (nd *NodeDiscovery) discoverPeers() {
	nodes := nd.GetNodes()
	for _, node := range nodes {
		if !node.IsOnline {
			continue
		}
		go func(n *models.Node) {
			podsResp, err := nd.prpc.GetPods(n.Address)
			if err != nil {
				return
			}
			for _, pod := range podsResp.Pods {
				// The pod.Address usually contains the gossip port (e.g. 9001)
				// We need to connect via RPC port (e.g. 6000)
				host, _, err := net.SplitHostPort(pod.Address)
				if err != nil {
					// Fallback if address is just IP? Or log error
					host = pod.Address // Try as is if split fails
				}

				if pod.RpcPort > 0 {
					rpcAddress := net.JoinHostPort(host, strconv.Itoa(pod.RpcPort))
					nd.processNodeAddress(rpcAddress)
				} else {
					// Fallback to address if no rpc_port specified (unlikely if v0.8.0+)
					nd.processNodeAddress(pod.Address)
				}
			}
		}(node)
	}
}

// collectStats queries all nodes for their stats
func (nd *NodeDiscovery) collectStats() {
	nodes := nd.GetNodes() // Snapshot
	for _, node := range nodes {
		go func(n *models.Node) {
			statsResp, err := nd.prpc.GetStats(n.Address)
			if err == nil {
				nd.nodesMutex.Lock()
				if storedNode, exists := nd.knownNodes[n.ID]; exists {
					nd.updateStats(storedNode, statsResp)
					storedNode.LastSeen = time.Now() // Successful stats implies seen
				}
				nd.nodesMutex.Unlock()
			}
		}(node)
	}
}

// healthCheck pings nodes to update status and metrics (ping only)
func (nd *NodeDiscovery) healthCheck() {
	// log.Println("Running Health Check...")
	nodes := nd.GetNodes()

	for _, node := range nodes {
		go func(n *models.Node) {
			start := time.Now()
			// Check Version -> Status/Ping
			verResp, err := nd.prpc.GetVersion(n.Address)
			latency := time.Since(start).Milliseconds()

			nd.nodesMutex.Lock()
			defer nd.nodesMutex.Unlock()

			storedNode, exists := nd.knownNodes[n.ID]
			if !exists {
				return
			}

			// Update Tracking
			storedNode.ResponseTime = latency
			updateCallHistory(storedNode, err == nil)
			storedNode.TotalCalls++ // We can track total pings here
			if err == nil {
				storedNode.SuccessCalls++ // Simple counter, though performance score uses History
				storedNode.IsOnline = true
				storedNode.LastSeen = time.Now()
				storedNode.Version = verResp.Version
			} else {
				// Handle Stale
				if time.Since(storedNode.LastSeen) > time.Duration(nd.cfg.Polling.StaleThreshold)*time.Minute {
					delete(nd.knownNodes, storedNode.ID)
				}
			}
		}(node)
	}
}

func updateCallHistory(n *models.Node, success bool) {
	if n.CallHistory == nil {
		n.CallHistory = make([]bool, 0, 10)
	}
	// Append
	if len(n.CallHistory) >= 10 {
		n.CallHistory = n.CallHistory[1:] // shift
	}
	n.CallHistory = append(n.CallHistory, success)
}

// processNodeAddress handles a potentially new node address
func (nd *NodeDiscovery) processNodeAddress(address string) {
	id := address

	nd.nodesMutex.RLock()
	_, exists := nd.knownNodes[id]
	nd.nodesMutex.RUnlock()

	if exists {
		return // Already known
	}

	 log.Printf("Attempting to connect to node: %s", address)

	// Verify connectivity first
	verResp, err := nd.prpc.GetVersion(address)
	if err != nil {
		log.Printf("Failed to connect to %s: %v", address, err)
		return
	}
	log.Printf("Successfully connected to %s, version: %s", address, verResp.Version)


	// Create Node
	host, portStr, _ := net.SplitHostPort(address)
	port, _ := strconv.Atoi(portStr)

	newNode := &models.Node{
		ID:        address,
		Address:   address,
		IP:        host,
		Port:      port,
		Version:   verResp.Version,
		IsOnline:  true,
		FirstSeen: time.Now(),
		LastSeen:  time.Now(),
		Status:    "active", // Initial status
	}

	// Initial Enrichment (synchronous for first add to be useful immediately)
	// 1. Stats
	statsResp, err := nd.prpc.GetStats(address)
	if err == nil {
		nd.updateStats(newNode, statsResp)
	}

	// 2. GeoIP
	country, city, lat, lon := nd.geo.Lookup(host)
	newNode.Country = country
	newNode.City = city
	newNode.Lat = lat
	newNode.Lon = lon

	// 3. Staking (Real data pending)
	newNode.TotalStake = 0
	newNode.Commission = 0
	newNode.BoostFactor = 0
	newNode.APY = 0

	// Store
	nd.nodesMutex.Lock()
	nd.knownNodes[id] = newNode
	nd.nodesMutex.Unlock()

log.Printf("✓ Discovered new node: %s (%s, %s, v%s)", address, country, city, verResp.Version)
	// Recursive Discovery
	go func() {
		log.Printf("Fetching peers from %s...", address)
		podsResp, err := nd.prpc.GetPods(address)
		if err == nil {
			for _, pod := range podsResp.Pods {
				nd.processNodeAddress(pod.Address)
			}
		}
	}()
}

func (nd *NodeDiscovery) updateStats(node *models.Node, stats *models.PRPCStatsResponse) {
	node.CPUPercent = stats.Stats.CPUPercent
	node.RAMUsed = stats.Stats.RAMUsed
	node.RAMTotal = stats.Stats.RAMTotal
	node.StorageCapacity = stats.FileSize
	node.StorageUsed = stats.Metadata.TotalBytes

	node.UptimeSeconds = stats.Stats.Uptime
	node.PacketsReceived = stats.Stats.PacketsReceived
	node.PacketsSent = stats.Stats.PacketsSent

	if node.UptimeSeconds > 0 {
		knownDuration := time.Since(node.FirstSeen).Seconds()
		if knownDuration > 0 {
			ratio := float64(node.UptimeSeconds) / knownDuration
			if ratio > 1 {
				ratio = 1
			}
			node.UptimeScore = ratio * 100
		} else {
			node.UptimeScore = 100
		}
	} else {
		node.UptimeScore = 0
	}
}

// GetNodes returns all known nodes
func (nd *NodeDiscovery) GetNodes() []*models.Node {
	nd.nodesMutex.RLock()
	defer nd.nodesMutex.RUnlock()

	nodes := make([]*models.Node, 0, len(nd.knownNodes))
	for _, n := range nd.knownNodes {
		nodes = append(nodes, n)
	}
	return nodes
}
