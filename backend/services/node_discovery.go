// package services

// import (
// 	"log"
// 	"net"
// 	"strconv"
// 	"sync"
// 	"time"
// 	"strings"

// 	"xand/config"
// 	"xand/models"
// 	"xand/utils"
// )

// // type NodeDiscovery struct {
// // 	cfg  *config.Config
// // 	prpc *PRPCClient
// // 	geo  *utils.GeoResolver

// // 	knownNodes map[string]*models.Node // Key: IP (or IP:Port if multiple nodes per IP possible? ID is best)
// // 	nodesMutex sync.RWMutex

// // 	stopChan chan struct{}
// // }

// // func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver) *NodeDiscovery {
// // 	return &NodeDiscovery{
// // 		cfg:  cfg,
// // 		prpc: prpc,
// // 		geo:  geo,

// // 		knownNodes: make(map[string]*models.Node),
// // 		stopChan:   make(chan struct{}),
// // 	}
// // }



// type NodeDiscovery struct {
// 	cfg     *config.Config
// 	prpc    *PRPCClient
// 	geo     *utils.GeoResolver
// 	credits *CreditsService // ADD THIS

// 	knownNodes map[string]*models.Node
// 	nodesMutex sync.RWMutex
// 	stopChan   chan struct{}
// }

// // Update NewNodeDiscovery
// func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver, credits *CreditsService) *NodeDiscovery {
// 	return &NodeDiscovery{
// 		cfg:        cfg,
// 		prpc:       prpc,
// 		geo:        geo,
// 		credits:    credits, // ADD THIS
// 		knownNodes: make(map[string]*models.Node),
// 		stopChan:   make(chan struct{}),
// 	}
// }

// // Start begins the background polling routines and bootstrapping
// func (nd *NodeDiscovery) Start() {
// 	// 1. Bootstrap immediately
// 	go nd.Bootstrap()

// 	// 2. Start Loops
// 	go nd.runDiscoveryLoop()
// 	go nd.runStatsLoop()
// 	go nd.runHealthLoop()
// }

// func (nd *NodeDiscovery) Stop() {
// 	close(nd.stopChan)
// }

// func (nd *NodeDiscovery) runDiscoveryLoop() {
// 	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.DiscoveryInterval) * time.Second)
// 	defer ticker.Stop()
// 	for {
// 		select {
// 		case <-ticker.C:
// 			nd.discoverPeers()
// 		case <-nd.stopChan:
// 			return
// 		}
// 	}
// }

// func (nd *NodeDiscovery) runStatsLoop() {
// 	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.StatsInterval) * time.Second)
// 	defer ticker.Stop()
// 	for {
// 		select {
// 		case <-ticker.C:
// 			nd.collectStats()
// 		case <-nd.stopChan:
// 			return
// 		}
// 	}
// }

// func (nd *NodeDiscovery) runHealthLoop() {
// 	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.HealthCheckInterval) * time.Second)
// 	defer ticker.Stop()
// 	for {
// 		select {
// 		case <-ticker.C:
// 			nd.healthCheck()
// 		case <-nd.stopChan:
// 			return
// 		}
// 	}
// }

// // Bootstrap loads initial nodes from config and starts discovery
// func (nd *NodeDiscovery) Bootstrap() {
// 	log.Println("Starting Bootstrap process...")
	
// 	var wg sync.WaitGroup
// 	successCount := 0
	
// 	for _, seed := range nd.cfg.Server.SeedNodes {
// 		wg.Add(1)
// 		go func(seedAddr string) {
// 			defer wg.Done()
			
// 			log.Printf("Bootstrapping from seed: %s", seedAddr)
			
// 			// Try to connect with timeout
// 			done := make(chan bool, 1)
// 			go func() {
// 				nd.processNodeAddress(seedAddr)
// 				done <- true
// 			}()
			
// 			select {
// 			case <-done:
// 				successCount++
// 				log.Printf("Successfully bootstrapped from %s", seedAddr)
// 			case <-time.After(10 * time.Second):
// 				log.Printf("Bootstrap timeout for seed %s", seedAddr)
// 			}
// 		}(seed)
// 	}
	
// 	wg.Wait()
// 	log.Printf("Bootstrap complete: %d/%d seeds successful", successCount, len(nd.cfg.Server.SeedNodes))
	
// 	// Give initial discovery some time to propagate
// 	time.Sleep(2 * time.Second)
	
// 	// Run initial collection
// 	go nd.discoverPeers()
// 	go nd.healthCheck()
// 	go nd.collectStats()
// }

// // discoverPeers iterates known nodes and asks for their peers
// func (nd *NodeDiscovery) discoverPeers() {
// 	nodes := nd.GetNodes()
	
// 	for _, node := range nodes {
// 		if !node.IsOnline {
// 			continue
// 		}
		
// 		go func(n *models.Node) {
// 			podsResp, err := nd.prpc.GetPods(n.Address)
// 			if err != nil {
// 				return
// 			}
			
// 			// First, try to update THIS node's pubkey if missing
// 			if n.Pubkey == "" {
// 				// Extract IP only
// 				host, _, _ := net.SplitHostPort(n.Address)
				
// 				for _, pod := range podsResp.Pods {
// 					// Extract IP from pod
// 					podHost, _, _ := net.SplitHostPort(pod.Address)
					
// 					// MATCH BY IP ONLY
// 					if podHost == host && pod.Pubkey != "" {
// 						nd.nodesMutex.Lock()
// 						if existingNode, exists := nd.knownNodes[n.ID]; exists {
// 							existingNode.Pubkey = pod.Pubkey
// 							nd.updateNodeFromPod(existingNode, &pod)
// 							nd.enrichNodeWithCredits(existingNode)
							
