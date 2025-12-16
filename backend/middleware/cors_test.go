package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestCORSMiddleware(t *testing.T) {
	e := echo.New()

	origins := []string{"http://localhost:5173", "http://example.com"}
	e.Use(CORSMiddleware(origins))

	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	// Test Preflight OPTIONS
	req := httptest.NewRequest(http.MethodOptions, "/", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("Expected 204 No Content for OPTIONS, got %d", rec.Code)
	}

	if val := rec.Header().Get("Access-Control-Allow-Origin"); val != "http://localhost:5173" {
		t.Errorf("Expected Allow-Origin localhost:5173, got %s", val)
	}

	if val := rec.Header().Get("Access-Control-Max-Age"); val != "3600" {
		t.Errorf("Expected Max-Age 3600, got %s", val)
	}

	// Test GET
	req = httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Origin", "http://example.com")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for GET, got %d", rec.Code)
	}
	if val := rec.Header().Get("Access-Control-Allow-Origin"); val != "http://example.com" {
		t.Errorf("Expected Allow-Origin example.com, got %s", val)
	}
}
