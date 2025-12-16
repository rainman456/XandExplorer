package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"xand/config"
	"xand/models"
	"xand/services"

	"github.com/labstack/echo/v4"
)

func TestGetNodes(t *testing.T) {
	// Setup Dependencies
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/nodes", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	cfg := &config.Config{}

	// Mock Cache with data
	cache := services.NewCacheService(cfg, nil)
	nodes := []*models.Node{
		{ID: "node1", Status: "online"},
		{ID: "node2", Status: "offline"},
	}
	cache.Set("nodes", nodes, time.Minute)

	handler := NewHandler(cfg, cache, nil, nil)

	// Test
	if err := handler.GetNodes(c); err != nil {
		t.Fatalf("GetNodes failed: %v", err)
	}

	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var resp []*models.Node
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp) != 2 {
		t.Errorf("Expected 2 nodes, got %d", len(resp))
	}
	// Verify sorting (online first)
	if resp[0].ID != "node1" {
		t.Error("Expected online node first")
	}
}

func TestGetNode_NotFound(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/nodes/missing", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/nodes/:id")
	c.SetParamNames("id")
	c.SetParamValues("missing")

	cfg := &config.Config{}

	// Empty Discovery/Cache
	cache := services.NewCacheService(cfg, nil)
	discovery := services.NewNodeDiscovery(cfg, nil, nil)

	handler := NewHandler(cfg, cache, discovery, nil)

	// Test
	handler.GetNode(c) // Error handling might return error or write to context
	// Echo handler returns error or nil

	if rec.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", rec.Code)
	}
}
