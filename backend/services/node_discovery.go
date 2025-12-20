package services

import (
	"log"
	"net"
	"strconv"
	"sync"
	"time"
	"strings"

	"xand/config"
	"xand/models"
	"xand/utils"
)

// type NodeDiscovery struct {
// 	cfg  *config.Config
// 	prpc *PRPCClient
// 	geo  *utils.GeoResolver

// 	knownNodes map[string]*models.Node // Key: IP (or IP:Port if multiple nodes per IP possible? ID is best)
// 	nodesMutex sync.RWMutex

// 	stopChan chan struct{}
// }

// func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver) *NodeDiscovery {
// 	return &NodeDiscovery{
// 		cfg:  cfg,
// 		prpc: prpc,
// 		geo:  geo,

// 		knownNodes: make(map[string]*models.Node),
// 		stopChan:   make(chan struct{}),
// 	}
// }



type NodeDiscovery struct {
	cfg     *config.Config
	prpc    *PRPCClient
	geo     *utils.GeoResolver
	credits *CreditsService // ADD THIS

	knownNodes map[string]*models.Node
	nodesMutex sync.RWMutex
	stopChan   chan struct{}
}

// Update NewNodeDiscovery
func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver, credits *CreditsService) *NodeDiscovery {
	return &NodeDiscovery{
		cfg:        cfg,
		prpc:       prpc,
		geo:        geo,
		credits:    credits, // ADD THIS
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
				// Extract host from gossip address
				host, _, err := net.SplitHostPort(pod.Address)
				if err != nil {
					host = pod.Address
				}

				var rpcAddress string
				if pod.RpcPort > 0 {
					rpcAddress = net.JoinHostPort(host, strconv.Itoa(pod.RpcPort))
				} else {
					rpcAddress = pod.Address
				}

				// Update existing nodes with pod data
				nd.nodesMutex.Lock()
				if existingNode, exists := nd.knownNodes[rpcAddress]; exists {
					nd.updateNodeFromPod(existingNode, &pod)
					// ADD THIS: Migrate to pubkey-based ID if we have it now
					if pod.Pubkey != "" && existingNode.ID != pod.Pubkey {
						nd.updateNodeID(existingNode, pod.Pubkey)
					}
				}
				nd.nodesMutex.Unlock()

				nd.processNodeAddress(rpcAddress)
			}
		}(node)
	}
}