// 							// Migrate to pubkey
// 							if existingNode.ID != pod.Pubkey {
// 								delete(nd.knownNodes, n.ID)
// 								existingNode.ID = pod.Pubkey
// 								nd.knownNodes[pod.Pubkey] = existingNode
// 								log.Printf("✓ Peer discovery migrated %s → %s", n.Address, pod.Pubkey)
// 							}
// 						}
// 						nd.nodesMutex.Unlock()
// 						break
// 					}
// 				}
// 			}
			
// 			// Process peer nodes using rpc_port
// 			for _, pod := range podsResp.Pods {
// 				podHost, _, err := net.SplitHostPort(pod.Address)
// 				if err != nil {
// 					podHost = pod.Address
// 				}

// 				var rpcAddress string
// 				if pod.RpcPort > 0 {
// 					rpcAddress = net.JoinHostPort(podHost, strconv.Itoa(pod.RpcPort))
// 				} else {
// 					rpcAddress = net.JoinHostPort(podHost, "6000")
// 				}

// 				nd.processNodeAddress(rpcAddress)
// 			}
// 		}(node)
// 	}
// }

// // collectStats queries all nodes for their stats
// // ============================================
// // FILE: backend/services/node_discovery.go
// // REPLACE the collectStats method
// // ============================================

// func (nd *NodeDiscovery) collectStats() {
// 	nodes := nd.GetNodes()
	
// 	successCount := 0
// 	failureCount := 0
	
// 	var wg sync.WaitGroup
// 	var counterMutex sync.Mutex
	
// 	for _, node := range nodes {
// 		wg.Add(1)
// 		go func(nodeID, nodeAddress string) {
// 			defer wg.Done()
			
// 			// Try to get stats
// 			statsResp, err := nd.prpc.GetStats(nodeAddress)
// 			if err != nil {
// 				counterMutex.Lock()
// 				failureCount++
// 				counterMutex.Unlock()
// 				return
// 			}
			
// 			// Update node with stats using safe method
// 			updated := nd.safeUpdateNode(nodeID, func(n *models.Node) {
// 				nd.updateStats(n, statsResp)
// 				n.LastSeen = time.Now()
// 				n.IsOnline = true
				
// 				// Calculate scores immediately
// 				utils.CalculateScore(n)
// 				utils.DetermineStatus(n)
// 			})
			
// 			if updated {
// 				// Enrich with credits (outside of lock)
// 				if node, exists := nd.safeGetNode(nodeID); exists {
// 					nd.enrichNodeWithCredits(node)
// 				}
				
// 				counterMutex.Lock()
// 				successCount++
// 				counterMutex.Unlock()
// 			}
			
// 			// Try to get pubkey if missing (non-blocking)
// 			if node, exists := nd.safeGetNode(nodeID); exists && node.Pubkey == "" {
// 				go nd.forcePubkeyLookup(node)
// 			}
// 		}(node.ID, node.Address)
// 	}
	
// 	wg.Wait()
// 	log.Printf("Stats collection complete: %d successful, %d failed", successCount, failureCount)
// }

// // ============================================
// // REPLACE the healthCheck method
// // ============================================

// func (nd *NodeDiscovery) healthCheck() {
// 	nodes := nd.GetNodes()
	
// 	successCount := 0
// 	failureCount := 0
	
// 	var wg sync.WaitGroup
// 	var counterMutex sync.Mutex

// 	for _, node := range nodes {
// 		wg.Add(1)
// 		go func(nodeID, nodeAddress string) {
// 			defer wg.Done()
			
// 			start := time.Now()
// 			verResp, err := nd.prpc.GetVersion(nodeAddress)
// 			latency := time.Since(start).Milliseconds()

// 			if err == nil {
// 				// Update node with version info using safe method
// 				nd.safeUpdateNode(nodeID, func(n *models.Node) {
// 					n.ResponseTime = latency
// 					updateCallHistory(n, true)
// 					n.TotalCalls++
// 					n.SuccessCalls++
// 					n.IsOnline = true
// 					n.LastSeen = time.Now()
// 					n.Version = verResp.Version
					
// 					// Update version status
// 					versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
// 					n.VersionStatus = versionStatus
// 					n.IsUpgradeNeeded = needsUpgrade
// 					n.UpgradeSeverity = severity
// 					n.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)
					
// 					// Update status
// 					utils.DetermineStatus(n)
// 					utils.CalculateScore(n)
// 				})
				
// 				counterMutex.Lock()
// 				successCount++
// 				counterMutex.Unlock()
// 			} else {
// 				// Handle offline node
// 				shouldRemove := nd.safeUpdateNode(nodeID, func(n *models.Node) {
// 					n.ResponseTime = latency
// 					updateCallHistory(n, false)
// 					n.TotalCalls++
// 					n.IsOnline = false
					
// 					utils.DetermineStatus(n)
// 					utils.CalculateScore(n)
// 				})
				
// 				// Check if node is stale
// 				if node, exists := nd.safeGetNode(nodeID); exists {
// 					if time.Since(node.LastSeen) > time.Duration(nd.cfg.Polling.StaleThreshold)*time.Minute {
// 						nd.nodesMutex.Lock()
// 						delete(nd.knownNodes, nodeID)
// 						nd.nodesMutex.Unlock()
// 						log.Printf("Removed stale node: %s (last seen %v ago)", 
// 							nodeID, time.Since(node.LastSeen))
// 					}
// 				}
				
// 				counterMutex.Lock()
// 				if shouldRemove {
// 					failureCount++
// 				}
// 				counterMutex.Unlock()
// 			}
// 		}(node.ID, node.Address)
// 	}
	
// 	wg.Wait()
// 	log.Printf("Health check complete: %d online, %d offline", successCount, failureCount)
// }

// // ============================================
// // ADD this helper method for call history
// // ============================================

