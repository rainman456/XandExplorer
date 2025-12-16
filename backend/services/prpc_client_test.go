package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"xand/config"
	"xand/models"
)

func TestCallPRPC_Success(t *testing.T) {
	// Mock Server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify Request
		var req models.RPCRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("Failed to decode request: %v", err)
		}
		if req.Method != "get_version" {
			t.Errorf("Expected method 'get_version', got '%s'", req.Method)
		}

		// Send Response
		resp := models.RPCResponse{
			JSONRPC: "2.0",
			Result:  json.RawMessage(`{"version": "1.0.0"}`),
			ID:      req.ID,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	// Config
	cfg := &config.Config{
		PRPC: config.PRPCConfig{Timeout: 1},
	}
	client := NewPRPCClient(cfg)

	// Test
	// parse IP from URL for CallPRPC which expects "IP" (host:port)
	// server.URL includes "http://", we need to strip it or adjust client to handle it.
	// Client adds "http://", so we strip it.
	nodeIP := server.URL[7:] // remove http://

	resp, err := client.GetVersion(nodeIP)
	if err != nil {
		t.Fatalf("GetVersion failed: %v", err)
	}

	if resp.Version != "1.0.0" {
		t.Errorf("Expected version 1.0.0, got %s", resp.Version)
	}
}

func TestCallPRPC_Error404(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	cfg := &config.Config{PRPC: config.PRPCConfig{Timeout: 1}}
	client := NewPRPCClient(cfg)
	nodeIP := server.URL[7:]

	_, err := client.GetVersion(nodeIP)
	if err == nil {
		t.Fatal("Expected error for 404, got nil")
	}
}

func TestCallPRPC_JSONRPCError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := models.RPCResponse{
			JSONRPC: "2.0",
			Error: &models.RPCError{
				Code:    -32601,
				Message: "Method not found",
			},
			ID: 1,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	cfg := &config.Config{PRPC: config.PRPCConfig{Timeout: 1}}
	client := NewPRPCClient(cfg)
	nodeIP := server.URL[7:]

	_, err := client.GetVersion(nodeIP)
	if err == nil {
		t.Fatal("Expected error for RPC Error, got nil")
	}
	// Check error content or type if strict
}
func TestCallPRPC_Retry(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusServiceUnavailable) // Fail first 2 times
			return
		}
		// Success on 3rd
		resp := models.RPCResponse{
			JSONRPC: "2.0",
			Result:  json.RawMessage(`{"version":"1.0.0"}`),
			ID:      1,
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	cfg := &config.Config{}
	cfg.PRPC.MaxRetries = 3
	cfg.PRPC.Timeout = 1 // 1 second

	client := NewPRPCClient(cfg)
	// Override URL construction in CallPRPC?
	// CallPRPC constructs URL: http://<ip>/rpc.
	// Our mock server URL is http://127.0.0.1:<port>.
	// We need to pass just "127.0.0.1:<port>" to GetVersion.
	// httptest server.URL includes "http://". Strip it.

	ip := server.URL[7:] // remove http://

	_, err := client.GetVersion(ip)
	if err != nil {
		t.Fatalf("Expected success after retry, got error: %v", err)
	}

	if attempts != 3 {
		t.Errorf("Expected 3 attempts, got %d", attempts)
	}
}
