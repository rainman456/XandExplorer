package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// GetStats godoc
func (h *Handler) GetStats(c echo.Context) error {
	// 1. Check Cache (fresh)
	stats, stale, found := h.Cache.GetNetworkStats(false)

	// 2. Fallback Stale
	if !found {
		stats, stale, found = h.Cache.GetNetworkStats(true)
	}

	if !found {
		// Fallback: Trigger Refresh?
		h.Cache.Refresh()
		stats, stale, found = h.Cache.GetNetworkStats(true)
		if !found {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "stats unavailable"})
		}
	}

	if stale {
		c.Response().Header().Set("X-Data-Stale", "true")
	}

	return c.JSON(http.StatusOK, stats)
}
