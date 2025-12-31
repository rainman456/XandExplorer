package services

import (
	"log"
	"time"

	"xand/models"
	"xand/utils"
	//"xand/utils"
)

type DataAggregator struct {
	discovery *NodeDiscovery
}

func NewDataAggregator(discovery *NodeDiscovery) *DataAggregator {
	return &DataAggregator{
		discovery: discovery,
	}
}


// func (da *DataAggregator) Aggregate() models.NetworkStats {
// 	// CRITICAL FIX: Lock the discovery service during aggregation
// 	// to prevent race conditions with health checks
	
// 	allNodes := da.discovery.GetAllNodes()

// 	// DEBUG logging
// 	log.Printf("DEBUG Aggregate: GetAllNodes() returned %d nodes", len(allNodes))
	
// 	withPubkey := 0
// 	for _, node := range allNodes {
// 		if node.Pubkey != "" && node.Pubkey != "unknown" {
// 			withPubkey++
// 		}
// 	}
// 	log.Printf("DEBUG Aggregate: %d nodes have pubkeys", withPubkey)

// 	// Count unique pubkeys
// 	uniquePubkeys := make(map[string]bool)
// 	var totalCommittedStorage float64

// 	aggr := models.NetworkStats{
// 		TotalNodes:  len(allNodes), // All IP addresses
// 		LastUpdated: time.Now(),
// 	}

// 	if len(allNodes) == 0 {
// 		log.Println("No nodes available for aggregation")
// 		return aggr
// 	}

// 	var sumUptime float64
// 	var sumPerformance float64
// 	var countPerformance int
// 	var totalCredits int64
// 	var nodesWithCredits int

// 	// CRITICAL FIX: Don't call DetermineStatus here - it's already been called
// 	// by health checks. Just aggregate the current state.
// 	for _, node := range allNodes {
// 		// Track unique pubkeys
// 		if node.Pubkey != "" && node.Pubkey != "unknown" {
// 			if !uniquePubkeys[node.Pubkey] {
// 				uniquePubkeys[node.Pubkey] = true
// 				// Only count storage once per unique pubkey
// 				totalCommittedStorage += float64(node.StorageCapacity)
// 			}
// 		}

// 		// Count by status (using existing status, don't recalculate)
// 		switch node.Status {
// 		case "online":
// 			aggr.OnlineNodes++
// 		case "warning":
// 			aggr.WarningNodes++
// 		case "offline":
// 			aggr.OfflineNodes++
// 		}

// 		// Aggregate storage from ALL nodes (in BYTES)
// 		aggr.TotalStorage += float64(node.StorageCapacity)
// 		aggr.UsedStorage += float64(node.StorageUsed)
// 		aggr.TotalStake += int64(node.TotalStake)

// 		// Aggregate metrics
// 		sumUptime += node.UptimeScore
// 		if node.PerformanceScore > 0 {
// 			sumPerformance += node.PerformanceScore
// 			countPerformance++
// 		}
		
// 		// Track credits
// 		if node.Credits > 0 {
// 			totalCredits += node.Credits
// 			nodesWithCredits++
// 		}
// 	}

// 	// CRITICAL FIX: If uniquePubkeys is 0, fallback to knownNodes
// 	if len(uniquePubkeys) == 0 {
// 		log.Printf("WARNING: No unique pubkeys found in allNodes, checking knownNodes...")
// 		uniqueNodes := da.discovery.GetNodes()
// 		for _, node := range uniqueNodes {
// 			if node.Pubkey != "" && node.Pubkey != "unknown" {
// 				uniquePubkeys[node.Pubkey] = true
// 				totalCommittedStorage += float64(node.StorageCapacity)
// 			}
// 		}
// 		log.Printf("WARNING: Used knownNodes fallback, found %d pubkeys", len(uniquePubkeys))
// 	}

// 	// Set pod count
// 	aggr.TotalPods = len(uniquePubkeys)

// 	// Calculate average storage per pod
// 	if aggr.TotalPods > 0 {
// 		aggr.AvgStorageCommittedPerPodBytes = totalCommittedStorage / float64(aggr.TotalPods)
// 	} else {
// 		aggr.AvgStorageCommittedPerPodBytes = 0
// 	}

// 	// Calculate averages
// 	if len(allNodes) > 0 {
// 		aggr.AverageUptime = sumUptime / float64(len(allNodes))
// 	}
	
// 	if countPerformance > 0 {
// 		aggr.AveragePerformance = sumPerformance / float64(countPerformance)
// 	}

// 	// Calculate network health
// 	if len(allNodes) > 0 {
// 		onlineRatio := float64(aggr.OnlineNodes) / float64(aggr.TotalNodes)
// 		aggr.NetworkHealth = (onlineRatio * 80) + (aggr.AverageUptime * 0.2)
		
