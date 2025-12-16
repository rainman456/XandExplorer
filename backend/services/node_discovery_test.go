package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"xand/config"
	"xand/models"
	"xand/utils"
)

func TestNodeDiscovery_Bootstrap(t *testing.T) {
	// 1. Setup Peer Node (The one to be discovered)
	peerMux := http.NewServeMux()
	peerMux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		handleRPC(w, r, "1.0.1", nil) // Peer has no further pods
	})
	peerServer := httptest.NewServer(peerMux)
	defer peerServer.Close()

	peerURL := peerServer.URL[7:] // strip http://

	// 2. Setup Seed Node (The entry point)
	seedMux := http.NewServeMux()
	seedMux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		// Return the Peer as a pod
		pods := []models.Pod{{Address: peerURL, Version: "1.0.1"}}
		handleRPC(w, r, "1.0.0", pods)
	})
	seedServer := httptest.NewServer(seedMux)
	defer seedServer.Close()

	seedURL := seedServer.URL[7:]

	// 3. Configure NodeDiscovery
	cfg := &config.Config{
		Server: config.ServerConfig{
			SeedNodes: []string{seedURL},
		},
		PRPC: config.PRPCConfig{
			Timeout: 1,
		},
		Polling: config.PollingConfig{
			DiscoveryInterval: 60,
			StaleThreshold:    5,
		},
	}

	prpc := NewPRPCClient(cfg)
	geo, _ := utils.NewGeoResolver("") // No DB
	nd := NewNodeDiscovery(cfg, prpc, geo)

	// 4. Run Bootstrap
	// We call Bootstrap synchronously for testing, or wait
	nd.Bootstrap()

	// Wait a bit for async recursion
	time.Sleep(500 * time.Millisecond)

	// 5. Verify
	nodes := nd.GetNodes()
	if len(nodes) < 2 {
		t.Errorf("Expected at least 2 discovered nodes (Seed + Peer), got %d", len(nodes))
	}

	// Check content
	foundSeed := false
	foundPeer := false
	for _, n := range nodes {
		if strings.Contains(n.Address, seedURL) {
			foundSeed = true
		}
		if strings.Contains(n.Address, peerURL) {
			foundPeer = true
		}
	}

	if !foundSeed {
		t.Error("Seed node not found in known nodes")
	}
	if !foundPeer {
		t.Error("Peer node not discovered")
	}
}

// Helper to mock good RPC responses
func handleRPC(w http.ResponseWriter, r *http.Request, version string, pods []models.Pod) {
	var req models.RPCRequest
	json.NewDecoder(r.Body).Decode(&req)

	var res interface{}
	switch req.Method {
	case "get_version":
		res = models.VersionResponse{Version: version}
	case "get_stats":
		// Mock stats
		res = models.PRPCStatsResponse{
			Stats: models.NodeStats{
				CPUPercent: 10.5,
				Uptime:     3600,
			},
		}
	case "get_pods":
		if pods == nil {
			pods = []models.Pod{}
		}
		res = models.PodsResponse{
			Pods:       pods,
			TotalCount: len(pods),
		}
	}

	resp := models.RPCResponse{
		JSONRPC: "2.0",
		ID:      req.ID,
	}
	resp.Result, _ = json.Marshal(res)
	json.NewEncoder(w).Encode(resp)
}
