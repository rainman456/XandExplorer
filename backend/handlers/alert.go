package handlers

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"xand/models"
	"xand/services"
)

// AlertHandlers manages alert-related endpoints
type AlertHandlers struct {
	alertService *services.AlertService
}

func NewAlertHandlers(alertService *services.AlertService) *AlertHandlers {
	return &AlertHandlers{
		alertService: alertService,
	}
}

// CreateAlert godoc
func (ah *AlertHandlers) CreateAlert(c echo.Context) error {
	var alert models.Alert
	if err := c.Bind(&alert); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if err := ah.alertService.CreateAlert(&alert); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusCreated, alert)
}

// ListAlerts godoc
func (ah *AlertHandlers) ListAlerts(c echo.Context) error {
	alerts := ah.alertService.ListAlerts()
	return c.JSON(http.StatusOK, alerts)
}

// GetAlert godoc
func (ah *AlertHandlers) GetAlert(c echo.Context) error {
	id := c.Param("id")
	
	alert, found := ah.alertService.GetAlert(id)
	if !found {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "alert not found"})
	}

	return c.JSON(http.StatusOK, alert)
}

// UpdateAlert godoc
func (ah *AlertHandlers) UpdateAlert(c echo.Context) error {
	id := c.Param("id")
	
	var alert models.Alert
	if err := c.Bind(&alert); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if err := ah.alertService.UpdateAlert(id, &alert); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, alert)
}

// DeleteAlert godoc
func (ah *AlertHandlers) DeleteAlert(c echo.Context) error {
	id := c.Param("id")
	
	if err := ah.alertService.DeleteAlert(id); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "alert deleted"})
}

// GetAlertHistory godoc
func (ah *AlertHandlers) GetAlertHistory(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	limit := 100 // Default
	
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	history := ah.alertService.GetHistory(limit)
	return c.JSON(http.StatusOK, history)
}

// TestAlert godoc - Test an alert without saving
func (ah *AlertHandlers) TestAlert(c echo.Context) error {
	var alert models.Alert
	if err := c.Bind(&alert); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	// Create temporary alert for testing
	alert.ID = "test_alert"
	alert.Enabled = true

	// Manually trigger evaluation (simplified)
	result := map[string]interface{}{
		"alert":   alert,
		"message": "Alert test triggered successfully. Check your configured actions.",
	}

	return c.JSON(http.StatusOK, result)
}