package handlers

import (
	"net/http"
	"sort"

	"github.com/labstack/echo/v4"

	"xand/config"
	"xand/models"
	"xand/services"
)

type Handler struct {
	Cfg       *config.Config
	Cache     *services.CacheService
	Discovery *services.NodeDiscovery
	PRPC      *services.PRPCClient
}

func NewHandler(cfg *config.Config, cache *services.CacheService, discovery *services.NodeDiscovery, prpc *services.PRPCClient) *Handler {
	return &Handler{
		Cfg:       cfg,
		Cache:     cache,
		Discovery: discovery,
		PRPC:      prpc,
	}
}

// GetNodes godoc
func (h *Handler) GetNodes(c echo.Context) error {
	// 1. Check Cache (fresh)
	nodes, stale, found := h.Cache.GetNodes(false)

	// 2. Fallback to Stale
	if !found {
		nodes, stale, found = h.Cache.GetNodes(true)
	}

	// 3. Last resort: Discovery
	if !found {
		nodes = h.Discovery.GetNodes()
		// Discovery logic doesn't have stale/fresh concept exposed, assume fresh enough
	}

	if len(nodes) == 0 {
		return c.JSON(http.StatusOK, []models.Node{})
	}

	// Stale Header
	if stale {
		c.Response().Header().Set("X-Data-Stale", "true")
	}

	// Sort
	sortedNodes := make([]*models.Node, len(nodes))
	copy(sortedNodes, nodes)

	sort.Slice(sortedNodes, func(i, j int) bool {
		statusWeight := func(s string) int {
			switch s {
			case "online":
				return 3
			case "warning":
				return 2
			case "offline":
				return 1
			default:
				return 0
			}
		}
		return statusWeight(sortedNodes[i].Status) > statusWeight(sortedNodes[j].Status)
	})

	return c.JSON(http.StatusOK, sortedNodes)
}

// GetNode godoc
func (h *Handler) GetNode(c echo.Context) error {
	id := c.Param("id")

	// 1. Check Cache (try fresh)
	node, stale, found := h.Cache.GetNode(id, false)

	// 2. Retry Stale
	if !found {
		node, stale, found = h.Cache.GetNode(id, true)
	}

	if found {
		if stale {
			c.Response().Header().Set("X-Data-Stale", "true")
		}
		return c.JSON(http.StatusOK, node)
	}

	// 3. Fallback logic: Look in general list
	// Try fresh
	nodes, _, listFound := h.Cache.GetNodes(true) // Just get best available list
	if listFound {
		for _, n := range nodes {
			if n.ID == id {
				// We found it in the list (which might be stale, check headers from list? No separate here)
				// We can return it.
				return c.JSON(http.StatusOK, n)
			}
		}
	}

	return c.JSON(http.StatusNotFound, map[string]string{"error": "node not found"})
}
