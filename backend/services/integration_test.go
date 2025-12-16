package services

import (
	"testing"
	"time"

	"xand/config"
	"xand/models"
	"xand/utils"
)

func TestIntegration_Aggregation(t *testing.T) {
	// 1. Setup Dependencies (Minimal)
	cfg := &config.Config{}
	geo, _ := utils.NewGeoResolver("")
	nd := NewNodeDiscovery(cfg, nil, geo)
	// Note: We don't need a real PRPCClient because we manually inject nodes

	// 2. Inject Known Nodes directly (since we are in package 'services')
	now := time.Now()

	nodeA := &models.Node{
		ID:           "nodeA",
		Status:       "active",
		LastSeen:     now,
		UptimeScore:  100,
		ResponseTime: 50,
		TotalStake:   1000,
		StorageUsed:  100 * 1024 * 1024 * 1024, // 100 GB
		CallHistory:  []bool{true, true, true},
		IsOnline:     true,
	}

	nodeB := &models.Node{
		ID:           "nodeB",
		Status:       "active",
		LastSeen:     now,
		UptimeScore:  90,
		ResponseTime: 2000, // Slow -> Warning
		TotalStake:   500,
		StorageUsed:  50 * 1024 * 1024 * 1024, // 50 GB
		CallHistory:  []bool{true, true, true},
		IsOnline:     true,
	}

	nodeC := &models.Node{
		ID:           "nodeC",
		Status:       "active",
		LastSeen:     now.Add(-6 * time.Minute), // Missing for 6m -> Offline
		UptimeScore:  50,
		ResponseTime: 0,
		TotalStake:   200,
		StorageUsed:  200 * 1024 * 1024 * 1024, // 200 GB (offline nodes usually don't contribute to active storage stats? User algorithm vague. Aggregator just sums all?)
		// Aggregator loop: "For each node... determine status... calculate score... Update NetworkStats".
		// NetworkStats has: TotalStorage, UsedStorage.
		// Usually purely offline nodes might be excluded from active capacity, but let's see implementation.
		// Implementation in `data_aggregator.go` lines 122+: Sums up filtering? No, sums all `nodes`.
		CallHistory: []bool{},
		IsOnline:    false,
	}

	nd.knownNodes["nodeA"] = nodeA
	nd.knownNodes["nodeB"] = nodeB
	nd.knownNodes["nodeC"] = nodeC

	// 3. Create Aggregator
	da := NewDataAggregator(nd)

	// 4. Run Aggregation
	stats := da.Aggregate()

	// 5. Verify Stats
	if stats.TotalNodes != 3 {
		t.Errorf("Expected 3 TotalNodes, got %d", stats.TotalNodes)
	}

	// Check Counts
	// NodeA: Online (Time < 2m, Score 100, Latency 50) -> Online
	// NodeB: Warning (Time < 2m, Score 90, Latency 2000) -> Warning (Latency > 1s)
	// NodeC: Offline (Time > 5m) -> Offline

	if stats.OnlineNodes != 1 {
		t.Errorf("Expected 1 OnlineNode, got %d", stats.OnlineNodes)
	}
	if stats.WarningNodes != 1 {
		t.Errorf("Expected 1 WarningNode, got %d", stats.WarningNodes)
	}
	if stats.OfflineNodes != 1 {
		t.Errorf("Expected 1 OfflineNode, got %d", stats.OfflineNodes)
	}

	// Verify Node Status Updates
	if nodeA.Status != "online" {
		t.Errorf("NodeA status: got %s, want online", nodeA.Status)
	}
	if nodeB.Status != "warning" {
		t.Errorf("NodeB status: got %s, want warning", nodeB.Status)
	}
	if nodeC.Status != "offline" {
		t.Errorf("NodeC status: got %s, want offline", nodeC.Status)
	}

	// Verify Storage (PB)
	// NodeA: 100GB, NodeB: 50GB, NodeC: 200GB -> Total 350GB
	// 1 PB = 1024 TB = 1048576 GB
	// 350 / 1048576 ~= 0.000333
	expectedPB := 350.0 / (1024.0 * 1024.0)
	// Floating point check
	if stats.UsedStorage < expectedPB-0.001 || stats.UsedStorage > expectedPB+0.001 {
		t.Errorf("UsedStorage: got %f, want approx %f", stats.UsedStorage, expectedPB)
	}
}