// func updateCallHistory(n *models.Node, success bool) {
// 	if n.CallHistory == nil {
// 		n.CallHistory = make([]bool, 0, 10)
// 	}
// 	// Append
// 	if len(n.CallHistory) >= 10 {
// 		n.CallHistory = n.CallHistory[1:] // shift
// 	}
// 	n.CallHistory = append(n.CallHistory, success)
// }
// // processNodeAddress handles a potentially new node address
// func (nd *NodeDiscovery) processNodeAddress(address string) {
// 	// IMPORTANT: Check if we already know this ADDRESS first
// 	nd.nodesMutex.RLock()
// 	for _, node := range nd.knownNodes {
// 		if node.Address == address {
// 			// We already know this node by address
// 			nd.nodesMutex.RUnlock()
// 			return
// 		}
// 	}
// 	nd.nodesMutex.RUnlock()

// 	// Verify connectivity first
// 	verResp, err := nd.prpc.GetVersion(address)
// 	if err != nil {
// 		return
// 	}

// 	// Create Node with address as temporary ID
// 	host, portStr, _ := net.SplitHostPort(address)
// 	port, _ := strconv.Atoi(portStr)

// 	newNode := &models.Node{
// 		ID:        address, // Start with address as ID
// 		Address:   address,
// 		IP:        host,
// 		Port:      port,
// 		Version:   verResp.Version,
// 		IsOnline:  true,
// 		FirstSeen: time.Now(),
// 		LastSeen:  time.Now(),
// 		Status:    "online",
// 		UptimeScore: 100,
// 		PerformanceScore: 100,
// 	}

// 	// Check version status
// 	versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
// 	newNode.VersionStatus = versionStatus
// 	newNode.IsUpgradeNeeded = needsUpgrade
// 	newNode.UpgradeSeverity = severity
// 	newNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)

// 	// Initial Stats Collection (synchronous for immediate data)
// 	statsResp, err := nd.prpc.GetStats(address)
// 	if err == nil {
// 		nd.updateStats(newNode, statsResp)
// 	} else {
// 		log.Printf("Warning: Failed to get initial stats from %s: %v", address, err)
// 	}

// 	// GeoIP
// 	country, city, lat, lon := nd.geo.Lookup(host)
// 	newNode.Country = country
// 	newNode.City = city
// 	newNode.Lat = lat
// 	newNode.Lon = lon

// 	// Store with address as ID initially
// 	nd.nodesMutex.Lock()
// 	nd.knownNodes[address] = newNode
// 	nd.nodesMutex.Unlock()

// 	log.Printf("Discovered new node: %s (%s, %s)", address, country, verResp.Version)

// 	// Async: Get pubkey and discover peers
// 	go nd.enrichNodeWithPubkeyAndPeers(newNode, address)
// }

// func (nd *NodeDiscovery) enrichNodeWithPubkeyAndPeers(node *models.Node, address string) {
// 	// Get pods list
// 	podsResp, err := nd.prpc.GetPods(address)
// 	if err != nil {
// 		log.Printf("Failed to get pods from %s: %v", address, err)
// 		return
// 	}

// 	// Extract ONLY the IP from the RPC address (ignore port)
// 	host, _, err := net.SplitHostPort(address)
// 	if err != nil {
// 		host = address // Fallback if no port
// 	}
	
// 	log.Printf("DEBUG: Trying to match pubkey for %s (IP: %s) from %d pods", 
// 		address, host, len(podsResp.Pods))
	
// 	// CRITICAL FIX: Match by IP only, ignore all ports
// 	var matchedPod *models.Pod
// 	for i := range podsResp.Pods {
// 		pod := &podsResp.Pods[i]
		
// 		// Extract IP from pod's gossip address (which has random ports)
// 		podHost, _, err := net.SplitHostPort(pod.Address)
// 		if err != nil {
// 			podHost = pod.Address // Fallback if no port
// 		}
		
// 		// MATCH BY IP ONLY
// 		if podHost == host && pod.Pubkey != "" {
// 			matchedPod = pod
// 			log.Printf("DEBUG: ✓ Found pubkey match for %s: %s", address, pod.Pubkey)
// 			break
// 		}
// 	}
	
// 	// If no match found, log all available IPs for debugging
// 	if matchedPod == nil {
// 		log.Printf("DEBUG: No pubkey match found for IP %s. Available pod IPs:", host)
// 		seen := make(map[string]bool)
// 		for _, pod := range podsResp.Pods {
// 			podHost, _, _ := net.SplitHostPort(pod.Address)
// 			if !seen[podHost] && pod.Pubkey != "" {
// 				//log.Printf("DEBUG:   - %s (pubkey: %s)", podHost, pod.Pubkey)

// 				seen[podHost] = true
// 			}
// 		}
// 		log.Printf("Warning: Could not find pubkey for node %s in pods list", address)
// 	}
	
// 	// Update node with pubkey if found
// 	if matchedPod != nil {
// 		// Use safe update to avoid race condition
// 		updated := nd.safeUpdateNode(address, func(n *models.Node) {
// 			n.Pubkey = matchedPod.Pubkey
// 			nd.updateNodeFromPod(n, matchedPod)
// 		})
		
// 		if updated && matchedPod.Pubkey != address {
// 			// Migrate to pubkey-based ID
// 			if nd.safeMigrateNodeID(address, matchedPod.Pubkey) {
// 				log.Printf("✓ Migrated node %s → %s", address, matchedPod.Pubkey)
				
// 				// Enrich with credits after migration
// 				if node, exists := nd.safeGetNode(matchedPod.Pubkey); exists {
// 					nd.enrichNodeWithCredits(node)
// 				}
// 			}
// 		} else if updated {
// 			// Couldn't migrate, but still enrich
// 			if node, exists := nd.safeGetNode(address); exists {
// 				nd.enrichNodeWithCredits(node)
// 			}
// 		}
// 	}
	
// 	// Process peer nodes - use rpc_port from pods list
// 	processedPeers := make(map[string]bool)
// 	for _, pod := range podsResp.Pods {
// 		// Extract IP from gossip address
// 		podHost, _, err := net.SplitHostPort(pod.Address)
// 		if err != nil {
// 			podHost = pod.Address
// 		}