// 		if aggr.NetworkHealth > 100 {
// 			aggr.NetworkHealth = 100
// 		}
// 	}

// 	avgCredits := int64(0)
// 	if nodesWithCredits > 0 {
// 		avgCredits = totalCredits / int64(nodesWithCredits)
// 	}

// 	log.Printf("Aggregated %d nodes (IPs), %d pods (unique pubkeys). Online: %d, Warning: %d, Offline: %d. Health: %.2f%%. Storage: %.0f/%.0f bytes. Avg storage per pod: %.0f bytes. Credits: %d nodes, avg %d", 
// 		aggr.TotalNodes, aggr.TotalPods,
// 		aggr.OnlineNodes, aggr.WarningNodes, aggr.OfflineNodes,
// 		aggr.NetworkHealth, 
// 		aggr.UsedStorage, aggr.TotalStorage,
// 		aggr.AvgStorageCommittedPerPodBytes,
// 		nodesWithCredits, avgCredits)

// 	return aggr
// }

func (da *DataAggregator) Aggregate() models.NetworkStats {
	allNodes := da.discovery.GetAllNodes()

	log.Printf("DEBUG Aggregate: GetAllNodes() returned %d nodes", len(allNodes))

	uniquePubkeys := make(map[string]bool)
	var totalCommittedStoragePerPod float64 // Only count once per unique pubkey

	aggr := models.NetworkStats{
		TotalNodes:  len(allNodes),
		LastUpdated: time.Now(),
	}

	if len(allNodes) == 0 {
		log.Println("No nodes available for aggregation")
		return aggr
	}

	var sumUptime float64
	var sumPerformance float64
	var countPerformance int
	var totalCredits int64
	var nodesWithCredits int

	for _, node := range allNodes {
		// Always refresh status & score using the latest data (LastSeen from pods, call history, etc.)
		utils.DetermineStatus(node)
		utils.CalculateScore(node)

		// Unique pubkey tracking for pod count and per-pod storage average
		if node.Pubkey != "" && node.Pubkey != "unknown" {
			if !uniquePubkeys[node.Pubkey] {
				uniquePubkeys[node.Pubkey] = true
				totalCommittedStoragePerPod += float64(node.StorageCapacity)
			}
		}

		// Status counts (now based on fresh evaluation)
		switch node.Status {
		case "online":
			aggr.OnlineNodes++
		case "warning":
			aggr.WarningNodes++
		case "offline":
			aggr.OfflineNodes++
		}

		// Raw totals across all IP addresses
		aggr.TotalStorage += float64(node.StorageCapacity)
		aggr.UsedStorage += float64(node.StorageUsed)
		aggr.TotalStake += int64(node.TotalStake)

		// Performance metrics
		sumUptime += node.UptimeScore
		if node.PerformanceScore > 0 {
			sumPerformance += node.PerformanceScore
			countPerformance++
		}

		// Credits tracking
		if node.Credits > 0 {
			totalCredits += node.Credits
			nodesWithCredits++
		}
	}

	// Pod (unique pubkey) count
	aggr.TotalPods = len(uniquePubkeys)

	// Average committed storage per unique pod
	if aggr.TotalPods > 0 {
		aggr.AvgStorageCommittedPerPodBytes = totalCommittedStoragePerPod / float64(aggr.TotalPods)
	}

	// Averages
	if len(allNodes) > 0 {
		aggr.AverageUptime = sumUptime / float64(len(allNodes))
	}
	if countPerformance > 0 {
		aggr.AveragePerformance = sumPerformance / float64(countPerformance)
	}

	// Network health calculation
	if len(allNodes) > 0 {
		onlineRatio := float64(aggr.OnlineNodes) / float64(aggr.TotalNodes)
		aggr.NetworkHealth = (onlineRatio * 80) + (aggr.AverageUptime * 0.2)
		if aggr.NetworkHealth > 100 {
			aggr.NetworkHealth = 100
		}
	}

	// Calculate average credits only if we have data
	avgCredits := int64(0)
	if nodesWithCredits > 0 {
		avgCredits = totalCredits / int64(nodesWithCredits)
	}

	// Logging – now uses avgCredits correctly
	log.Printf("Aggregated %d nodes (IPs), %d pods (pubkeys). Online: %d, Warning: %d, Offline: %d. Health: %.2f%%. Avg storage/pod: %.0f bytes. Credits: %d nodes, avg %d",
		aggr.TotalNodes, aggr.TotalPods,
		aggr.OnlineNodes, aggr.WarningNodes, aggr.OfflineNodes,
		aggr.NetworkHealth,
		aggr.AvgStorageCommittedPerPodBytes,
		nodesWithCredits, avgCredits)

	return aggr
}