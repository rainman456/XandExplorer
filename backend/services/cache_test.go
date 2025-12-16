package services

import (
	"testing"
	"time"

	"xand/config"
	"xand/models"
)

func TestCacheService_TTL(t *testing.T) {
	cfg := &config.Config{}
	cs := NewCacheService(cfg, nil) // Aggregator nil since we test manual Set/Get

	// Set with short TTL
	cs.Set("test_key", "test_val", 100*time.Millisecond)

	// Get immediately
	if val, ok := cs.Get("test_key"); !ok || val != "test_val" {
		t.Errorf("Expected test_val, got %v (found=%v)", val, ok)
	}

	// Wait for expiration
	time.Sleep(200 * time.Millisecond)

	// Get should fail
	if _, ok := cs.Get("test_key"); ok {
		t.Error("Expected cache miss after TTL, got found")
	}
}

func TestCacheService_TypedGetters(t *testing.T) {
	cs := NewCacheService(&config.Config{}, nil)

	// Test Stats
	stats := models.NetworkStats{TotalNodes: 5}
	cs.Set("stats", stats, time.Second)

	gotStats, _, ok := cs.GetNetworkStats(false)
	if !ok {
		t.Fatal("GetNetworkStats missing")
	}
	if gotStats.TotalNodes != 5 {
		t.Errorf("Expected 5 nodes, got %d", gotStats.TotalNodes)
	}

	// Test Nodes
	nodes := []*models.Node{{ID: "1"}, {ID: "2"}}
	cs.Set("nodes", nodes, time.Second)

	gotNodes, _, ok := cs.GetNodes(false)
	if !ok {
		t.Fatal("GetNodes missing")
	}
	if len(gotNodes) != 2 {
		t.Errorf("Expected 2 nodes, got %d", len(gotNodes))
	}

	// Test Node
	node := &models.Node{ID: "xyz"}
	cs.Set("node:xyz", node, time.Second)

	gotNode, _, ok := cs.GetNode("xyz", false)
	if !ok {
		t.Fatal("GetNode missing")
	}
	if gotNode.ID != "xyz" {
		t.Errorf("Expected xyz, got %s", gotNode.ID)
	}
}
