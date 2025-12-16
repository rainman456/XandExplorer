package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestLoggerMiddleware(t *testing.T) {
	e := echo.New()
	e.Use(LoggerMiddleware())

	// Test Success Case
	e.GET("/success", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	req := httptest.NewRequest(http.MethodGet, "/success?q=abc", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rec.Code)
	}

	// Test Error Case
	e.GET("/error", func(c echo.Context) error {
		return errors.New("something went wrong")
	})

	reqError := httptest.NewRequest(http.MethodGet, "/error", nil)
	recError := httptest.NewRecorder()
	e.ServeHTTP(recError, reqError)

	// Echo default error handler typically returns 500 for generic errors w/o debug mode
	if recError.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500 for error, got %d", recError.Code)
	}
}
