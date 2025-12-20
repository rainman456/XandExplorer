package services

import (
	"log"
	"math"
	"sync"
	"time"

	"xand/models"
)

type HistoryService struct {
	networkSnapshots []models.NetworkSnapshot
	nodeSnapshots    map[string][]models.NodeSnapshot // Key: NodeID
	mutex            sync.RWMutex
	cache            *CacheService
	stopChan         chan struct{}
}

func NewHistoryService(cache *CacheService) *HistoryService {
	return &HistoryService{
		networkSnapshots: make([]models.NetworkSnapshot, 0),
		nodeSnapshots:    make(map[string][]models.NodeSnapshot),
		cache:            cache,
		stopChan:         make(chan struct{}),
	}
}

func (hs *HistoryService) Start() {
	log.Println("Starting History Service...")
	
	// Collect snapshots every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	
	go func() {
		// Immediate first collection
		hs.collectSnapshot()
		
		for {
			select {
			case <-ticker.C:
				hs.collectSnapshot()
			case <-hs.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

func (hs *HistoryService) Stop() {
	close(hs.stopChan)
}

func (hs *HistoryService) collectSnapshot() {
	stats, _, found := hs.cache.GetNetworkStats(true)
	if !found {
		return
	}

	nodes, _, _ := hs.cache.GetNodes(true)

	// Calculate average latency
	var totalLatency int64
	var latencyCount int
	for _, node := range nodes {
		if node.ResponseTime > 0 {
			totalLatency += node.ResponseTime
			latencyCount++
		}
	}
	var avgLatency int64
	if latencyCount > 0 {
		avgLatency = totalLatency / int64(latencyCount)
	}

	// Network snapshot
	netSnap := models.NetworkSnapshot{
		Timestamp:      time.Now(),
		TotalNodes:     stats.TotalNodes,
		OnlineNodes:    stats.OnlineNodes,
		WarningNodes:   stats.WarningNodes,
		OfflineNodes:   stats.OfflineNodes,
		TotalStoragePB: stats.TotalStorage,
		UsedStoragePB:  stats.UsedStorage,
		AverageLatency: avgLatency,
		NetworkHealth:  stats.NetworkHealth,
		TotalStake:     stats.TotalStake,
		AverageUptime:  stats.AverageUptime,
		AveragePerf:    stats.AveragePerformance,
	}

	hs.mutex.Lock()
	hs.networkSnapshots = append(hs.networkSnapshots, netSnap)
	
	// Keep last 24 hours (288 snapshots at 5min intervals)
	if len(hs.networkSnapshots) > 288 {
		hs.networkSnapshots = hs.networkSnapshots[len(hs.networkSnapshots)-288:]
	}

	// Node snapshots
	for _, node := range nodes {
		snap := models.NodeSnapshot{
			Timestamp:        time.Now(),
			NodeID:           node.ID,
			Status:           node.Status,
			ResponseTime:     node.ResponseTime,
			CPUPercent:       node.CPUPercent,
			RAMUsed:          node.RAMUsed,
			StorageUsed:      node.StorageUsed,
			UptimeScore:      node.UptimeScore,
			PerformanceScore: node.PerformanceScore,
		}

		hs.nodeSnapshots[node.ID] = append(hs.nodeSnapshots[node.ID], snap)
		
		// Keep last 24 hours per node
		if len(hs.nodeSnapshots[node.ID]) > 288 {
			hs.nodeSnapshots[node.ID] = hs.nodeSnapshots[node.ID][len(hs.nodeSnapshots[node.ID])-288:]
		}
	}
	hs.mutex.Unlock()

	log.Printf("Collected snapshot: %d nodes, %.2f PB used", stats.TotalNodes, stats.UsedStorage)
}

// GetNetworkHistory returns network snapshots
func (hs *HistoryService) GetNetworkHistory(hours int) []models.NetworkSnapshot {
	hs.mutex.RLock()
	defer hs.mutex.RUnlock()

	if hours <= 0 {
		hours = 24
	}

	// Calculate how many snapshots to return (12 per hour at 5min intervals)
	count := hours * 12
	if count > len(hs.networkSnapshots) {
		count = len(hs.networkSnapshots)
	}

	start := len(hs.networkSnapshots) - count
	if start < 0 {
		start = 0
	}

	result := make([]models.NetworkSnapshot, count)
	copy(result, hs.networkSnapshots[start:])
	return result
}

// GetNodeHistory returns snapshots for a specific node
func (hs *HistoryService) GetNodeHistory(nodeID string, hours int) []models.NodeSnapshot {
	hs.mutex.RLock()
	defer hs.mutex.RUnlock()

	snapshots, exists := hs.nodeSnapshots[nodeID]
	if !exists {
		return []models.NodeSnapshot{}
	}

	if hours <= 0 {
		hours = 24
	}

	count := hours * 12
	if count > len(snapshots) {
		count = len(snapshots)
	}

	start := len(snapshots) - count
	if start < 0 {
		start = 0
	}

	result := make([]models.NodeSnapshot, count)
	copy(result, snapshots[start:])
	return result
}

// GetCapacityForecast predicts storage saturation
func (hs *HistoryService) GetCapacityForecast() models.CapacityForecast {
	hs.mutex.RLock()
	defer hs.mutex.RUnlock()

	forecast := models.CapacityForecast{
		CurrentUsagePB:    0,
		CurrentCapacityPB: 0,
		GrowthRatePBPerDay: 0,
		DaysToSaturation:  -1,
		Confidence:        0,
	}

	if len(hs.networkSnapshots) < 2 {
		return forecast
	}

	// Get latest snapshot
	latest := hs.networkSnapshots[len(hs.networkSnapshots)-1]
	forecast.CurrentUsagePB = latest.UsedStoragePB
	forecast.CurrentCapacityPB = latest.TotalStoragePB

	// Calculate growth rate from last 24 hours
	// Find snapshot from ~24h ago
	var oldSnapshot *models.NetworkSnapshot
	targetTime := time.Now().Add(-24 * time.Hour)
	
	for i := len(hs.networkSnapshots) - 1; i >= 0; i-- {
		if hs.networkSnapshots[i].Timestamp.Before(targetTime) {
			oldSnapshot = &hs.networkSnapshots[i]
			break
		}
	}

	if oldSnapshot == nil && len(hs.networkSnapshots) > 1 {
		// Use oldest available
		oldSnapshot = &hs.networkSnapshots[0]
	}

	if oldSnapshot != nil {
		hoursDiff := time.Since(oldSnapshot.Timestamp).Hours()
		if hoursDiff > 0 {
			usageDiff := latest.UsedStoragePB - oldSnapshot.UsedStoragePB
			forecast.GrowthRatePBPerDay = (usageDiff / hoursDiff) * 24

			// Calculate days to saturation
			if forecast.GrowthRatePBPerDay > 0 {
				remaining := forecast.CurrentCapacityPB - forecast.CurrentUsagePB
				if remaining > 0 {
					forecast.DaysToSaturation = int(math.Ceil(remaining / forecast.GrowthRatePBPerDay))
					forecast.SaturationDate = time.Now().AddDate(0, 0, forecast.DaysToSaturation)
				}
			}

			// Confidence based on data availability
			if len(hs.networkSnapshots) >= 288 { // Full 24h
				forecast.Confidence = 90
			} else {
				forecast.Confidence = float64(len(hs.networkSnapshots)) / 288 * 90
			}
		}
	}

	return forecast
}

// GetLatencyDistribution returns latency histogram data
func (hs *HistoryService) GetLatencyDistribution() map[string]int {
	nodes, _, found := hs.cache.GetNodes(true)
	if !found {
		return map[string]int{}
	}

	distribution := map[string]int{
		"0-50ms":      0,
		"50-100ms":    0,
		"100-250ms":   0,
		"250-500ms":   0,
		"500-1000ms":  0,
		"1000-2000ms": 0,
		"2000ms+":     0,
	}

	for _, node := range nodes {
		latency := node.ResponseTime
		switch {
		case latency <= 50:
			distribution["0-50ms"]++
		case latency <= 100:
			distribution["50-100ms"]++
		case latency <= 250:
			distribution["100-250ms"]++
		case latency <= 500:
			distribution["250-500ms"]++
		case latency <= 1000:
			distribution["500-1000ms"]++
		case latency <= 2000:
			distribution["1000-2000ms"]++
		default:
			distribution["2000ms+"]++
		}
	}

	return distribution
}