package handlers

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"xand/services"
)

type CreditsHandlers struct {
	creditsService *services.CreditsService
}

func NewCreditsHandlers(creditsService *services.CreditsService) *CreditsHandlers {
	return &CreditsHandlers{
		creditsService: creditsService,
	}
}

// GetAllCredits - GET /api/credits
func (ch *CreditsHandlers) GetAllCredits(c echo.Context) error {
	credits := ch.creditsService.GetAllCredits()
	return c.JSON(http.StatusOK, credits)
}

// GetTopCredits - GET /api/credits/top?limit=20
func (ch *CreditsHandlers) GetTopCredits(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	limit := 20 // Default
	
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	credits := ch.creditsService.GetTopCredits(limit)
	return c.JSON(http.StatusOK, credits)
}

// GetNodeCredits - GET /api/credits/:pubkey
func (ch *CreditsHandlers) GetNodeCredits(c echo.Context) error {
	pubkey := c.Param("pubkey")
	
	credits, exists := ch.creditsService.GetCredits(pubkey)
	if !exists {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "credits not found for this pubkey",
		})
	}

	return c.JSON(http.StatusOK, credits)
}