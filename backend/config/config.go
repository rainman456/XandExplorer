package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	Server  ServerConfig  `json:"server"`
	PRPC    PRPCConfig    `json:"prpc"`
	Polling PollingConfig `json:"polling"`
	Cache   CacheConfig   `json:"cache"`
	GeoIP   GeoIPConfig   `json:"geoip"`
}

type ServerConfig struct {
	Port           int      `json:"port"`
	Host           string   `json:"host"`
	AllowedOrigins []string `json:"allowed_origins"`
	SeedNodes      []string `json:"seed_nodes"`
}

type PRPCConfig struct {
	DefaultPort int `json:"default_port"`
	Timeout     int `json:"timeout_seconds"` // using int for easier json/env handling, converted to time.Duration on logic side if needed, or keeping simple
	MaxRetries  int `json:"max_retries"`
}

type PollingConfig struct {
	DiscoveryInterval   int `json:"discovery_interval_seconds"`
	StatsInterval       int `json:"stats_interval_seconds"`
	HealthCheckInterval int `json:"health_check_interval_seconds"`
	StaleThreshold      int `json:"stale_threshold_minutes"` // "minutes" based on user req, or seconds for consistency? user said "5 minutes"
}

type CacheConfig struct {
	TTL     int `json:"ttl_seconds"`
	MaxSize int `json:"max_size"`
}

type GeoIPConfig struct {
	DBPath string `json:"db_path"`
}

// LoadConfig loads configuration from Defaults -> File -> Env -> Flags
func LoadConfig() (*Config, error) {
	// 1. Initialize with Defaults
	cfg := &Config{
		Server: ServerConfig{
			Port: 8080,
			Host: "0.0.0.0",
			AllowedOrigins: []string{
				"http://localhost:5173",
				"http://localhost:5174",
				"https://your-deployed-frontend.vercel.app",
			},
			SeedNodes: []string{}, // Empty by default, or could add some known ones if user provided specific seeds
		},
		PRPC: PRPCConfig{
			DefaultPort: 6000,
			Timeout:     5,
			MaxRetries:  3,
		},
		Polling: PollingConfig{
			DiscoveryInterval: 60,
			StatsInterval:     30,
			StaleThreshold:    5, // 5 minutes
		},
		Cache: CacheConfig{
			TTL:     30,
			MaxSize: 1000,
		},
		GeoIP: GeoIPConfig{
			DBPath: "", // Optional
		},
	}

	// 2. Load from Config File
	// Check if config file path is provided via flag (we need to parse flags twice effectively, or just look for -config manually/early, or use a specific env var for config path)
	// For simplicity, let's check a standard location or an environment variable `CONFIG_FILE`.
	configPath := os.Getenv("CONFIG_FILE")
	if configPath == "" {
		configPath = "config/config.json"
	}

	if _, err := os.Stat(configPath); err == nil {
		file, err := os.Open(configPath)
		if err == nil {
			defer file.Close()
			decoder := json.NewDecoder(file)
			if err := decoder.Decode(cfg); err != nil {
				fmt.Printf("Warning: Failed to decode config file: %v\n", err)
			}
		}
	}

	// 3. Load from Environment Variables (Override)
	loadEnv(cfg)

	// 4. Load from Flags (Override)
	// Use a custom FlagSet to avoid polluting the global flag set and allow re-parsing in tests
	fs := flag.NewFlagSet("config", flag.ContinueOnError)

	// Define flags
	var serverPort int
	var serverHost string

	fs.IntVar(&serverPort, "port", 0, "Server port")
	fs.StringVar(&serverHost, "host", "", "Server host")

	// Parse flags from os.Args
	// Ignore errors (e.g. unknown flags intended for other parts of the app, though ContinueOnError helps)
	// Note: In a real main app, we might want to share the FlagSet or process args differently.
	// For this specific requirement, we parse what we know.
	_ = fs.Parse(os.Args[1:])

	// Apply Flags if set
	if isFlagPassed(fs, "port") {
		cfg.Server.Port = serverPort
	}
	if isFlagPassed(fs, "host") {
		cfg.Server.Host = serverHost
	}

	return cfg, nil
}

// Helper to check if a flag was actually passed
func isFlagPassed(fs *flag.FlagSet, name string) bool {
	found := false
	fs.Visit(func(f *flag.Flag) {
		if f.Name == name {
			found = true
		}
	})
	return found
}

func loadEnv(cfg *Config) {
	// Server
	if val := os.Getenv("SERVER_PORT"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.Server.Port = p
		}
	}
	if val := os.Getenv("SERVER_HOST"); val != "" {
		cfg.Server.Host = val
	}
	if val := os.Getenv("ALLOWED_ORIGINS"); val != "" {
		cfg.Server.AllowedOrigins = strings.Split(val, ",")
	}
	if val := os.Getenv("SEED_NODES"); val != "" {
		parts := strings.Split(val, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		cfg.Server.SeedNodes = parts
	}

	// pRPC
	if val := os.Getenv("PRPC_PORT"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.PRPC.DefaultPort = p
		}
	}
	if val := os.Getenv("PRPC_TIMEOUT"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.PRPC.Timeout = p
		}
	}

	// Polling
	if val := os.Getenv("DISCOVERY_INTERVAL"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.Polling.DiscoveryInterval = p
		}
	}
	if val := os.Getenv("STATS_INTERVAL"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.Polling.StatsInterval = p
		}
	}

	// GeoIP
	if val := os.Getenv("GEOIP_DB_PATH"); val != "" {
		cfg.GeoIP.DBPath = val
	}
}

// Helper methods to get durations
func (c *Config) PRPCTimeoutDuration() time.Duration {
	return time.Duration(c.PRPC.Timeout) * time.Second
}

func (c *Config) DiscoveryIntervalDuration() time.Duration {
	return time.Duration(c.Polling.DiscoveryInterval) * time.Second
}

func (c *Config) StatsIntervalDuration() time.Duration {
	return time.Duration(c.Polling.StatsInterval) * time.Second
}

func (c *Config) StaleThresholdDuration() time.Duration {
	return time.Duration(c.Polling.StaleThreshold) * time.Minute
}

func (c *Config) CacheTTLDuration() time.Duration {
	return time.Duration(c.Cache.TTL) * time.Second
}
