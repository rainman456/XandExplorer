package services

import (
	"log"
	"time"

	"xand/models"
	"xand/utils"
)

type DataAggregator struct {
	discovery *NodeDiscovery
}

func NewDataAggregator(discovery *NodeDiscovery) *DataAggregator {
	return &DataAggregator{
		discovery: discovery,
	}
}

// Aggregate performs full network aggregation
func (da *DataAggregator) Aggregate() models.NetworkStats {
	nodes := da.discovery.GetNodes()

	aggr := models.NetworkStats{
		TotalNodes:  len(nodes),
		LastUpdated: time.Now(),
	}

	var sumUptime float64
	var sumPerformance float64
	var countPerformance int

	for _, node := range nodes {
		// 1. Determine Status
		utils.DetermineStatus(node)

		// 2. Calculate Performance Score
		utils.CalculateScore(node)

		// 3. Aggregate Counts
		switch node.Status {
		case "online":
			aggr.OnlineNodes++
		case "warning":
			aggr.WarningNodes++
		case "offline":
			aggr.OfflineNodes++
		}

		// 4. Aggregate Storage (PB)
		aggr.TotalStorage += float64(node.StorageCapacity)
		aggr.UsedStorage += float64(node.StorageUsed)

		// 5. Aggregate Stake
		aggr.TotalStake += int64(node.TotalStake)

		// 6. Aggregate Averages
		sumUptime += node.UptimeScore
		sumPerformance += node.PerformanceScore
		countPerformance++
	}

	// Normalize Storage to PB
	// 1 PB = 1e15 bytes
	aggr.TotalStorage /= 1e15
	aggr.UsedStorage /= 1e15

	// Averages
	if len(nodes) > 0 {
		aggr.AverageUptime = sumUptime / float64(len(nodes))
		aggr.AveragePerformance = sumPerformance / float64(len(nodes))
	}

	// Network Health: (online/total)*80 + (avgUptime)*0.2
	if len(nodes) > 0 {
		onlineRatio := float64(aggr.OnlineNodes) / float64(aggr.TotalNodes)
		aggr.NetworkHealth = (onlineRatio * 80) + (aggr.AverageUptime * 0.2)
	}

	log.Printf("Aggregated %d nodes. Health: %.2f%%. Storage: %.2f PB", len(nodes), aggr.NetworkHealth, aggr.TotalStorage)

	return aggr
}