// 		// Build RPC address using the rpc_port field
// 		var rpcAddress string
// 		if pod.RpcPort > 0 {
// 			rpcAddress = net.JoinHostPort(podHost, strconv.Itoa(pod.RpcPort))
// 		} else {
// 			// Fallback to default RPC port if not specified
// 			rpcAddress = net.JoinHostPort(podHost, "6000")
// 		}

// 		// Skip if it's the same as current node
// 		if rpcAddress == address {
// 			continue
// 		}
		
// 		// Skip if already processed
// 		if processedPeers[rpcAddress] {
// 			continue
// 		}
// 		processedPeers[rpcAddress] = true

// 		// Process peer as new node
// 		go nd.processNodeAddress(rpcAddress)
// 	}
// }
// // ============================================
// // IMPROVED: forcePubkeyLookup with better matching
// // ============================================

// // func (nd *NodeDiscovery) forcePubkeyLookup(node *models.Node) {
// // 	if node.Pubkey != "" {
// // 		return // Already has pubkey
// // 	}

// // 	// Try to get pubkey from pods
// // 	podsResp, err := nd.prpc.GetPods(node.Address)
// // 	if err != nil {
// // 		return
// // 	}

// // 	host, _, _ := net.SplitHostPort(node.Address)
	
// // 	// Try multiple matching strategies
// // 	var matchedPod *models.Pod
	
// // 	// Strategy 1: Exact host match
// // 	for i := range podsResp.Pods {
// // 		pod := &podsResp.Pods[i]
// // 		podHost, _, _ := net.SplitHostPort(pod.Address)
// // 		if podHost == host && pod.Pubkey != "" {
// // 			matchedPod = pod
// // 			break
// // 		}
// // 	}
	
// // 	// Strategy 2: Match by RPC port
// // 	if matchedPod == nil {
// // 		_, portStr, _ := net.SplitHostPort(node.Address)
// // 		port, _ := strconv.Atoi(portStr)
		
// // 		for i := range podsResp.Pods {
// // 			pod := &podsResp.Pods[i]
// // 			if pod.RpcPort == port && pod.Pubkey != "" {
// // 				podHost, _, _ := net.SplitHostPort(pod.Address)
// // 				if podHost == host {
// // 					matchedPod = pod
// // 					break
// // 				}
// // 			}
// // 		}
// // 	}
	
// // 	if matchedPod != nil {
// // 		nd.nodesMutex.Lock()
// // 		node.Pubkey = matchedPod.Pubkey
// // 		nd.updateNodeFromPod(node, matchedPod)
		
// // 		// Migrate to pubkey-based ID
// // 		if node.ID != matchedPod.Pubkey {
// // 			delete(nd.knownNodes, node.ID)
// // 			node.ID = matchedPod.Pubkey
// // 			nd.knownNodes[matchedPod.Pubkey] = node
// // 			log.Printf("✓ Force-migrated node %s → %s", node.Address, matchedPod.Pubkey)
// // 		}
// // 		nd.nodesMutex.Unlock()
// // 	}
// // }



// func (nd *NodeDiscovery) updateStats(node *models.Node, stats *models.StatsResponse) {
// 	// System stats - now flat, not nested
// 	node.CPUPercent = stats.CPUPercent
// 	node.RAMUsed = stats.RAMUsed
// 	node.RAMTotal = stats.RAMTotal
// 	node.UptimeSeconds = stats.Uptime
// 	node.PacketsReceived = stats.PacketsReceived
// 	node.PacketsSent = stats.PacketsSent

// 	// Storage stats - now flat, not nested
// 	node.StorageCapacity = stats.FileSize
// 	node.StorageUsed = stats.TotalBytes // Note: total_bytes is actually used bytes
	
// 	// Calculate uptime score
// 	if stats.Uptime > 0 {
// 		knownDuration := time.Since(node.FirstSeen).Seconds()
// 		if knownDuration > 0 {
// 			ratio := float64(stats.Uptime) / knownDuration
// 			if ratio > 1 {
// 				ratio = 1
// 			}
// 			node.UptimeScore = ratio * 100
// 		} else {
// 			node.UptimeScore = 100
// 		}
// 	}
// }

// // GetNodes returns all known nodes
// func (nd *NodeDiscovery) GetNodes() []*models.Node {
// 	nd.nodesMutex.RLock()
// 	defer nd.nodesMutex.RUnlock()

// 	nodes := make([]*models.Node, 0, len(nd.knownNodes))
// 	for _, n := range nd.knownNodes {
// 		nodes = append(nodes, n)
// 	}
// 	return nodes
// }


// func (nd *NodeDiscovery) updateNodeFromPod(node *models.Node, pod *models.Pod) {
// 	node.Pubkey = pod.Pubkey
// 	node.IsPublic = pod.IsPublic
// 	node.Version = pod.Version
// 	node.StorageCapacity = pod.StorageCommitted
// 	node.StorageUsed = pod.StorageUsed
// 	node.StorageUsagePercent = pod.StorageUsagePercent
// 	node.UptimeSeconds = pod.Uptime
	
// 	// Update LastSeen if we have timestamp
// 	if pod.LastSeenTimestamp > 0 {
// 		node.LastSeen = time.Unix(pod.LastSeenTimestamp, 0)
// 	}
	
// 	// Calculate uptime score from the uptime field
// 	if pod.Uptime > 0 {
// 		knownDuration := time.Since(node.FirstSeen).Seconds()
// 		if knownDuration > 0 {
// 			ratio := float64(pod.Uptime) / knownDuration
// 			if ratio > 1 {
// 				ratio = 1
// 			}
// 			node.UptimeScore = ratio * 100
// 		} else {
// 			node.UptimeScore = 100
// 		}
// 	}
	