// collectStats queries all nodes for their stats
func (nd *NodeDiscovery) collectStats() {
	nodes := nd.GetNodes()
	for _, node := range nodes {
		go func(n *models.Node) {
			statsResp, err := nd.prpc.GetStats(n.Address)
			if err == nil {
				nd.nodesMutex.Lock()
				if storedNode, exists := nd.knownNodes[n.ID]; exists {
					nd.updateStats(storedNode, statsResp)
					storedNode.LastSeen = time.Now()
					// ADD THIS: Enrich with credits
					nd.enrichNodeWithCredits(storedNode)
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
				
				versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
				storedNode.VersionStatus = versionStatus
				storedNode.IsUpgradeNeeded = needsUpgrade
				storedNode.UpgradeSeverity = severity
				storedNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)
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
	// First, verify connectivity and get basic info
	verResp, err := nd.prpc.GetVersion(address)
	if err != nil {
		return
	}

	// Try to get pubkey from pods list
	var pubkey string
	podsResp, err := nd.prpc.GetPods(address)
	if err == nil && len(podsResp.Pods) > 0 {
		// Find this node in its own pods list by matching address
		host, _, _ := net.SplitHostPort(address)
		for _, pod := range podsResp.Pods {
			podHost, _, _ := net.SplitHostPort(pod.Address)
			if podHost == host && pod.Pubkey != "" {
				pubkey = pod.Pubkey
				break
			}
		}
	}

	// Use pubkey as ID if available, otherwise fall back to address
	// This prevents duplicates when IP changes
	id := address
	if pubkey != "" {
		id = pubkey
	}

	nd.nodesMutex.RLock()
	_, exists := nd.knownNodes[id]
	nd.nodesMutex.RUnlock()

	if exists {
		return
	}

	// Create Node
	host, portStr, _ := net.SplitHostPort(address)
	port, _ := strconv.Atoi(portStr)

	newNode := &models.Node{
		ID:        id,       // Now uses pubkey if available
		Address:   address,
		IP:        host,
		Port:      port,
		Pubkey:    pubkey,   // Store pubkey separately
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

	log.Printf("Discovered new node: %s (%s, %s)", address, country, verResp.Version)

	// Recursive Discovery - get pods and extract additional info
	go func() {
		podsResp, err := nd.prpc.GetPods(address)
		if err == nil {
			for _, pod := range podsResp.Pods {
				// Extract host and construct RPC address
				host, _, err := net.SplitHostPort(pod.Address)
				if err != nil {
					host = pod.Address
				}

				var rpcAddress string
				if pod.RpcPort > 0 {
					rpcAddress = net.JoinHostPort(host, strconv.Itoa(pod.RpcPort))
				} else {
					rpcAddress = pod.Address
				}

				// Check if this pod is our current node and update with pod data
				nd.nodesMutex.Lock()
				if existingNode, exists := nd.knownNodes[rpcAddress]; exists {
					nd.updateNodeFromPod(existingNode, &pod)
				}
				nd.nodesMutex.Unlock()

				// Process as new node if not known
				nd.processNodeAddress(rpcAddress)
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


func (nd *NodeDiscovery) updateNodeFromPod(node *models.Node, pod *models.Pod) {
	node.Pubkey = pod.Pubkey
	node.IsPublic = pod.IsPublic
	node.Version = pod.Version
	node.StorageCapacity = pod.StorageCommitted
	node.StorageUsed = pod.StorageUsed
	node.StorageUsagePercent = pod.StorageUsagePercent
	node.UptimeSeconds = pod.Uptime
	
	// Update LastSeen if we have timestamp
	if pod.LastSeenTimestamp > 0 {
		node.LastSeen = time.Unix(pod.LastSeenTimestamp, 0)
	}
	
	// Calculate uptime score from the uptime field
	if pod.Uptime > 0 {
		knownDuration := time.Since(node.FirstSeen).Seconds()
		if knownDuration > 0 {
			ratio := float64(pod.Uptime) / knownDuration
			if ratio > 1 {
				ratio = 1
			}
			node.UptimeScore = ratio * 100
		} else {
			node.UptimeScore = 100
		}
	}
	
	// ADD THIS: Update version status when version changes
	if pod.Version != "" {
		versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(pod.Version, nil)
		node.VersionStatus = versionStatus
		node.IsUpgradeNeeded = needsUpgrade
		node.UpgradeSeverity = severity
		node.UpgradeMessage = utils.GetUpgradeMessage(pod.Version, nil)
	}
	
	// ADD THIS: If we now have a pubkey and node ID is still address-based, migrate
	if pod.Pubkey != "" && node.ID != pod.Pubkey && !strings.Contains(node.ID, ":") == false {
		// Node ID is currently an address (contains ":"), but we have pubkey now
		// This will be handled by updateNodeID in the caller
		node.Pubkey = pod.Pubkey
	}
}



// Update node ID to pubkey if we just learned it
func (nd *NodeDiscovery) updateNodeID(node *models.Node, pubkey string) {
	if pubkey == "" || node.ID == pubkey {
		return // Already using pubkey or no pubkey available
	}

	// If node was tracked by address, migrate to pubkey
	nd.nodesMutex.Lock()
	defer nd.nodesMutex.Unlock()

	if node.ID != pubkey && node.Pubkey == "" {
		// Remove old entry
		delete(nd.knownNodes, node.ID)
		// Update ID
		node.ID = pubkey
		node.Pubkey = pubkey
		// Re-add with new ID
		nd.knownNodes[pubkey] = node
		log.Printf("Migrated node from address %s to pubkey %s", node.Address, pubkey)
	}
}



func (nd *NodeDiscovery) enrichNodeWithCredits(node *models.Node) {
	if nd.credits == nil || node.Pubkey == "" {
		return
	}

	credits, exists := nd.credits.GetCredits(node.Pubkey)
	if exists {
		node.Credits = credits.Credits
		node.CreditsRank = credits.Rank
		node.CreditsChange = credits.CreditsChange
	}
}