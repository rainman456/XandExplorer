package config

import (
	"os"
	"testing"
)

func TestLoadConfig_Defaults(t *testing.T) {
	// Clear env vars to ensure defaults
	os.Unsetenv("SERVER_PORT")
	os.Unsetenv("SERVER_HOST")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	if cfg.Server.Port != 8080 {
		t.Errorf("Expected default port 8080, got %d", cfg.Server.Port)
	}
	if cfg.Server.Host != "0.0.0.0" {
		t.Errorf("Expected default host 0.0.0.0, got %s", cfg.Server.Host)
	}
	if cfg.PRPC.Timeout != 5 {
		t.Errorf("Expected default PRPC timeout 5, got %d", cfg.PRPC.Timeout)
	}
}

func TestLoadConfig_EnvOverride(t *testing.T) {
	os.Setenv("SERVER_PORT", "9090")
	os.Setenv("SERVER_HOST", "127.0.0.1")
	os.Setenv("PRPC_TIMEOUT", "10")
	defer func() {
		os.Unsetenv("SERVER_PORT")
		os.Unsetenv("SERVER_HOST")
		os.Unsetenv("PRPC_TIMEOUT")
	}()

	// Re-load config
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	if cfg.Server.Port != 9090 {
		t.Errorf("Expected env port 9090, got %d", cfg.Server.Port)
	}
	if cfg.Server.Host != "127.0.0.1" {
		t.Errorf("Expected env host 127.0.0.1, got %s", cfg.Server.Host)
	}
	if cfg.PRPC.Timeout != 10 {
		t.Errorf("Expected env PRPC timeout 10, got %d", cfg.PRPC.Timeout)
	}
}