// 	// ADD THIS: Update version status when version changes
// 	if pod.Version != "" {
// 		versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(pod.Version, nil)
// 		node.VersionStatus = versionStatus
// 		node.IsUpgradeNeeded = needsUpgrade
// 		node.UpgradeSeverity = severity
// 		node.UpgradeMessage = utils.GetUpgradeMessage(pod.Version, nil)
// 	}
	
// 	// ADD THIS: If we now have a pubkey and node ID is still address-based, migrate
// 	if pod.Pubkey != "" && node.ID != pod.Pubkey && !strings.Contains(node.ID, ":") == false {
// 		// Node ID is currently an address (contains ":"), but we have pubkey now
// 		// This will be handled by updateNodeID in the caller
// 		node.Pubkey = pod.Pubkey
// 	}
// }



// // Update node ID to pubkey if we just learned it
// // func (nd *NodeDiscovery) updateNodeID(node *models.Node, pubkey string) {
// // 	if pubkey == "" || node.ID == pubkey {
// // 		return // Already using pubkey or no pubkey available
// // 	}

// // 	// If node was tracked by address, migrate to pubkey
// // 	nd.nodesMutex.Lock()
// // 	defer nd.nodesMutex.Unlock()

// // 	if node.ID != pubkey && node.Pubkey == "" {
// // 		// Remove old entry
// // 		delete(nd.knownNodes, node.ID)
// // 		// Update ID
// // 		node.ID = pubkey
// // 		node.Pubkey = pubkey
// // 		// Re-add with new ID
// // 		nd.knownNodes[pubkey] = node
// // 		log.Printf("Migrated node from address %s to pubkey %s", node.Address, pubkey)
// // 	}
// // }



// func (nd *NodeDiscovery) enrichNodeWithCredits(node *models.Node) {
// 	if nd.credits == nil || node.Pubkey == "" {
// 		return
// 	}

// 	credits, exists := nd.credits.GetCredits(node.Pubkey)
// 	if exists {
// 		node.Credits = credits.Credits
// 		node.CreditsRank = credits.Rank
// 		node.CreditsChange = credits.CreditsChange
// 	}
// }





// // ForcePubkeyLookup attempts to get pubkey for nodes that don't have one
// func (nd *NodeDiscovery) forcePubkeyLookup(node *models.Node) {
// 	if node.Pubkey != "" {
// 		return // Already has pubkey
// 	}

// 	// Get node address safely
// 	nodeAddress := node.Address
// 	nodeID := node.ID

// 	// Try to get pubkey from pods
// 	podsResp, err := nd.prpc.GetPods(nodeAddress)
// 	if err != nil {
// 		return
// 	}

// 	// Extract ONLY the IP (ignore port)
// 	host, _, err := net.SplitHostPort(nodeAddress)
// 	if err != nil {
// 		host = nodeAddress
// 	}
	
// 	// Match by IP only
// 	var matchedPod *models.Pod
// 	for i := range podsResp.Pods {
// 		pod := &podsResp.Pods[i]
		
// 		// Extract IP from pod's gossip address
// 		podHost, _, err := net.SplitHostPort(pod.Address)
// 		if err != nil {
// 			podHost = pod.Address
// 		}
		
// 		// MATCH BY IP ONLY
// 		if podHost == host && pod.Pubkey != "" {
// 			matchedPod = pod
// 			break
// 		}
// 	}
	
// 	if matchedPod != nil {
// 		// Update node safely
// 		updated := nd.safeUpdateNode(nodeID, func(n *models.Node) {
// 			n.Pubkey = matchedPod.Pubkey
// 			nd.updateNodeFromPod(n, matchedPod)
// 		})
		
// 		// Migrate to pubkey-based ID if possible
// 		if updated && nodeID != matchedPod.Pubkey {
// 			if nd.safeMigrateNodeID(nodeID, matchedPod.Pubkey) {
// 				log.Printf("✓ Force-migrated node %s → %s", nodeAddress, matchedPod.Pubkey)
// 			}
// 		}
// 	}
// }





// func (nd *NodeDiscovery) safeGetNode(id string) (*models.Node, bool) {
// 	nd.nodesMutex.RLock()
// 	defer nd.nodesMutex.RUnlock()
// 	node, exists := nd.knownNodes[id]
// 	return node, exists
// }

// // safeUpdateNode safely updates a node with a function
// func (nd *NodeDiscovery) safeUpdateNode(id string, updateFn func(*models.Node)) bool {
// 	nd.nodesMutex.Lock()
// 	defer nd.nodesMutex.Unlock()
	
// 	node, exists := nd.knownNodes[id]
// 	if !exists {
// 		return false
// 	}
	
// 	updateFn(node)
// 	return true
// }

// // safeAddNode safely adds a new node
// // func (nd *NodeDiscovery) safeAddNode(node *models.Node) bool {
// // 	nd.nodesMutex.Lock()
// // 	defer nd.nodesMutex.Unlock()
	
// // 	// Check if already exists
// // 	if _, exists := nd.knownNodes[node.ID]; exists {
// // 		return false
// // 	}
	
// // 	nd.knownNodes[node.ID] = node
// // 	return true
// // }

// // safeMigrateNodeID safely migrates a node from old ID to new ID
// func (nd *NodeDiscovery) safeMigrateNodeID(oldID, newID string) bool {
// 	nd.nodesMutex.Lock()
// 	defer nd.nodesMutex.Unlock()
	
// 	node, exists := nd.knownNodes[oldID]
// 	if !exists {
// 		return false
// 	}
	
// 	// Check if new ID already exists
// 	if _, exists := nd.knownNodes[newID]; exists {
// 		// New ID already exists, don't migrate
// 		return false
// 	}
	
// 	delete(nd.knownNodes, oldID)
// 	node.ID = newID
// 	nd.knownNodes[newID] = node
// 	return true
// }




// ============================================
// FILE: backend/services/node_discovery.go
// COMPLETE CLEAN VERSION - REPLACE ENTIRE FILE
// ============================================
package services

import (
	"log"
	"net"
	"sort"
	"strconv"
	"sync"
	"time"

	"xand/config"
	"xand/models"
	"xand/utils"
)

type NodeDiscovery struct {
	cfg     *config.Config
	prpc    *PRPCClient
	geo     *utils.GeoResolver
	credits *CreditsService

	knownNodes map[string]*models.Node // Key is ALWAYS pubkey once discovered
	nodesMutex sync.RWMutex

	// Track IP->nodes for reverse lookup
	ipToNodes map[string][]*models.Node // One IP can have multiple nodes
	ipMutex   sync.RWMutex

	// Track failed addresses to avoid retry spam
	failedAddresses map[string]time.Time // address -> last failure time
	failedMutex     sync.RWMutex

	stopChan    chan struct{}
	rateLimiter chan struct{}
}

func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver, credits *CreditsService) *NodeDiscovery {
	return &NodeDiscovery{
		cfg:             cfg,
		prpc:            prpc,
		geo:             geo,
		credits:         credits,
		knownNodes:      make(map[string]*models.Node),
		ipToNodes:       make(map[string][]*models.Node),
		failedAddresses: make(map[string]time.Time),
		stopChan:        make(chan struct{}),
		rateLimiter:     make(chan struct{}, 50),
	}
}

func (nd *NodeDiscovery) Start() {
	go nd.Bootstrap()
	go nd.runDiscoveryLoop()
	go nd.runStatsLoop()
	go nd.runHealthLoop()
	go nd.runCleanupLoop()
}

func (nd *NodeDiscovery) runCleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.cleanupFailedAddresses()
		case <-nd.stopChan:
			return
		}
	}
}

func (nd *NodeDiscovery) cleanupFailedAddresses() {
	nd.failedMutex.Lock()
	defer nd.failedMutex.Unlock()
	
	cutoff := time.Now().Add(-10 * time.Minute)
	cleaned := 0
	
	for addr, lastFailed := range nd.failedAddresses {
		if lastFailed.Before(cutoff) {
			delete(nd.failedAddresses, addr)
			cleaned++
		}
	}
	
	if cleaned > 0 {
		log.Printf("Cleaned up %d old failed addresses (total: %d)", cleaned, len(nd.failedAddresses))
	}
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

func (nd *NodeDiscovery) Bootstrap() {
	log.Println("Starting Bootstrap...")
	
	var wg sync.WaitGroup
	for _, seed := range nd.cfg.Server.SeedNodes {
		wg.Add(1)
		go func(seedAddr string) {
			defer wg.Done()
			log.Printf("Bootstrapping from seed: %s", seedAddr)
			nd.processNodeAddress(seedAddr)
		}(seed)
		time.Sleep(1 * time.Second) // Stagger starts
	}
	
	// Wait for initial discovery
	wg.Wait()
	log.Println("Bootstrap complete, waiting for peer discovery...")
	
	time.Sleep(5 * time.Second)
	go nd.discoverPeers()
	go nd.healthCheck()
	go nd.collectStats()
}

// ============================================
// FIXED: Synchronous pubkey discovery
// ============================================

func (nd *NodeDiscovery) processNodeAddress(address string) {
	// Check if recently failed (skip for 5 minutes)
	nd.failedMutex.RLock()
	lastFailed, failed := nd.failedAddresses[address]
	nd.failedMutex.RUnlock()
	
	if failed && time.Since(lastFailed) < 5*time.Minute {
		return // Skip recently failed addresses
	}

	// Check if IP already has a node
	host, portStr, _ := net.SplitHostPort(address)
	port, _ := strconv.Atoi(portStr)

	// Check if this exact address already exists
	nd.ipMutex.RLock()
	existingNodes := nd.ipToNodes[host]
	for _, node := range existingNodes {
		if node.Address == address {
			nd.ipMutex.RUnlock()
			return // Already processed
		}
	}
	nd.ipMutex.RUnlock()

	// Rate limit
	nd.rateLimiter <- struct{}{}
	defer func() { <-nd.rateLimiter }()

	// Verify connectivity
	verResp, err := nd.prpc.GetVersion(address)
	if err != nil {
		// Mark as failed (reduce log spam - only log every 10th failure)
		nd.failedMutex.Lock()
		nd.failedAddresses[address] = time.Now()
		failCount := len(nd.failedAddresses)
		nd.failedMutex.Unlock()
		
		if failCount%10 == 0 {
			log.Printf("DEBUG: %d addresses currently unreachable", failCount)
		}
		return
	}

	// Clear from failed list if it was there
	nd.failedMutex.Lock()
	delete(nd.failedAddresses, address)
	nd.failedMutex.Unlock()

	log.Printf("DEBUG: ✓ Connected to %s, version %s", address, verResp.Version)

	// Try to get pubkey IMMEDIATELY by querying a known node's peer list
	pubkey := nd.findPubkeyForIP(host)

	var nodeID string
	if pubkey != "" {
		nodeID = pubkey
		log.Printf("DEBUG: ✓ Found pubkey for %s: %s", address, pubkey)
	} else {
		nodeID = address // Temporary ID
		log.Printf("DEBUG: No pubkey yet for %s, using address as ID", address)
	}

	// Create node
	newNode := &models.Node{
		ID:               nodeID,
		Pubkey:           pubkey,
		Address:          address,
		IP:               host,
		Port:             port,
		Version:          verResp.Version,
		IsOnline:         true,
		FirstSeen:        time.Now(),
		LastSeen:         time.Now(),
		Status:           "online",
		UptimeScore:      100,
		PerformanceScore: 100,
		Addresses: []models.NodeAddress{
			{
				Address:   address,
				IP:        host,
				Port:      port,
				Type:      "rpc",
				LastSeen:  time.Now(),
				IsWorking: true,
			},
		},
	}

	// Version status
	versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
	newNode.VersionStatus = versionStatus
	newNode.IsUpgradeNeeded = needsUpgrade
	newNode.UpgradeSeverity = severity
	newNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)

	// Get stats
	statsResp, err := nd.prpc.GetStats(address)
	if err == nil {
		nd.updateStats(newNode, statsResp)
	}

	// GeoIP
	country, city, lat, lon := nd.geo.Lookup(host)
	newNode.Country = country
	newNode.City = city
	newNode.Lat = lat
	newNode.Lon = lon

	// Store
	nd.nodesMutex.Lock()
	nd.knownNodes[nodeID] = newNode
	nd.nodesMutex.Unlock()

	// Add to IP index
	nd.ipMutex.Lock()
	nd.ipToNodes[host] = append(nd.ipToNodes[host], newNode)
	nd.ipMutex.Unlock()

	// Enrich with credits if we have pubkey
	if pubkey != "" {
		nd.enrichNodeWithCredits(newNode)
	}

	log.Printf("Discovered new node: %s (%s, %s) [pubkey: %s]", 
		address, country, verResp.Version, 
		func() string { if pubkey != "" { return pubkey[:8] + "..." } else { return "pending" } }())

	// Discover peers asynchronously (will help find more pubkeys)
	go nd.discoverPeersFromNode(address)
}

// ============================================
// NEW: Find pubkey by querying existing nodes
// ============================================

func (nd *NodeDiscovery) findPubkeyForIP(targetIP string) string {
	// Get a list of nodes to query
	nd.nodesMutex.RLock()
	nodesToQuery := make([]*models.Node, 0, len(nd.knownNodes))
	for _, node := range nd.knownNodes {
		if node.IsOnline {
			nodesToQuery = append(nodesToQuery, node)
		}
	}
	nd.nodesMutex.RUnlock()

	// Try up to 3 nodes
	for i := 0; i < 3 && i < len(nodesToQuery); i++ {
		node := nodesToQuery[i]
		
		podsResp, err := nd.prpc.GetPods(node.Address)
		if err != nil {
			continue
		}

		// Search for matching IP in pods
		for _, pod := range podsResp.Pods {
			podHost, _, err := net.SplitHostPort(pod.Address)
			if err != nil {
				podHost = pod.Address
			}

			if podHost == targetIP && pod.Pubkey != "" {
				return pod.Pubkey
			}
		}
	}

	return "" // Not found
}

// ============================================
// Discover peers and match them back
// ============================================

func (nd *NodeDiscovery) discoverPeersFromNode(address string) {
	nd.rateLimiter <- struct{}{}
	defer func() { <-nd.rateLimiter }()

	podsResp, err := nd.prpc.GetPods(address)
	if err != nil {
		return
	}

	log.Printf("DEBUG: Got %d pods from %s", len(podsResp.Pods), address)

	// First pass: Update existing nodes with pubkeys
	for _, pod := range podsResp.Pods {
		if pod.Pubkey == "" {
			continue
		}

		podHost, _, err := net.SplitHostPort(pod.Address)
		if err != nil {
			podHost = pod.Address
		}

		nd.matchPodToNode(pod, podHost)
	}

	// Second pass: Discover new peers (limited and prioritized)
	// Prioritize: public nodes, nodes with recent timestamps, nodes with higher uptime
	type scoredPod struct {
		pod   models.Pod
		score int
	}
	
	scoredPods := make([]scoredPod, 0, len(podsResp.Pods))
	for _, pod := range podsResp.Pods {
		score := 0
		if pod.IsPublic {
			score += 10
		}
		if time.Since(time.Unix(pod.LastSeenTimestamp, 0)) < 5*time.Minute {
			score += 5
		}
		if pod.Uptime > 86400 { // > 1 day
			score += 3
		}
		scoredPods = append(scoredPods, scoredPod{pod, score})
	}
	
	// Sort by score descending
	sort.Slice(scoredPods, func(i, j int) bool {
		return scoredPods[i].score > scoredPods[j].score
	})
	
	count := 0
	for _, sp := range scoredPods {
		if count >= 30 {
			break
		}

		pod := sp.pod
		podHost, _, err := net.SplitHostPort(pod.Address)
		if err != nil {
			podHost = pod.Address
		}

		var rpcAddress string
		if pod.RpcPort > 0 {
			rpcAddress = net.JoinHostPort(podHost, strconv.Itoa(pod.RpcPort))
		} else {
			rpcAddress = net.JoinHostPort(podHost, "6000")
		}

		if rpcAddress != address {
			go nd.processNodeAddress(rpcAddress)
			count++
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// ============================================
// Match pod to existing node
// ============================================

func (nd *NodeDiscovery) matchPodToNode(pod models.Pod, podIP string) {
	nd.ipMutex.RLock()
	nodesWithIP := nd.ipToNodes[podIP]
	nd.ipMutex.RUnlock()

	if len(nodesWithIP) == 0 {
		return
	}

	nd.nodesMutex.Lock()
	defer nd.nodesMutex.Unlock()

	for _, node := range nodesWithIP {
		// If node already has a pubkey, skip
		if node.Pubkey != "" {
			continue
		}

		// Upgrade node with pubkey
		oldID := node.ID
		node.ID = pod.Pubkey
		node.Pubkey = pod.Pubkey
		nd.updateNodeFromPod(node, &pod)

		// Move to new key
		nd.knownNodes[pod.Pubkey] = node
		if oldID != pod.Pubkey {
			delete(nd.knownNodes, oldID)
		}

		log.Printf("DEBUG: ✓ UPGRADED node %s → pubkey: %s", node.Address, pod.Pubkey)

		// Enrich with credits
		nd.enrichNodeWithCredits(node)
		
		break // Only upgrade one node per IP
	}
}

// ============================================
// Helper methods
// ============================================

func (nd *NodeDiscovery) discoverPeers() {
	nodes := nd.GetNodes()
	
	onlineNodes := make([]*models.Node, 0)
	for _, node := range nodes {
		if node.IsOnline && node.Status == "online" {
			onlineNodes = append(onlineNodes, node)
		}
	}
	
	if len(onlineNodes) > 30 {
		onlineNodes = onlineNodes[:30]
	}
	
	for _, node := range onlineNodes {
		go nd.discoverPeersFromNode(node.Address)
		time.Sleep(500 * time.Millisecond)
	}
}

func (nd *NodeDiscovery) collectStats() {
	nodes := nd.GetNodes()
	
	for _, node := range nodes {
		nd.rateLimiter <- struct{}{}
		
		go func(n *models.Node) {
			defer func() { <-nd.rateLimiter }()
			
			statsResp, err := nd.prpc.GetStats(n.Address)
			if err != nil {
				return
			}
			
			nd.nodesMutex.Lock()
			if storedNode, exists := nd.knownNodes[n.ID]; exists {
				nd.updateStats(storedNode, statsResp)
				storedNode.LastSeen = time.Now()
				storedNode.IsOnline = true
				utils.CalculateScore(storedNode)
				utils.DetermineStatus(storedNode)
			}
			nd.nodesMutex.Unlock()
			
			if n.Pubkey != "" {
				nd.enrichNodeWithCredits(n)
			}
		}(node)
	}
	
	time.Sleep(2 * time.Second)
}

func (nd *NodeDiscovery) healthCheck() {
	nodes := nd.GetNodes()
	
	for _, node := range nodes {
		nd.rateLimiter <- struct{}{}
		
		go func(n *models.Node) {
			defer func() { <-nd.rateLimiter }()
			
			start := time.Now()
			verResp, err := nd.prpc.GetVersion(n.Address)
			latency := time.Since(start).Milliseconds()

			nd.nodesMutex.Lock()
			defer nd.nodesMutex.Unlock()

			storedNode, exists := nd.knownNodes[n.ID]
			if !exists {
				return
			}

			storedNode.ResponseTime = latency
			updateCallHistory(storedNode, err == nil)
			storedNode.TotalCalls++
			
			if err == nil {
				storedNode.SuccessCalls++
				storedNode.IsOnline = true
				storedNode.LastSeen = time.Now()
				storedNode.Version = verResp.Version
				
				versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
				storedNode.VersionStatus = versionStatus
				storedNode.IsUpgradeNeeded = needsUpgrade
				storedNode.UpgradeSeverity = severity
				storedNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)
			} else {
				storedNode.IsOnline = false
				
				if time.Since(storedNode.LastSeen) > time.Duration(nd.cfg.Polling.StaleThreshold)*time.Minute {
					// Remove from knownNodes
					delete(nd.knownNodes, storedNode.ID)
					
					// Remove from IP index
					nd.ipMutex.Lock()
					nodes := nd.ipToNodes[storedNode.IP]
					for i, n := range nodes {
						if n.ID == storedNode.ID {
							nd.ipToNodes[storedNode.IP] = append(nodes[:i], nodes[i+1:]...)
							break
						}
					}
					nd.ipMutex.Unlock()
				}
			}
			
			utils.DetermineStatus(storedNode)
			utils.CalculateScore(storedNode)
		}(node)
	}
}

func updateCallHistory(n *models.Node, success bool) {
	if n.CallHistory == nil {
		n.CallHistory = make([]bool, 0, 10)
	}
	if len(n.CallHistory) >= 10 {
		n.CallHistory = n.CallHistory[1:]
	}
	n.CallHistory = append(n.CallHistory, success)
}

func (nd *NodeDiscovery) updateStats(node *models.Node, stats *models.StatsResponse) {
	node.CPUPercent = stats.CPUPercent
	node.RAMUsed = stats.RAMUsed
	node.RAMTotal = stats.RAMTotal
	node.UptimeSeconds = stats.Uptime
	node.PacketsReceived = stats.PacketsReceived
	node.PacketsSent = stats.PacketsSent
	node.StorageCapacity = stats.FileSize
	node.StorageUsed = stats.TotalBytes
	
	if stats.Uptime > 0 {
		knownDuration := time.Since(node.FirstSeen).Seconds()
		if knownDuration > 0 {
			ratio := float64(stats.Uptime) / knownDuration
			if ratio > 1 {
				ratio = 1
			}
			node.UptimeScore = ratio * 100
		} else {
			node.UptimeScore = 100
		}
	}
}

func (nd *NodeDiscovery) updateNodeFromPod(node *models.Node, pod *models.Pod) {
	node.Pubkey = pod.Pubkey
	node.IsPublic = pod.IsPublic
	
	if pod.Version != "" {
		node.Version = pod.Version
	}
	
	if pod.StorageCommitted > 0 {
		node.StorageCapacity = pod.StorageCommitted
		node.StorageUsed = pod.StorageUsed
		node.StorageUsagePercent = pod.StorageUsagePercent
	}
	
	if pod.Uptime > 0 {
		node.UptimeSeconds = pod.Uptime
	}
	
	if pod.LastSeenTimestamp > 0 {
		node.LastSeen = time.Unix(pod.LastSeenTimestamp, 0)
	}
	
	if pod.Version != "" {
		versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(pod.Version, nil)
		node.VersionStatus = versionStatus
		node.IsUpgradeNeeded = needsUpgrade
		node.UpgradeSeverity = severity
		node.UpgradeMessage = utils.GetUpgradeMessage(pod.Version, nil)
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

func (nd *NodeDiscovery) GetNodes() []*models.Node {
	nd.nodesMutex.RLock()
	defer nd.nodesMutex.RUnlock()

	nodes := make([]*models.Node, 0, len(nd.knownNodes))
	for _, n := range nd.knownNodes {
		nodes = append(nodes, n)
	}
	return nodes
}