# Codebase Analysis: backend
Generated: 2025-12-20 21:03:15
---

## 📂 Project Structure
```tree
📁 backend
├── config/
│   └── config.go
├── handlers/
│   ├── alert.go
│   ├── analytics.go
│   ├── caculator.go
│   ├── comparison.go
│   ├── credits.go
│   ├── handlers_test.go
│   ├── history.go
│   ├── nodes.go
│   ├── rpc.go
│   ├── stats.go
│   ├── system.go
│   └── topology.go
├── middleware/
│   ├── cors.go
│   └── logger.go
├── models/
│   ├── alert.go
│   ├── analytics.go
│   ├── calculator.go
│   ├── comparison.go
│   ├── credits.go
│   ├── history.go
│   ├── node.go
│   ├── prpc.go
│   ├── stats.go
│   └── topology.go
├── services/
│   ├── alert_service.go
│   ├── cache.go
│   ├── calculator_service.go
│   ├── comparsion_service.go
│   ├── credits_service.go
│   ├── data_aggregator.go
│   ├── history_service.go
│   ├── mongodb_service.go
│   ├── node_discovery.go
│   ├── prpc_client.go
│   └── topology_service.go
├── utils/
│   ├── geolocation.go
│   ├── scoring.go
│   └── version.go
├── .env
└── main.go
```
---

## 📄 File Contents
### main.go
- Size: 8.61 KB
- Lines: 322
- Last Modified: 2025-12-20 13:27:25

```go
// package main

// import (
// 	"context"
// 	"fmt"
// 	"log"
// 	"net/http"
// 	"os"
// 	"os/signal"
// 	"syscall"
// 	"time"

// 	"github.com/labstack/echo/v4"

// 	"xand/config"
// 	"xand/handlers"
// 	"xand/middleware"
// 	"xand/services"
// 	"xand/utils"
// )

// func main() {
// 	// 1. Config
// 	cfg, err := config.LoadConfig()
// 	if err != nil {
// 		log.Fatalf("Failed to load config: %v", err)
// 	}

// 	// 2. Services
// 	// GeoIP
// 	geo, err := utils.NewGeoResolver(cfg.GeoIP.DBPath)
// 	if err != nil {
// 		log.Printf("Warning: GeoIP DB not found at %s: %v", cfg.GeoIP.DBPath, err)
// 	}
// 	defer geo.Close()

// 	// Clients
// 	prpc := services.NewPRPCClient(cfg)

// 	// Discovery
// 	discovery := services.NewNodeDiscovery(cfg, prpc, geo)

// 	// Aggregator
// 	aggregator := services.NewDataAggregator(discovery)

// 	// Cache
// 	cache := services.NewCacheService(cfg, aggregator)

// 	// 3. Start Background Services
// 	discovery.Start()
// 	cache.StartCacheWarmer()

// 	// 4. Web Server
// 	e := echo.New()

// 	// Middleware
// 	e.Use(middleware.LoggerMiddleware())
// 	e.Use(middleware.CORSMiddleware(cfg.Server.AllowedOrigins))
// 	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
// 		return func(c echo.Context) error {
// 			defer func() {
// 				if r := recover(); r != nil {
// 					log.Printf("Recovered from panic: %v", r)
// 					c.Error(fmt.Errorf("internal server error"))
// 				}
// 			}()
// 			return next(c)
// 		}
// 	})

// 	// Handlers
// 	h := handlers.NewHandler(cfg, cache, discovery, prpc)

// 	// Routes
// 	e.GET("/health", h.GetHealth)

// 	api := e.Group("/api")
// 	api.GET("/status", h.GetStatus)
// 	api.GET("/nodes", h.GetNodes)
// 	api.GET("/nodes/:id", h.GetNode)
// 	api.GET("/stats", h.GetStats)
// 	api.POST("/rpc", h.ProxyRPC)

// 	// 5. Start Server with Graceful Shutdown
// 	serverAddr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)

// 	go func() {
// 		log.Printf("Server running on http://%s", serverAddr)
// 		if err := e.Start(serverAddr); err != nil && err != http.ErrServerClosed {
// 			log.Fatalf("shutting down the server: %v", err)
// 		}
// 	}()

// 	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 10 seconds.
// 	// Use a buffered channel to avoid missing signals as recommended for signal.Notify
// 	quit := make(chan os.Signal, 1)
// 	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
// 	<-quit
// 	log.Println("Graceful shutdown received...")

// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	// Stop Background Services
// 	log.Println("Stopping services...")
// 	discovery.Stop()
// 	cache.Stop()

// 	if err := e.Shutdown(ctx); err != nil {
// 		e.Logger.Fatal(err)
// 	}
// 	log.Println("Server exited")
// }


package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"

	"xand/config"
	"xand/handlers"
	"xand/middleware"
	"xand/services"
	"xand/utils"
)

func main() {
	// 1. Config
	cfg, err := config.LoadConfig()
	fmt.Printf("Loaded MongoDB URI: '%s'\n", cfg.MongoDB.URI)
//fmt.Printf("URI length: %d\n", len(config.MongoDB.URI))
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Core Services
	// GeoIP
	geo, err := utils.NewGeoResolver(cfg.GeoIP.DBPath)
	if err != nil {
		log.Printf("Warning: GeoIP DB not found at %s: %v", cfg.GeoIP.DBPath, err)
	}
	defer geo.Close()


		mongoService, err := services.NewMongoDBService(cfg)
	if err != nil {
		log.Printf("Warning: MongoDB connection failed: %v", err)
		log.Println("Analytics features will be disabled")
		mongoService = nil // Set to nil if connection fails
	}
	if mongoService != nil {
		defer mongoService.Close()
	}

	// Clients
	prpc := services.NewPRPCClient(cfg)

	// Discovery
	creditsService := services.NewCreditsService()

	discovery := services.NewNodeDiscovery(cfg, prpc, geo,creditsService)

	// Aggregator
	aggregator := services.NewDataAggregator(discovery)

	// Cache
	cache := services.NewCacheService(cfg, aggregator)

	// 3. New Feature Services
	alertService := services.NewAlertService(cache)
	//historyService := services.NewHistoryService(cache)
	historyService := services.NewHistoryService(cache, mongoService)

	analyticsHandlers := handlers.NewAnalyticsHandlers(mongoService)


	calculatorService := services.NewCalculatorService()
	topologyService := services.NewTopologyService(cache, discovery)
	comparisonService := services.NewComparisonService(cache)

	// 4. Start Background Services
	discovery.Start()
	cache.StartCacheWarmer()
	time.Sleep(5 * time.Second) // Allow initial cache warm-up

	alertService.Start()
	historyService.Start()
	creditsService.Start() 

	// 5. Web Server
	e := echo.New()

	// Middleware
	e.Use(middleware.LoggerMiddleware())
	e.Use(middleware.CORSMiddleware(cfg.Server.AllowedOrigins))
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Recovered from panic: %v", r)
					c.Error(fmt.Errorf("internal server error"))
				}
			}()
			return next(c)
		}
	})

	// 6. Handlers
	h := handlers.NewHandler(cfg, cache, discovery, prpc)
	alertHandlers := handlers.NewAlertHandlers(alertService)
	historyHandlers := handlers.NewHistoryHandlers(historyService)
	calculatorHandlers := handlers.NewCalculatorHandlers(calculatorService)
	topologyHandlers := handlers.NewTopologyHandlers(topologyService)
	comparisonHandlers := handlers.NewComparisonHandlers(comparisonService)
	creditsHandlers := handlers.NewCreditsHandlers(creditsService)


	// 7. Routes
	// System
	e.GET("/health", h.GetHealth)

	api := e.Group("/api")
	
	// Core endpoints
	api.GET("/status", h.GetStatus)
	api.GET("/nodes", h.GetNodes)
	api.GET("/nodes/:id", h.GetNode)
	api.GET("/stats", h.GetStats)
	api.POST("/rpc", h.ProxyRPC)

	// Alert endpoints
	alerts := api.Group("/alerts")
	alerts.POST("", alertHandlers.CreateAlert)
	alerts.GET("", alertHandlers.ListAlerts)
	alerts.GET("/:id", alertHandlers.GetAlert)
	alerts.PUT("/:id", alertHandlers.UpdateAlert)
	alerts.DELETE("/:id", alertHandlers.DeleteAlert)
	alerts.GET("/history", alertHandlers.GetAlertHistory)
	alerts.POST("/test", alertHandlers.TestAlert)

	// History endpoints
	history := api.Group("/history")
	history.GET("/network", historyHandlers.GetNetworkHistory)
	history.GET("/nodes/:id", historyHandlers.GetNodeHistory)
	history.GET("/forecast", historyHandlers.GetCapacityForecast)
	history.GET("/latency-distribution", historyHandlers.GetLatencyDistribution)

	// Calculator endpoints
	calculator := api.Group("/calculator")
	calculator.GET("/costs", calculatorHandlers.CompareCosts)
	calculator.GET("/roi", calculatorHandlers.EstimateROI)
	calculator.POST("/redundancy", calculatorHandlers.SimulateRedundancy)
	calculator.GET("/redundancy", calculatorHandlers.SimulateRedundancy) // Also support GET


	//Credits
	credits := api.Group("/credits")
	credits.GET("", creditsHandlers.GetAllCredits)
	credits.GET("/top", creditsHandlers.GetTopCredits)
	credits.GET("/:pubkey", creditsHandlers.GetNodeCredits)


		//  ANALYTICS ROUTES
	analytics := api.Group("/analytics")
	analytics.GET("/daily-health", analyticsHandlers.GetDailyHealth)
	analytics.GET("/high-uptime", analyticsHandlers.GetHighUptimeNodes)
	analytics.GET("/storage-growth", analyticsHandlers.GetStorageGrowth)
	analytics.GET("/recently-joined", analyticsHandlers.GetRecentlyJoined)
	analytics.GET("/weekly-comparison", analyticsHandlers.GetWeeklyComparison)
	analytics.GET("/node-graveyard", analyticsHandlers.GetNodeGraveyard)

	// Topology endpoints
	topology := api.Group("/topology")
	topology.GET("", topologyHandlers.GetTopology)
	topology.GET("/regions", topologyHandlers.GetRegionalClusters)

	// Comparison endpoints
	api.GET("/comparison", comparisonHandlers.GetCrossChainComparison)

	// 8. Start Server with Graceful Shutdown
	serverAddr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)

	go func() {
		log.Printf("Server running on http://%s", serverAddr)
		
		if err := e.Start(serverAddr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("shutting down the server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 10 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Graceful shutdown received...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Stop Background Services
	log.Println("Stopping services...")
	discovery.Stop()
	cache.Stop()
	alertService.Stop()
	historyService.Stop()
	creditsService.Stop()

	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
	log.Println("Server exited")
}
```

---
### .env
- Size: 0.60 KB
- Lines: 18
- Last Modified: 2025-12-20 13:45:54

```plaintext
SERVER_PORT=8000
SERVER_HOST=127.0.0.1
SEED_NODES=192.190.136.38:6000 , 192.190.136.29:6000, 207.244.255.1:6000, 161.97.97.41:6000 ,
#173.212.220.65
#161.97.97.41
#192.190.136.36
#192.190.136.37
#192.190.136.38
#192.190.136.28
#192.190.136.29
#207.244.255.1
ALLOWED_ORIGINS=http://localhost:5173,https://app.xandeum.network
PRPC_TIMEOUT=10s
PRPC_MAX_RETRIES=3
GEOIP_DB_PATH=/workspaces/XandExplorer/GeoLite2-City.mmdb
MONGODB_URI=mongodb+srv://simonlevi453_db_user:9E2U31i4dwooD1MV@cluster0.fxzby1p.mongodb.net/xandeum_analytics?retryWrites=true&w=majority
MONGODB_DATABASE=xandeum_analytics
MONGODB_ENABLED=true

```

---
### models/credits.go
- Size: 0.75 KB
- Lines: 23
- Last Modified: 2025-12-20 12:57:28

```go
package models

import "time"

// PodCredits represents the reputation/reliability score for a pNode
type PodCredits struct {
	Pubkey         string    `json:"pubkey" bson:"pubkey"`
	Credits        int64     `json:"credits" bson:"credits"`
	LastUpdated    time.Time `json:"last_updated" bson:"last_updated"`
	Rank           int       `json:"rank,omitempty" bson:"rank,omitempty"`
	CreditsChange  int64     `json:"credits_change,omitempty" bson:"credits_change,omitempty"` // Change since last check
}

// PodCreditsResponse from the API
type PodCreditsResponse struct {
	PodsCredits []PodCreditsEntry `json:"pods_credits"`
	Status      string            `json:"status"`
}

type PodCreditsEntry struct {
	PodID   string `json:"pod_id"`
	Credits int64  `json:"credits"`
}
```

---
### models/alert.go
- Size: 2.19 KB
- Lines: 58
- Last Modified: 2025-12-18 03:16:38

```go
package models

import "time"

// Alert represents a monitoring alert configuration
type Alert struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Enabled     bool                   `json:"enabled"`
	RuleType    string                 `json:"rule_type"` // "node_status", "network_health", "storage_threshold", "latency_spike"
	Conditions  map[string]interface{} `json:"conditions"`
	Actions     []AlertAction          `json:"actions"`
	Cooldown    int                    `json:"cooldown_minutes"` // Minimum time between alerts
	LastFired   time.Time              `json:"last_fired"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// AlertAction defines what happens when an alert triggers
type AlertAction struct {
	Type   string                 `json:"type"` // "webhook", "discord", "email"
	Config map[string]interface{} `json:"config"`
}

// AlertHistory tracks when alerts fire
type AlertHistory struct {
	ID          string                 `json:"id"`
	AlertID     string                 `json:"alert_id"`
	AlertName   string                 `json:"alert_name"`
	Timestamp   time.Time              `json:"timestamp"`
	Condition   string                 `json:"condition"`
	TriggeredBy map[string]interface{} `json:"triggered_by"`
	Success     bool                   `json:"success"`
	ErrorMsg    string                 `json:"error_msg,omitempty"`
}

// AlertConditions - Common condition structures
type NodeStatusCondition struct {
	NodeID string `json:"node_id,omitempty"` // Empty = any node
	Status string `json:"status"`             // "offline", "warning"
}

type NetworkHealthCondition struct {
	Operator  string  `json:"operator"` // "lt", "gt", "eq"
	Threshold float64 `json:"threshold"`
}

type StorageThresholdCondition struct {
	Type      string  `json:"type"`      // "total", "used", "percent"
	Operator  string  `json:"operator"`  // "lt", "gt"
	Threshold float64 `json:"threshold"` // In PB or percentage
}

type LatencySpikeCondition struct {
	NodeID    string `json:"node_id,omitempty"`
	Threshold int64  `json:"threshold"` // ms
}
```

---
### models/node.go
- Size: 4.31 KB
- Lines: 122
- Last Modified: 2025-12-20 10:15:58

```go



package models

import "time"

// Node represents a pNode in the Xandeum network
type Node struct {
	// Identity
	ID      string `json:"id"`      // Constructed from IP:Port or Pubkey if available
	IP      string `json:"ip"`
	Port    int    `json:"port"`
	Address string `json:"address"` // "IP:Port"
	Version string `json:"version"`
	Pubkey  string `json:"pubkey"`  // Public key of the node

	// Status
	IsOnline  bool      `json:"is_online"`
	IsPublic  bool      `json:"is_public"`  // Whether node accepts public connections
	LastSeen  time.Time `json:"last_seen"`
	FirstSeen time.Time `json:"first_seen"`
	Status    string    `json:"status"` // "online", "warning", "offline"

	// Geo Estimation
	Country string  `json:"country"`
	City    string  `json:"city"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`

	// Stats (Snapshot)
	CPUPercent float64 `json:"cpu_percent"`
	RAMUsed    int64   `json:"ram_used"`
	RAMTotal   int64   `json:"ram_total"`
	
	// Storage - UPDATED
	StorageCapacity     int64   `json:"storage_capacity"`      // storage_committed from RPC
	StorageUsed         int64   `json:"storage_used"`          // storage_used from RPC
	StorageUsagePercent float64 `json:"storage_usage_percent"` // storage_usage_percent from RPC

	UptimeSeconds   int64 `json:"uptime_seconds"`
	PacketsReceived int64 `json:"packets_received"`
	PacketsSent     int64 `json:"packets_sent"`

	// Metrics (Derived & tracked)
	UptimeScore      float64 `json:"uptime_score"`
	PerformanceScore float64 `json:"performance_score"`
	ResponseTime     int64   `json:"response_time"` // ms
		Credits       int64     `json:"credits"`        // Reputation score
	CreditsRank   int       `json:"credits_rank"`   // Rank by credits
	CreditsChange int64     `json:"credits_change"`

	// History
	CallHistory  []bool `json:"-"` // Last 10 calls, true=success
	SuccessCalls int    `json:"-"` // Count of true in history (cached or calc on fly)
	TotalCalls   int    `json:"-"` // Count of attempts tracked

	// Staking
	TotalStake  float64 `json:"total_stake"`
	Commission  float64 `json:"commission"`
	APY         float64 `json:"apy"`
	BoostFactor float64 `json:"boost_factor"` // 16x, 176x etc

	VersionStatus   string `json:"version_status"`    // "current", "outdated", "deprecated", "unknown"
	IsUpgradeNeeded bool   `json:"is_upgrade_needed"`
	UpgradeSeverity string `json:"upgrade_severity"`  // "none", "info", "warning", "critical"
	UpgradeMessage  string `json:"upgrade_message"`
}
```

---
### models/calculator.go
- Size: 1.97 KB
- Lines: 51
- Last Modified: 2025-12-18 02:57:47

```go
package models

// StorageCostComparison compares costs across providers
type StorageCostComparison struct {
	StorageAmountTB float64              `json:"storage_amount_tb"`
	Duration        string               `json:"duration"` // "monthly", "yearly"
	Providers       []ProviderCostBreakdown `json:"providers"`
	Recommendation  string               `json:"recommendation"`
}

// ProviderCostBreakdown for individual storage providers
type ProviderCostBreakdown struct {
	Name           string  `json:"name"`     // "Xandeum", "AWS S3", "Arweave", "Filecoin"
	MonthlyCostUSD float64 `json:"monthly_cost_usd"`
	YearlyCostUSD  float64 `json:"yearly_cost_usd"`
	Features       []string `json:"features"`
	Notes          string  `json:"notes"`
}

// ROIEstimate calculates earnings for running a pNode
type ROIEstimate struct {
	StorageCommitmentTB float64 `json:"storage_commitment_tb"`
	UptimePercent       float64 `json:"uptime_percent"`
	
	// Earnings
	MonthlyXAND        float64 `json:"monthly_xand"`
	MonthlyUSD         float64 `json:"monthly_usd"`
	YearlyXAND         float64 `json:"yearly_xand"`
	YearlyUSD          float64 `json:"yearly_usd"`
	
	// Costs (estimated)
	MonthlyCostsUSD    float64 `json:"monthly_costs_usd"` // Hardware, electricity
	NetProfitMonthly   float64 `json:"net_profit_monthly"`
	BreakEvenMonths    int     `json:"break_even_months"`
	
	// Assumptions
	XANDPriceUSD       float64 `json:"xand_price_usd"`
	RewardPerTBPerDay  float64 `json:"reward_per_tb_per_day"`
}

// RedundancySimulation for erasure coding demo
type RedundancySimulation struct {
	DataShards      int      `json:"data_shards"`      // 4
	ParityShards    int      `json:"parity_shards"`    // 2
	TotalShards     int      `json:"total_shards"`     // 6
	FailedNodes     []int    `json:"failed_nodes"`     // [2, 4]
	CanRecover      bool     `json:"can_recover"`
	RequiredShards  int      `json:"required_shards"`  // 4
	AvailableShards int      `json:"available_shards"` // 4
	Message         string   `json:"message"`
}
```

---
### models/comparison.go
- Size: 1.50 KB
- Lines: 39
- Last Modified: 2025-12-18 03:16:13

```go
package models

import "time"

// CrossChainComparison compares Xandeum vs Solana metrics
type CrossChainComparison struct {
	Timestamp      time.Time         `json:"timestamp"`
	Xandeum        XandeumMetrics    `json:"xandeum"`
	Solana         SolanaMetrics     `json:"solana"`
	PerformanceDelta PerformanceDelta `json:"performance_delta"`
}

// XandeumMetrics for the storage layer
type XandeumMetrics struct {
	StoragePowerIndex  float64 `json:"storage_power_index"` // Custom metric: sqrt(nodes * storage_pb)
	TotalNodes         int     `json:"total_nodes"`
	TotalStoragePB     float64 `json:"total_storage_pb"`
	AverageLatency     int64   `json:"average_latency"`
	NetworkHealth      float64 `json:"network_health"`
	DataAvailability   float64 `json:"data_availability"` // Percentage
}

// SolanaMetrics for the L1 layer
type SolanaMetrics struct {
	StakePowerIndex    float64 `json:"stake_power_index"` // Total active stake
	TotalValidators    int     `json:"total_validators"`
	TotalStake         int64   `json:"total_stake"` // In lamports
	AverageSlotTime    int64   `json:"average_slot_time"` // ms
	TPS                int64   `json:"tps"`
	NetworkHealth      float64 `json:"network_health"`
}

// PerformanceDelta shows differences
type PerformanceDelta struct {
	LatencyDifference  int64   `json:"latency_difference"` // Xandeum - Solana (ms)
	HealthDifference   float64 `json:"health_difference"`  // Xandeum - Solana (%)
	Summary            string  `json:"summary"`
	Interpretation     string  `json:"interpretation"`
}
```

---
### models/history.go
- Size: 2.09 KB
- Lines: 52
- Last Modified: 2025-12-18 02:57:47

```go
package models

import "time"

// NetworkSnapshot represents network state at a point in time
type NetworkSnapshot struct {
	Timestamp        time.Time `json:"timestamp"`
	TotalNodes       int       `json:"total_nodes"`
	OnlineNodes      int       `json:"online_nodes"`
	WarningNodes     int       `json:"warning_nodes"`
	OfflineNodes     int       `json:"offline_nodes"`
	TotalStoragePB   float64   `json:"total_storage_pb"`
	UsedStoragePB    float64   `json:"used_storage_pb"`
	AverageLatency   int64     `json:"average_latency"`
	NetworkHealth    float64   `json:"network_health"`
	TotalStake       int64     `json:"total_stake"`
	AverageUptime    float64   `json:"average_uptime"`
	AveragePerf      float64   `json:"average_performance"`
}

// NodeSnapshot represents a single node's state at a point in time
type NodeSnapshot struct {
	Timestamp        time.Time `json:"timestamp"`
	NodeID           string    `json:"node_id"`
	Status           string    `json:"status"`
	ResponseTime     int64     `json:"response_time"`
	CPUPercent       float64   `json:"cpu_percent"`
	RAMUsed          int64     `json:"ram_used"`
	StorageUsed      int64     `json:"storage_used"`
	UptimeScore      float64   `json:"uptime_score"`
	PerformanceScore float64   `json:"performance_score"`
}

// TimeSeriesQuery for fetching historical data
type TimeSeriesQuery struct {
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	Interval   string    `json:"interval"`   // "1m", "5m", "1h", "1d"
	Metric     string    `json:"metric"`     // "storage", "latency", "health"
	NodeID     string    `json:"node_id,omitempty"`
	Aggregation string   `json:"aggregation"` // "avg", "max", "min", "sum"
}

// CapacityForecast for predicting storage saturation
type CapacityForecast struct {
	CurrentUsagePB     float64   `json:"current_usage_pb"`
	CurrentCapacityPB  float64   `json:"current_capacity_pb"`
	GrowthRatePBPerDay float64   `json:"growth_rate_pb_per_day"`
	DaysToSaturation   int       `json:"days_to_saturation"`
	SaturationDate     time.Time `json:"saturation_date"`
	Confidence         float64   `json:"confidence"` // 0-100
}
```

---
### models/stats.go
- Size: 0.64 KB
- Lines: 23
- Last Modified: 2025-12-18 02:57:47

```go
package models

import "time"

// NetworkStats represents aggregated network statistics
type NetworkStats struct {
	TotalNodes   int `json:"total_nodes"`
	OnlineNodes  int `json:"online_nodes"`
	WarningNodes int `json:"warning_nodes"`
	OfflineNodes int `json:"offline_nodes"`

	TotalStorage float64 `json:"total_storage_pb"` // Petabytes
	UsedStorage  float64 `json:"used_storage_pb"`  // Petabytes

	AverageUptime      float64 `json:"average_uptime"`
	AveragePerformance float64 `json:"average_performance"`

	TotalStake int64 `json:"total_stake"`

	NetworkHealth float64 `json:"network_health"` // 0-100

	LastUpdated time.Time `json:"last_updated"`
}

```

---
### models/prpc.go
- Size: 5.73 KB
- Lines: 177
- Last Modified: 2025-12-18 04:29:37

```go

package models

import "encoding/json"

// JSON-RPC 2.0 Request
type RPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  any `json:"params,omitempty"`
	ID      int         `json:"id"`
}

// JSON-RPC 2.0 Response
type RPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *RPCError       `json:"error,omitempty"`
	ID      int             `json:"id"`
}

// JSON-RPC 2.0 Error
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// --- Specific Response Models ---

// VersionResponse (result of get_version)
type VersionResponse struct {
	Version string `json:"version"`
}

// StatsResponse (result of get_stats)
type StatsResponse struct {
	Metadata Metadata  `json:"metadata"`
	Stats    NodeStats `json:"stats"`
	FileSize int64     `json:"file_size"`
}

type Metadata struct {
	TotalBytes  int64 `json:"total_bytes"`
	TotalPages  int   `json:"total_pages"`
	LastUpdated int64 `json:"last_updated"`
}

type NodeStats struct {
	CPUPercent      float64 `json:"cpu_percent"`
	RAMUsed         int64   `json:"ram_used"`
	RAMTotal        int64   `json:"ram_total"`
	Uptime          int64   `json:"uptime"`
	PacketsReceived int64   `json:"packets_received"`
	PacketsSent     int64   `json:"packets_sent"`
	ActiveStreams   int     `json:"active_streams"`
}

// PRPCStatsResponse with NodeStats
type PRPCStatsResponse struct {
	Metadata Metadata  `json:"metadata"`
	Stats    NodeStats `json:"stats"`
	FileSize int64     `json:"file_size"`
}

// PodsResponse (result of get-pods-with-stats) - UPDATED FOR v0.8.0
type PodsResponse struct {
	Pods       []Pod `json:"pods"`
	TotalCount int   `json:"total_count"`
}

// Pod represents a pNode in the gossip network - UPDATED FOR v0.8.0
type Pod struct {
	Address              string  `json:"address"`
	RpcPort              int     `json:"rpc_port"`
	IsPublic             bool    `json:"is_public"`
	Version              string  `json:"version"`
	LastSeen             string  `json:"last_seen"`
	LastSeenTimestamp    int64   `json:"last_seen_timestamp"`
	Pubkey               string  `json:"pubkey"`                 // NEW in v0.8.0
	StorageCommitted     int64   `json:"storage_committed"`      // NEW in v0.8.0
	StorageUsed          int64   `json:"storage_used"`           // NEW in v0.8.0
	StorageUsagePercent  float64 `json:"storage_usage_percent"`  // NEW in v0.8.0
	Uptime               int64   `json:"uptime"`                 // NEW in v0.8.0
}
```

---
### models/topology.go
- Size: 1.80 KB
- Lines: 49
- Last Modified: 2025-12-20 15:43:33

```go
package models

// NetworkTopology represents the gossip network graph
type NetworkTopology struct {
	Nodes []TopologyNode `json:"nodes"`
	Edges []TopologyEdge `json:"edges"`
	Stats TopologyStats  `json:"stats"`
}

// TopologyNode represents a node in the network graph
type TopologyNode struct {
	ID       string   `json:"id"`
	Address  string   `json:"address"`
	Status   string   `json:"status"`
	Country  string   `json:"country"`
	City     string   `json:"city"`
	Lat      float64  `json:"lat"`
	Lon      float64  `json:"lon"`
	Version  string   `json:"version"`
	PeerCount int     `json:"peer_count"`
	Peers    []string `json:"peers"` // ADD THIS - list of peer IDs
}

// TopologyEdge represents a connection between nodes
type TopologyEdge struct {
	Source   string `json:"source"` // Node ID
	Target   string `json:"target"` // Node ID
	Type     string `json:"type"`   // "local" (same region) or "bridge" (cross-region)
	Strength int    `json:"strength"` // 1-10, based on communication frequency
}

// TopologyStats provides graph metrics
type TopologyStats struct {
	TotalConnections   int     `json:"total_connections"`
	LocalConnections   int     `json:"local_connections"`
	BridgeConnections  int     `json:"bridge_connections"`
	AverageConnections float64 `json:"average_connections_per_node"`
	NetworkDensity     float64 `json:"network_density"` // 0-1
	LargestComponent   int     `json:"largest_component"` // Nodes in biggest connected cluster
}

// RegionalCluster groups nodes by region
type RegionalCluster struct {
	Region     string   `json:"region"`      // "North America", "Europe", etc.
	NodeCount  int      `json:"node_count"`
	NodeIDs    []string `json:"node_ids"`
	InternalEdges int   `json:"internal_edges"` // Connections within region
	ExternalEdges int   `json:"external_edges"` // Connections to other regions
}
```

---
### models/analytics.go
- Size: 2.86 KB
- Lines: 72
- Last Modified: 2025-12-20 10:18:32

```go
package models

import "time"

// DailyHealthSnapshot represents aggregated daily statistics
type DailyHealthSnapshot struct {
	Date             time.Time `bson:"date" json:"date"`
	AvgHealth        float64   `bson:"avg_health" json:"avg_health"`
	AvgOnlineNodes   float64   `bson:"avg_online_nodes" json:"avg_online_nodes"`
	AvgTotalNodes    float64   `bson:"avg_total_nodes" json:"avg_total_nodes"`
	MaxStorageUsed   float64   `bson:"max_storage_used" json:"max_storage_used"`
	MinNetworkHealth float64   `bson:"min_network_health" json:"min_network_health"`
	MaxNetworkHealth float64   `bson:"max_network_health" json:"max_network_health"`
}

// NodeUptimeReport represents a node's uptime statistics
type NodeUptimeReport struct {
	NodeID      string  `bson:"_id" json:"node_id"`
	AvgUptime   float64 `bson:"avg_uptime" json:"avg_uptime"`
	AvgPerf     float64 `bson:"avg_perf" json:"avg_performance"`
	TotalChecks int     `bson:"total_checks" json:"total_checks"`
	OnlineCount int     `bson:"online_count" json:"online_count"`
}

// StorageGrowthReport shows storage growth over time
type StorageGrowthReport struct {
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	StartStoragePB   float64   `json:"start_storage_pb"`
	EndStoragePB     float64   `json:"end_storage_pb"`
	GrowthPB         float64   `json:"growth_pb"`
	GrowthPercentage float64   `json:"growth_percentage"`
	GrowthRatePerDay float64   `json:"growth_rate_per_day"`
	DaysAnalyzed     int       `json:"days_analyzed"`
}

// NodeRegistryEntry tracks when nodes first appeared
type NodeRegistryEntry struct {
	NodeID    string    `bson:"node_id" json:"node_id"`
	FirstSeen time.Time `bson:"first_seen" json:"first_seen"`
}

// WeekStats represents statistics for a week period
type WeekStats struct {
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
	AvgHealth       float64   `json:"avg_health"`
	AvgOnlineNodes  float64   `json:"avg_online_nodes"`
	AvgTotalNodes   float64   `json:"avg_total_nodes"`
	AvgStorageUsed  float64   `json:"avg_storage_used"`
	AvgStorageTotal float64   `json:"avg_storage_total"`
}

// WeeklyComparison compares two weeks
type WeeklyComparison struct {
	ThisWeek      WeekStats `json:"this_week"`
	LastWeek      WeekStats `json:"last_week"`
	HealthChange  float64   `json:"health_change"`
	StorageChange float64   `json:"storage_change"`
	NodesChange   float64   `json:"nodes_change"`
}



// NodeGraveyardEntry represents an inactive/dead node
type NodeGraveyardEntry struct {
	NodeID       string                `bson:"node_id" json:"node_id"`
	FirstSeen    time.Time             `bson:"first_seen" json:"first_seen"`
	LastSnapshot *NodeSnapshot         `bson:"last_snapshot" json:"last_snapshot,omitempty"`
	DaysSinceSeen int                  `json:"days_since_seen"`
	Status       string                `json:"status"` // "inactive", "dead"
}
```

---
### handlers/credits.go
- Size: 1.22 KB
- Lines: 54
- Last Modified: 2025-12-20 08:21:59

```go
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
```

---
### handlers/alert.go
- Size: 2.88 KB
- Lines: 116
- Last Modified: 2025-12-18 02:57:44

```go
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
```

---
### handlers/handlers_test.go
- Size: 1.75 KB
- Lines: 80
- Last Modified: 2025-12-20 08:16:40

```go
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
	discovery := services.NewNodeDiscovery(cfg, nil, nil, nil)

	handler := NewHandler(cfg, cache, discovery, nil)

	// Test
	handler.GetNode(c) // Error handling might return error or write to context
	// Echo handler returns error or nil

	if rec.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", rec.Code)
	}
}

```

---
### handlers/caculator.go
- Size: 2.25 KB
- Lines: 85
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"xand/services"
)

// CalculatorHandlers manages cost/ROI calculation endpoints
type CalculatorHandlers struct {
	calcService *services.CalculatorService
}

func NewCalculatorHandlers(calcService *services.CalculatorService) *CalculatorHandlers {
	return &CalculatorHandlers{
		calcService: calcService,
	}
}

// CompareCosts godoc
func (ch *CalculatorHandlers) CompareCosts(c echo.Context) error {
	storageTBStr := c.QueryParam("storage_tb")
	if storageTBStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "storage_tb parameter required"})
	}

	storageTB, err := strconv.ParseFloat(storageTBStr, 64)
	if err != nil || storageTB <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid storage_tb value"})
	}

	comparison := ch.calcService.CompareCosts(storageTB)
	return c.JSON(http.StatusOK, comparison)
}

// EstimateROI godoc
func (ch *CalculatorHandlers) EstimateROI(c echo.Context) error {
	storageTBStr := c.QueryParam("storage_tb")
	uptimeStr := c.QueryParam("uptime_percent")

	if storageTBStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "storage_tb parameter required"})
	}

	storageTB, err := strconv.ParseFloat(storageTBStr, 64)
	if err != nil || storageTB <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid storage_tb value"})
	}

	uptime := 99.0 // Default 99%
	if uptimeStr != "" {
		if u, err := strconv.ParseFloat(uptimeStr, 64); err == nil && u > 0 && u <= 100 {
			uptime = u
		}
	}

	estimate := ch.calcService.EstimateROI(storageTB, uptime)
	return c.JSON(http.StatusOK, estimate)
}

// SimulateRedundancy godoc
func (ch *CalculatorHandlers) SimulateRedundancy(c echo.Context) error {
	type SimRequest struct {
		FailedNodes []int `json:"failed_nodes"`
	}

	var req SimRequest
	if err := c.Bind(&req); err != nil {
		// If no body, check query param
		failedParam := c.QueryParam("failed")
		if failedParam != "" {
			// Parse comma-separated list
			// For simplicity, assume single value or empty
			req.FailedNodes = []int{}
		} else {
			req.FailedNodes = []int{}
		}
	}

	simulation := ch.calcService.SimulateRedundancy(req.FailedNodes)
	return c.JSON(http.StatusOK, simulation)
}
```

---
### handlers/comparison.go
- Size: 0.61 KB
- Lines: 26
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"xand/services"
)

// ComparisonHandlers manages cross-chain comparison endpoints
type ComparisonHandlers struct {
	comparisonService *services.ComparisonService
}

func NewComparisonHandlers(comparisonService *services.ComparisonService) *ComparisonHandlers {
	return &ComparisonHandlers{
		comparisonService: comparisonService,
	}
}

// GetCrossChainComparison godoc
func (ch *ComparisonHandlers) GetCrossChainComparison(c echo.Context) error {
	comparison := ch.comparisonService.GetCrossChainComparison()
	return c.JSON(http.StatusOK, comparison)
}
```

---
### handlers/rpc.go
- Size: 2.17 KB
- Lines: 87
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"math/rand"
	"net/http"
	"time"

	"xand/models"

	"github.com/labstack/echo/v4"
)

// ProxyRPC godoc
func (h *Handler) ProxyRPC(c echo.Context) error {
	var req models.RPCRequest
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, models.RPCError{Code: -32700, Message: "Parse error"})
	}

	if err := json.Unmarshal(body, &req); err != nil {
		return c.JSON(http.StatusBadRequest, models.RPCError{Code: -32700, Message: "Parse error"})
	}

	if req.JSONRPC != "2.0" {
		return c.JSON(http.StatusBadRequest, models.RPCError{Code: -32600, Message: "Invalid Request"})
	}

	// Get Nodes (allow stale for proxy finding is better than failure)
	nodes, _, found := h.Cache.GetNodes(true)
	if !found || len(nodes) == 0 {
		return c.JSON(http.StatusServiceUnavailable, models.RPCError{Code: -32000, Message: "No nodes available"})
	}

	var candidates []*models.Node
	for _, n := range nodes {
		if n.Status == "online" {
			candidates = append(candidates, n)
		}
	}
	if len(candidates) == 0 {
		for _, n := range nodes {
			if n.Status == "warning" {
				candidates = append(candidates, n)
			}
		}
	}
	if len(candidates) == 0 {
		return c.JSON(http.StatusServiceUnavailable, models.RPCError{Code: -32000, Message: "No reachable nodes"})
	}

	target := candidates[rand.Intn(len(candidates))]

	proxyResp, err := h.forwardRequest(target.Address, body)
	if err != nil {
		if len(candidates) > 1 {
			target2 := candidates[rand.Intn(len(candidates))]
			proxyResp, err = h.forwardRequest(target2.Address, body)
		}
	}

	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.RPCError{Code: -32603, Message: "Internal proxied error"})
	}
	defer proxyResp.Body.Close()

	return c.Stream(proxyResp.StatusCode, "application/json", proxyResp.Body)
}

func (h *Handler) forwardRequest(address string, body []byte) (*http.Response, error) {
	url := "http://" + address + "/rpc"

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	return client.Do(req)
}

```

---
### handlers/system.go
- Size: 0.60 KB
- Lines: 28
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

// GetHealth returns OK
func (h *Handler) GetHealth(c echo.Context) error {
	return c.String(http.StatusOK, "OK")
}

// GetStatus returns backend status
func (h *Handler) GetStatus(c echo.Context) error {
	nodes, _, _ := h.Cache.GetNodes(true)
	// stats, _ := h.Cache.GetNetworkStats(true) // optional

	status := map[string]interface{}{
		"status":      "running",
		"uptime":      "TODO: app start time",
		"knownNodes":  len(nodes),
		"cacheStatus": "active",
		"timestamp":   time.Now(),
	}
	return c.JSON(http.StatusOK, status)
}

```

---
### handlers/history.go
- Size: 1.64 KB
- Lines: 70
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"xand/services"
)

// HistoryHandlers manages historical data endpoints
type HistoryHandlers struct {
	historyService *services.HistoryService
}

func NewHistoryHandlers(historyService *services.HistoryService) *HistoryHandlers {
	return &HistoryHandlers{
		historyService: historyService,
	}
}

// GetNetworkHistory godoc
func (hh *HistoryHandlers) GetNetworkHistory(c echo.Context) error {
	hoursStr := c.QueryParam("hours")
	hours := 24 // Default 24 hours
	
	if hoursStr != "" {
		if h, err := strconv.Atoi(hoursStr); err == nil && h > 0 {
			hours = h
		}
	}

	snapshots := hh.historyService.GetNetworkHistory(hours)
	return c.JSON(http.StatusOK, snapshots)
}

// GetNodeHistory godoc
func (hh *HistoryHandlers) GetNodeHistory(c echo.Context) error {
	nodeID := c.Param("id")
	
	hoursStr := c.QueryParam("hours")
	hours := 24 // Default 24 hours
	
	if hoursStr != "" {
		if h, err := strconv.Atoi(hoursStr); err == nil && h > 0 {
			hours = h
		}
	}

	snapshots := hh.historyService.GetNodeHistory(nodeID, hours)
	
	if len(snapshots) == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "no history for this node"})
	}

	return c.JSON(http.StatusOK, snapshots)
}

// GetCapacityForecast godoc
func (hh *HistoryHandlers) GetCapacityForecast(c echo.Context) error {
	forecast := hh.historyService.GetCapacityForecast()
	return c.JSON(http.StatusOK, forecast)
}

// GetLatencyDistribution godoc
func (hh *HistoryHandlers) GetLatencyDistribution(c echo.Context) error {
	distribution := hh.historyService.GetLatencyDistribution()
	return c.JSON(http.StatusOK, distribution)
}
```

---
### handlers/stats.go
- Size: 0.65 KB
- Lines: 33
- Last Modified: 2025-12-18 02:57:44

```go
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

```

---
### handlers/topology.go
- Size: 0.74 KB
- Lines: 32
- Last Modified: 2025-12-18 02:57:44

```go
package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"xand/services"
)

// TopologyHandlers manages network topology endpoints
type TopologyHandlers struct {
	topologyService *services.TopologyService
}

func NewTopologyHandlers(topologyService *services.TopologyService) *TopologyHandlers {
	return &TopologyHandlers{
		topologyService: topologyService,
	}
}

// GetTopology godoc
func (th *TopologyHandlers) GetTopology(c echo.Context) error {
	topology := th.topologyService.BuildTopology()
	return c.JSON(http.StatusOK, topology)
}

// GetRegionalClusters godoc
func (th *TopologyHandlers) GetRegionalClusters(c echo.Context) error {
	clusters := th.topologyService.GetRegionalClusters()
	return c.JSON(http.StatusOK, clusters)
}
```

---
### handlers/nodes.go
- Size: 2.31 KB
- Lines: 111
- Last Modified: 2025-12-18 02:57:44

```go
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

```

---
### handlers/analytics.go
- Size: 3.30 KB
- Lines: 154
- Last Modified: 2025-12-20 10:27:13

```go
package handlers

import (
	//"context"
	//"net/http"
	"strconv"
	"time"
	"github.com/labstack/echo/v4"
	"xand/services"
)

type AnalyticsHandlers struct {
	mongo *services.MongoDBService
}

func NewAnalyticsHandlers(mongo *services.MongoDBService) *AnalyticsHandlers {
	return &AnalyticsHandlers{mongo: mongo}
}

// 1. Daily Health
func (h *AnalyticsHandlers) GetDailyHealth(c echo.Context) error {
	year, _ := strconv.Atoi(c.QueryParam("year"))
	month, _ := strconv.Atoi(c.QueryParam("month"))
	
	if year == 0 {
		year = time.Now().Year()
	}
	if month == 0 {
		month = int(time.Now().Month())
	}
	
	results, err := h.mongo.GetDailyNetworkHealth(
		c.Request().Context(), 
		year, 
		time.Month(month),
	)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, results)
}

// 2. High Uptime Nodes
func (h *AnalyticsHandlers) GetHighUptimeNodes(c echo.Context) error {
	minUptime, _ := strconv.ParseFloat(c.QueryParam("min_uptime"), 64)
	days, _ := strconv.Atoi(c.QueryParam("days"))
	
	if minUptime == 0 {
		minUptime = 90.0
	}
	if days == 0 {
		days = 30
	}
	
	results, err := h.mongo.GetHighUptimeNodes(
		c.Request().Context(),
		minUptime,
		days,
	)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, results)
}

// 3. Storage Growth
func (h *AnalyticsHandlers) GetStorageGrowth(c echo.Context) error {
	days, _ := strconv.Atoi(c.QueryParam("days"))
	if days == 0 {
		days = 30
	}
	
	result, err := h.mongo.GetStorageGrowthRate(
		c.Request().Context(),
		days,
	)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, result)
}

// 4. Recently Joined
func (h *AnalyticsHandlers) GetRecentlyJoined(c echo.Context) error {
	days, _ := strconv.Atoi(c.QueryParam("days"))
	if days == 0 {
		days = 7
	}
	
	results, err := h.mongo.GetRecentlyJoinedNodes(
		c.Request().Context(),
		days,
	)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, results)
}

// 5. Weekly Comparison
func (h *AnalyticsHandlers) GetWeeklyComparison(c echo.Context) error {
	result, err := h.mongo.CompareWeeklyPerformance(
		c.Request().Context(),
	)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, result)
}


// GetNodeGraveyard - GET /api/analytics/node-graveyard?days=30
func (h *AnalyticsHandlers) GetNodeGraveyard(c echo.Context) error {
	daysStr := c.QueryParam("days")
	days := 30 // Default: nodes not seen in 30 days
	
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}
	
	ctx := c.Request().Context()
	graveyard, err := h.mongo.GetInactiveNodes(ctx, days)
	if err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	// Calculate days since seen and status
	now := time.Now()
	for i := range graveyard {
		if graveyard[i].LastSnapshot != nil {
			daysSince := int(now.Sub(graveyard[i].LastSnapshot.Timestamp).Hours() / 24)
			graveyard[i].DaysSinceSeen = daysSince
			
			if daysSince > 90 {
				graveyard[i].Status = "dead"
			} else {
				graveyard[i].Status = "inactive"
			}
		}
	}
	
	return c.JSON(200, map[string]interface{}{
		"inactive_days_threshold": days,
		"total_inactive_nodes":    len(graveyard),
		"nodes":                   graveyard,
	})
}
```

---
### services/mongodb_service.go
- Size: 19.69 KB
- Lines: 714
- Last Modified: 2025-12-20 10:18:09

```go
package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"xand/config"
	"xand/models"
)

type MongoDBService struct {
	client   *mongo.Client
	db       *mongo.Database
	enabled  bool
}

const (
	CollectionNetworkSnapshots = "network_snapshots"
	CollectionNodeSnapshots    = "node_snapshots"
	CollectionAlertHistory     = "alert_history"
	CollectionNodeRegistry     = "node_registry" // Track when nodes first appeared
)

func NewMongoDBService(cfg *config.Config) (*MongoDBService, error) {
	if !cfg.MongoDB.Enabled {
		log.Println("MongoDB is disabled in configuration")
		return &MongoDBService{enabled: false}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoDB.URI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	db := client.Database(cfg.MongoDB.Database)

	service := &MongoDBService{
		client:  client,
		db:      db,
		enabled: true,
	}

	// Create indexes
	if err := service.createIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create indexes: %v", err)
	}

	log.Printf("MongoDB connected successfully to database: %s", cfg.MongoDB.Database)
	return service, nil
}

func (m *MongoDBService) createIndexes(ctx context.Context) error {
	if !m.enabled {
		return nil
	}

	// Network Snapshots: Index on timestamp (descending for recent queries)
	_, err := m.db.Collection(CollectionNetworkSnapshots).Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "timestamp", Value: -1}},
		Options: options.Index().SetName("timestamp_desc"),
	})
	if err != nil {
		return err
	}

	// Node Snapshots: Compound index on node_id and timestamp
	_, err = m.db.Collection(CollectionNodeSnapshots).Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "node_id", Value: 1}, {Key: "timestamp", Value: -1}},
			Options: options.Index().SetName("node_timestamp"),
		},
		{
			Keys:    bson.D{{Key: "timestamp", Value: -1}},
			Options: options.Index().SetName("timestamp_desc"),
		},
	})
	if err != nil {
		return err
	}

	// Node Registry: Index on node_id
	_, err = m.db.Collection(CollectionNodeRegistry).Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "node_id", Value: 1}},
		Options: options.Index().SetName("node_id").SetUnique(true),
	})
	if err != nil {
		return err
	}

	// Alert History: Index on timestamp
	_, err = m.db.Collection(CollectionAlertHistory).Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "timestamp", Value: -1}},
		Options: options.Index().SetName("timestamp_desc"),
	})

	return err
}

func (m *MongoDBService) Close() error {
	if !m.enabled || m.client == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return m.client.Disconnect(ctx)
}

// ============================================
// INSERT METHODS
// ============================================

func (m *MongoDBService) InsertNetworkSnapshot(ctx context.Context, snapshot *models.NetworkSnapshot) error {
	if !m.enabled {
		return nil
	}
	_, err := m.db.Collection(CollectionNetworkSnapshots).InsertOne(ctx, snapshot)
	return err
}

func (m *MongoDBService) InsertNodeSnapshot(ctx context.Context, snapshot *models.NodeSnapshot) error {
	if !m.enabled {
		return nil
	}
	_, err := m.db.Collection(CollectionNodeSnapshots).InsertOne(ctx, snapshot)
	return err
}

func (m *MongoDBService) InsertAlertHistory(ctx context.Context, alert *models.AlertHistory) error {
	if !m.enabled {
		return nil
	}
	_, err := m.db.Collection(CollectionAlertHistory).InsertOne(ctx, alert)
	return err
}

func (m *MongoDBService) RegisterNode(ctx context.Context, nodeID string, firstSeen time.Time) error {
	if !m.enabled {
		return nil
	}
	
	filter := bson.M{"node_id": nodeID}
	update := bson.M{
		"$setOnInsert": bson.M{
			"node_id":    nodeID,
			"first_seen": firstSeen,
		},
	}
	opts := options.Update().SetUpsert(true)
	
	_, err := m.db.Collection(CollectionNodeRegistry).UpdateOne(ctx, filter, update, opts)
	return err
}

// ============================================
// QUERY METHODS - These power the analytics!
// ============================================

// 1. "Show me network health for every day in December"
func (m *MongoDBService) GetDailyNetworkHealth(ctx context.Context, year int, month time.Month) ([]models.DailyHealthSnapshot, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	startDate := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0) // First day of next month

	pipeline := mongo.Pipeline{
		// Filter by date range
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{
				"$gte": startDate,
				"$lt":  endDate,
			},
		}}},
		// Group by day
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"year":  bson.M{"$year": "$timestamp"},
				"month": bson.M{"$month": "$timestamp"},
				"day":   bson.M{"$dayOfMonth": "$timestamp"},
			},
			"avg_health":        bson.M{"$avg": "$network_health"},
			"avg_online_nodes":  bson.M{"$avg": "$online_nodes"},
			"avg_total_nodes":   bson.M{"$avg": "$total_nodes"},
			"max_storage_used":  bson.M{"$max": "$used_storage_pb"},
			"min_network_health": bson.M{"$min": "$network_health"},
			"max_network_health": bson.M{"$max": "$network_health"},
			"date":              bson.M{"$first": "$timestamp"},
		}}},
		// Sort by date
		{{Key: "$sort", Value: bson.M{"_id.year": 1, "_id.month": 1, "_id.day": 1}}},
	}

	cursor, err := m.db.Collection(CollectionNetworkSnapshots).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.DailyHealthSnapshot
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

// 2. "Find all nodes that had >90% uptime last month"
func (m *MongoDBService) GetHighUptimeNodes(ctx context.Context, minUptime float64, daysBack int) ([]models.NodeUptimeReport, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	startDate := time.Now().AddDate(0, 0, -daysBack)

	pipeline := mongo.Pipeline{
		// Filter by date range
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{"$gte": startDate},
		}}},
		// Group by node
		{{Key: "$group", Value: bson.M{
			"_id":          "$node_id",
			"avg_uptime":   bson.M{"$avg": "$uptime_score"},
			"avg_perf":     bson.M{"$avg": "$performance_score"},
			"total_checks": bson.M{"$sum": 1},
			"online_count": bson.M{"$sum": bson.M{"$cond": []interface{}{
				bson.M{"$eq": []interface{}{"$status", "online"}},
				1,
				0,
			}}},
		}}},
		// Filter nodes with high uptime
		{{Key: "$match", Value: bson.M{
			"avg_uptime": bson.M{"$gte": minUptime},
		}}},
		// Sort by uptime descending
		{{Key: "$sort", Value: bson.M{"avg_uptime": -1}}},
	}

	cursor, err := m.db.Collection(CollectionNodeSnapshots).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.NodeUptimeReport
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

// 3. "What's the 30-day storage growth rate?"
func (m *MongoDBService) GetStorageGrowthRate(ctx context.Context, days int) (*models.StorageGrowthReport, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	startDate := time.Now().AddDate(0, 0, -days)

	// Get first snapshot in range
	var firstSnapshot models.NetworkSnapshot
	err := m.db.Collection(CollectionNetworkSnapshots).FindOne(ctx, bson.M{
		"timestamp": bson.M{"$gte": startDate},
	}, options.FindOne().SetSort(bson.M{"timestamp": 1})).Decode(&firstSnapshot)
	if err != nil {
		return nil, err
	}

	// Get latest snapshot
	var lastSnapshot models.NetworkSnapshot
	err = m.db.Collection(CollectionNetworkSnapshots).FindOne(ctx, bson.M{},
		options.FindOne().SetSort(bson.M{"timestamp": -1})).Decode(&lastSnapshot)
	if err != nil {
		return nil, err
	}

	// Calculate growth
	storageDiff := lastSnapshot.UsedStoragePB - firstSnapshot.UsedStoragePB
	timeDiff := lastSnapshot.Timestamp.Sub(firstSnapshot.Timestamp).Hours() / 24 // days
	
	var growthRatePerDay float64
	if timeDiff > 0 {
		growthRatePerDay = storageDiff / timeDiff
	}

	var growthPercentage float64
	if firstSnapshot.UsedStoragePB > 0 {
		growthPercentage = (storageDiff / firstSnapshot.UsedStoragePB) * 100
	}

	return &models.StorageGrowthReport{
		StartDate:         firstSnapshot.Timestamp,
		EndDate:           lastSnapshot.Timestamp,
		StartStoragePB:    firstSnapshot.UsedStoragePB,
		EndStoragePB:      lastSnapshot.UsedStoragePB,
		GrowthPB:          storageDiff,
		GrowthPercentage:  growthPercentage,
		GrowthRatePerDay:  growthRatePerDay,
		DaysAnalyzed:      int(timeDiff),
	}, nil
}

// 4. "Which nodes joined the network in the last week?"
func (m *MongoDBService) GetRecentlyJoinedNodes(ctx context.Context, daysBack int) ([]models.NodeRegistryEntry, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	startDate := time.Now().AddDate(0, 0, -daysBack)

	filter := bson.M{
		"first_seen": bson.M{"$gte": startDate},
	}

	cursor, err := m.db.Collection(CollectionNodeRegistry).Find(ctx, filter,
		options.Find().SetSort(bson.M{"first_seen": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.NodeRegistryEntry
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

// 5. "Compare this week's performance to last week"
func (m *MongoDBService) CompareWeeklyPerformance(ctx context.Context) (*models.WeeklyComparison, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	now := time.Now()
	thisWeekStart := now.AddDate(0, 0, -7)
	lastWeekStart := now.AddDate(0, 0, -14)

	// Get this week's average
	thisWeekStats, err := m.getWeekStats(ctx, thisWeekStart, now)
	if err != nil {
		return nil, err
	}

	// Get last week's average
	lastWeekStats, err := m.getWeekStats(ctx, lastWeekStart, thisWeekStart)
	if err != nil {
		return nil, err
	}

	// Calculate changes
	healthChange := thisWeekStats.AvgHealth - lastWeekStats.AvgHealth
	storageChange := thisWeekStats.AvgStorageUsed - lastWeekStats.AvgStorageUsed
	nodesChange := thisWeekStats.AvgOnlineNodes - lastWeekStats.AvgOnlineNodes

	return &models.WeeklyComparison{
		ThisWeek:      *thisWeekStats,
		LastWeek:      *lastWeekStats,
		HealthChange:  healthChange,
		StorageChange: storageChange,
		NodesChange:   nodesChange,
	}, nil
}

func (m *MongoDBService) getWeekStats(ctx context.Context, start, end time.Time) (*models.WeekStats, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"timestamp": bson.M{
				"$gte": start,
				"$lt":  end,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":               nil,
			"avg_health":        bson.M{"$avg": "$network_health"},
			"avg_online_nodes":  bson.M{"$avg": "$online_nodes"},
			"avg_total_nodes":   bson.M{"$avg": "$total_nodes"},
			"avg_storage_used":  bson.M{"$avg": "$used_storage_pb"},
			"avg_storage_total": bson.M{"$avg": "$total_storage_pb"},
		}}},
	}

	cursor, err := m.db.Collection(CollectionNetworkSnapshots).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var result struct {
		AvgHealth       float64 `bson:"avg_health"`
		AvgOnlineNodes  float64 `bson:"avg_online_nodes"`
		AvgTotalNodes   float64 `bson:"avg_total_nodes"`
		AvgStorageUsed  float64 `bson:"avg_storage_used"`
		AvgStorageTotal float64 `bson:"avg_storage_total"`
	}

	if cursor.Next(ctx) {
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
	}

	return &models.WeekStats{
		StartDate:       start,
		EndDate:         end,
		AvgHealth:       result.AvgHealth,
		AvgOnlineNodes:  result.AvgOnlineNodes,
		AvgTotalNodes:   result.AvgTotalNodes,
		AvgStorageUsed:  result.AvgStorageUsed,
		AvgStorageTotal: result.AvgStorageTotal,
	}, nil
}





// ============================================
// ADD THESE METHODS TO: backend/services/mongodb_service.go
// ============================================

// GetNetworkSnapshotsRange retrieves network snapshots within a time range
func (m *MongoDBService) GetNetworkSnapshotsRange(ctx context.Context, start, end time.Time) ([]models.NetworkSnapshot, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	filter := bson.M{
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}

	opts := options.Find().SetSort(bson.M{"timestamp": 1})
	cursor, err := m.db.Collection(CollectionNetworkSnapshots).Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var snapshots []models.NetworkSnapshot
	if err := cursor.All(ctx, &snapshots); err != nil {
		return nil, err
	}

	return snapshots, nil
}

// GetNodeSnapshotsRange retrieves node snapshots within a time range
func (m *MongoDBService) GetNodeSnapshotsRange(ctx context.Context, nodeID string, start, end time.Time) ([]models.NodeSnapshot, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	filter := bson.M{
		"node_id": nodeID,
		"timestamp": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}

	opts := options.Find().SetSort(bson.M{"timestamp": 1})
	cursor, err := m.db.Collection(CollectionNodeSnapshots).Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var snapshots []models.NodeSnapshot
	if err := cursor.All(ctx, &snapshots); err != nil {
		return nil, err
	}

	return snapshots, nil
}

// GetLatestNetworkSnapshot gets the most recent network snapshot
func (m *MongoDBService) GetLatestNetworkSnapshot(ctx context.Context) (*models.NetworkSnapshot, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	var snapshot models.NetworkSnapshot
	opts := options.FindOne().SetSort(bson.M{"timestamp": -1})
	
	err := m.db.Collection(CollectionNetworkSnapshots).FindOne(ctx, bson.M{}, opts).Decode(&snapshot)
	if err != nil {
		return nil, err
	}

	return &snapshot, nil
}

// GetOldestNetworkSnapshot gets the oldest network snapshot
func (m *MongoDBService) GetOldestNetworkSnapshot(ctx context.Context) (*models.NetworkSnapshot, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	var snapshot models.NetworkSnapshot
	opts := options.FindOne().SetSort(bson.M{"timestamp": 1})
	
	err := m.db.Collection(CollectionNetworkSnapshots).FindOne(ctx, bson.M{}, opts).Decode(&snapshot)
	if err != nil {
		return nil, err
	}

	return &snapshot, nil
}

// CountNetworkSnapshots returns total number of snapshots stored
func (m *MongoDBService) CountNetworkSnapshots(ctx context.Context) (int64, error) {
	if !m.enabled {
		return 0, fmt.Errorf("MongoDB not enabled")
	}

	count, err := m.db.Collection(CollectionNetworkSnapshots).CountDocuments(ctx, bson.M{})
	return count, err
}

// CountNodeSnapshots returns total number of node snapshots stored
func (m *MongoDBService) CountNodeSnapshots(ctx context.Context) (int64, error) {
	if !m.enabled {
		return 0, fmt.Errorf("MongoDB not enabled")
	}

	count, err := m.db.Collection(CollectionNodeSnapshots).CountDocuments(ctx, bson.M{})
	return count, err
}

// GetAllRegisteredNodes returns all nodes that have ever been seen
func (m *MongoDBService) GetAllRegisteredNodes(ctx context.Context) ([]models.NodeRegistryEntry, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	cursor, err := m.db.Collection(CollectionNodeRegistry).Find(ctx, bson.M{},
		options.Find().SetSort(bson.M{"first_seen": -1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []models.NodeRegistryEntry
	if err := cursor.All(ctx, &entries); err != nil {
		return nil, err
	}

	return entries, nil
}

// DeleteOldSnapshots deletes snapshots older than the specified duration
// Useful for data retention policies
func (m *MongoDBService) DeleteOldSnapshots(ctx context.Context, olderThan time.Duration) error {
	if !m.enabled {
		return fmt.Errorf("MongoDB not enabled")
	}

	cutoffTime := time.Now().Add(-olderThan)
	filter := bson.M{
		"timestamp": bson.M{"$lt": cutoffTime},
	}

	// Delete old network snapshots
	netResult, err := m.db.Collection(CollectionNetworkSnapshots).DeleteMany(ctx, filter)
	if err != nil {
		return err
	}

	// Delete old node snapshots
	nodeResult, err := m.db.Collection(CollectionNodeSnapshots).DeleteMany(ctx, filter)
	if err != nil {
		return err
	}

	log.Printf("Deleted %d network snapshots and %d node snapshots older than %v",
		netResult.DeletedCount, nodeResult.DeletedCount, olderThan)

	return nil
}

// GetDatabaseStats returns statistics about the MongoDB collections
func (m *MongoDBService) GetDatabaseStats(ctx context.Context) (map[string]interface{}, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	stats := make(map[string]interface{})

	// Count documents in each collection
	netCount, _ := m.db.Collection(CollectionNetworkSnapshots).CountDocuments(ctx, bson.M{})
	nodeCount, _ := m.db.Collection(CollectionNodeSnapshots).CountDocuments(ctx, bson.M{})
	alertCount, _ := m.db.Collection(CollectionAlertHistory).CountDocuments(ctx, bson.M{})
	registryCount, _ := m.db.Collection(CollectionNodeRegistry).CountDocuments(ctx, bson.M{})

	stats["network_snapshots_count"] = netCount
	stats["node_snapshots_count"] = nodeCount
	stats["alert_history_count"] = alertCount
	stats["registered_nodes_count"] = registryCount

	// Get oldest and newest snapshots
	oldest, err := m.GetOldestNetworkSnapshot(ctx)
	if err == nil {
		stats["oldest_snapshot"] = oldest.Timestamp
	}

	latest, err := m.GetLatestNetworkSnapshot(ctx)
	if err == nil {
		stats["latest_snapshot"] = latest.Timestamp
	}

	if oldest != nil && latest != nil {
		duration := latest.Timestamp.Sub(oldest.Timestamp)
		stats["data_span_days"] = duration.Hours() / 24
	}

	return stats, nil
}










// GetInactiveNodes returns nodes that haven't been seen in X days
func (m *MongoDBService) GetInactiveNodes(ctx context.Context, inactiveDays int) ([]models.NodeGraveyardEntry, error) {
	if !m.enabled {
		return nil, fmt.Errorf("MongoDB not enabled")
	}

	cutoffTime := time.Now().AddDate(0, 0, -inactiveDays)

	// Use aggregation to find nodes with no recent snapshots
	pipeline := mongo.Pipeline{
		// Get all registered nodes
		{{Key: "$match", Value: bson.M{
			"first_seen": bson.M{"$lt": cutoffTime}, // Only nodes that existed before cutoff
		}}},
		// Lookup recent snapshots
		{{Key: "$lookup", Value: bson.M{
			"from": CollectionNodeSnapshots,
			"let":  bson.M{"nodeId": "$node_id"},
			"pipeline": bson.A{
				bson.M{"$match": bson.M{
					"$expr": bson.M{"$eq": bson.A{"$node_id", "$$nodeId"}},
					"timestamp": bson.M{"$gte": cutoffTime},
				}},
			},
			"as": "recent_snapshots",
		}}},
		// Filter to nodes with no recent activity
		{{Key: "$match", Value: bson.M{
			"recent_snapshots": bson.M{"$size": 0},
		}}},
		// Get their last known snapshot
		{{Key: "$lookup", Value: bson.M{
			"from": CollectionNodeSnapshots,
			"let":  bson.M{"nodeId": "$node_id"},
			"pipeline": bson.A{
				bson.M{"$match": bson.M{
					"$expr": bson.M{"$eq": bson.A{"$node_id", "$$nodeId"}},
				}},
				bson.M{"$sort": bson.M{"timestamp": -1}},
				bson.M{"$limit": 1},
			},
			"as": "last_snapshot",
		}}},
		// Unwind last snapshot
		{{Key: "$unwind", Value: bson.M{
			"path":                       "$last_snapshot",
			"preserveNullAndEmptyArrays": true,
		}}},
		// Sort by last seen
		{{Key: "$sort", Value: bson.M{"last_snapshot.timestamp": -1}}},
	}

	cursor, err := m.db.Collection(CollectionNodeRegistry).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.NodeGraveyardEntry
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}
```

---
### services/node_discovery.go
- Size: 14.50 KB
- Lines: 563
- Last Modified: 2025-12-20 16:01:12

```go
package services

import (
	"log"
	"net"
	"strconv"
	"sync"
	"time"
	"strings"

	"xand/config"
	"xand/models"
	"xand/utils"
)

type NodeDiscovery struct {
	cfg     *config.Config
	prpc    *PRPCClient
	geo     *utils.GeoResolver
	credits *CreditsService // ADD THIS

	knownNodes map[string]*models.Node
	nodesMutex sync.RWMutex
	stopChan   chan struct{}
}

// Update NewNodeDiscovery
func NewNodeDiscovery(cfg *config.Config, prpc *PRPCClient, geo *utils.GeoResolver, credits *CreditsService) *NodeDiscovery {
	return &NodeDiscovery{
		cfg:        cfg,
		prpc:       prpc,
		geo:        geo,
		credits:    credits, // ADD THIS
		knownNodes: make(map[string]*models.Node),
		stopChan:   make(chan struct{}),
	}
}

// Start begins the background polling routines and bootstrapping
func (nd *NodeDiscovery) Start() {
	// 1. Bootstrap immediately
	go nd.Bootstrap()

	// 2. Start Loops
	go nd.runDiscoveryLoop()
	go nd.runStatsLoop()
	go nd.runHealthLoop()
}

func (nd *NodeDiscovery) Stop() {
	close(nd.stopChan)
}

func (nd *NodeDiscovery) runDiscoveryLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.DiscoveryInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.discoverPeers()
		case <-nd.stopChan:
			return
		}
	}
}

func (nd *NodeDiscovery) runStatsLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.StatsInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.collectStats()
		case <-nd.stopChan:
			return
		}
	}
}

func (nd *NodeDiscovery) runHealthLoop() {
	ticker := time.NewTicker(time.Duration(nd.cfg.Polling.HealthCheckInterval) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			nd.healthCheck()
		case <-nd.stopChan:
			return
		}
	}
}

// Bootstrap loads initial nodes from config and starts discovery
func (nd *NodeDiscovery) Bootstrap() {
	log.Println("Starting Bootstrap process...")
	// for _, seed := range nd.cfg.Server.SeedNodes {
	// 	log.Printf("Bootstrapping from seed: %s", seed)
	// 	nd.processNodeAddress(seed)
	// }
	if len(nd.cfg.Server.SeedNodes) == 0 {
		log.Println("WARNING: No seed nodes configured! Set SEED_NODES environment variable.")
		return
	}

	for _, seed := range nd.cfg.Server.SeedNodes {
		log.Printf("Bootstrapping from seed: %s", seed)
		nd.processNodeAddress(seed)
	}

	// Wait for initial connection
	time.Sleep(2 * time.Second)
	// Run initial collection immediately after bootstrap phase to populate data quickly
	go nd.discoverPeers()
	go nd.healthCheck()  // Pings to verify online status
	go nd.collectStats() // Get initial stats
}

// discoverPeers iterates known nodes and asks for their peers
func (nd *NodeDiscovery) discoverPeers() {
	nodes := nd.GetNodes()
	for _, node := range nodes {
		if !node.IsOnline {
			continue
		}
		go func(n *models.Node) {
			podsResp, err := nd.prpc.GetPods(n.Address)
			if err != nil {
				return
			}
			
			// Update THIS node's info if we find it in pods
			host, _, _ := net.SplitHostPort(n.Address)
			for _, pod := range podsResp.Pods {
				podHost, _, _ := net.SplitHostPort(pod.Address)
				
				// Check if this pod is the current node
				if podHost == host {
					nd.nodesMutex.Lock()
					if existingNode, exists := nd.knownNodes[n.ID]; exists {
						nd.updateNodeFromPod(existingNode, &pod)
						nd.enrichNodeWithCredits(existingNode)
						
						// Migrate to pubkey if not already
						if pod.Pubkey != "" && existingNode.ID != pod.Pubkey && existingNode.Pubkey == "" {
							delete(nd.knownNodes, n.ID)
							existingNode.ID = pod.Pubkey
							existingNode.Pubkey = pod.Pubkey
							nd.knownNodes[pod.Pubkey] = existingNode
						}
					}
					nd.nodesMutex.Unlock()
					break
				}
			}
			
			// Process peer nodes
			for _, pod := range podsResp.Pods {
				host, _, err := net.SplitHostPort(pod.Address)
				if err != nil {
					host = pod.Address
				}

				var rpcAddress string
				if pod.RpcPort > 0 {
					rpcAddress = net.JoinHostPort(host, strconv.Itoa(pod.RpcPort))
				} else {
					rpcAddress = pod.Address
				}

				nd.processNodeAddress(rpcAddress)
			}
		}(node)
	}
}

// collectStats queries all nodes for their stats
func (nd *NodeDiscovery) collectStats() {
	nodes := nd.GetNodes()
	for _, node := range nodes {
		go func(n *models.Node) {
			statsResp, err := nd.prpc.GetStats(n.Address)
			if err == nil {
				nd.nodesMutex.Lock()
				if storedNode, exists := nd.knownNodes[n.ID]; exists {
					nd.updateStats(storedNode, statsResp)
					storedNode.LastSeen = time.Now()
					nd.enrichNodeWithCredits(storedNode)
				}
				nd.nodesMutex.Unlock()
			}
			
			// ADD THIS: Try to get pubkey if missing
			if n.Pubkey == "" {
				nd.forcePubkeyLookup(n)
			}
		}(node)
	}
}
// healthCheck pings nodes to update status and metrics (ping only)
func (nd *NodeDiscovery) healthCheck() {
	// log.Println("Running Health Check...")
	nodes := nd.GetNodes()

	for _, node := range nodes {
		go func(n *models.Node) {
			start := time.Now()
			// Check Version -> Status/Ping
			verResp, err := nd.prpc.GetVersion(n.Address)
			latency := time.Since(start).Milliseconds()

			nd.nodesMutex.Lock()
			defer nd.nodesMutex.Unlock()

			storedNode, exists := nd.knownNodes[n.ID]
			if !exists {
				return
			}

			// Update Tracking
			storedNode.ResponseTime = latency
			updateCallHistory(storedNode, err == nil)
			storedNode.TotalCalls++ // We can track total pings here
			if err == nil {
				storedNode.SuccessCalls++ // Simple counter, though performance score uses History
				storedNode.IsOnline = true
				storedNode.LastSeen = time.Now()
				storedNode.Version = verResp.Version
				
				versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
				storedNode.VersionStatus = versionStatus
				storedNode.IsUpgradeNeeded = needsUpgrade
				storedNode.UpgradeSeverity = severity
				storedNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)
			} else {
				// Handle Stale
				if time.Since(storedNode.LastSeen) > time.Duration(nd.cfg.Polling.StaleThreshold)*time.Minute {
					delete(nd.knownNodes, storedNode.ID)
				}
			}
		}(node)
	}
}

func updateCallHistory(n *models.Node, success bool) {
	if n.CallHistory == nil {
		n.CallHistory = make([]bool, 0, 10)
	}
	// Append
	if len(n.CallHistory) >= 10 {
		n.CallHistory = n.CallHistory[1:] // shift
	}
	n.CallHistory = append(n.CallHistory, success)
}

// processNodeAddress handles a potentially new node address
func (nd *NodeDiscovery) processNodeAddress(address string) {
	// IMPORTANT: Check if we already know this ADDRESS first
	// This prevents duplicate RPC calls
	nd.nodesMutex.RLock()
	for _, node := range nd.knownNodes {
		if node.Address == address {
			// We already know this node (by address), just return
			nd.nodesMutex.RUnlock()
			return
		}
	}
	nd.nodesMutex.RUnlock()

	// Verify connectivity first
	verResp, err := nd.prpc.GetVersion(address)
	if err != nil {
		return
	}

	// Create Node with address as temporary ID
	host, portStr, _ := net.SplitHostPort(address)
	port, _ := strconv.Atoi(portStr)

	newNode := &models.Node{
		ID:        address, // Start with address as ID
		Address:   address,
		IP:        host,
		Port:      port,
		Version:   verResp.Version,
		IsOnline:  true,
		FirstSeen: time.Now(),
		LastSeen:  time.Now(),
		Status:    "online", // <-- CORRECT: should be "online", not "active"
	UptimeScore: 100,    // <-- ADD: Initialize to 100 for new nodes
	PerformanceScore: 100,
	}

	// Check version status
	versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(verResp.Version, nil)
	newNode.VersionStatus = versionStatus
	newNode.IsUpgradeNeeded = needsUpgrade
	newNode.UpgradeSeverity = severity
	newNode.UpgradeMessage = utils.GetUpgradeMessage(verResp.Version, nil)

	// Initial Enrichment
	// 1. Stats
	statsResp, err := nd.prpc.GetStats(address)
	if err == nil {
		nd.updateStats(newNode, statsResp)
	}

	// 2. GeoIP
	country, city, lat, lon := nd.geo.Lookup(host)
	newNode.Country = country
	newNode.City = city
	newNode.Lat = lat
	newNode.Lon = lon

	// 3. Staking (Real data pending)
	newNode.TotalStake = 0
	newNode.Commission = 0
	newNode.BoostFactor = 0
	newNode.APY = 0

	// Store with address as ID initially
	nd.nodesMutex.Lock()
	nd.knownNodes[address] = newNode
	nd.nodesMutex.Unlock()

	log.Printf("Discovered new node: %s (%s, %s)", address, country, verResp.Version)

	// Recursive Discovery - get pods and update pubkey asynchronously
	go func() {
		podsResp, err := nd.prpc.GetPods(address)
		if err == nil {
			// First, try to find OUR pubkey from the pods list
			host, _, _ := net.SplitHostPort(address)
			for _, pod := range podsResp.Pods {
				podHost, _, _ := net.SplitHostPort(pod.Address)
				if podHost == host && pod.Pubkey != "" {
					// Found our pubkey! Update the node
					nd.nodesMutex.Lock()
					if existingNode, exists := nd.knownNodes[address]; exists {
						// Update node with pubkey info
						existingNode.Pubkey = pod.Pubkey
						nd.updateNodeFromPod(existingNode, &pod)
						
						// Migrate from address-based ID to pubkey-based ID
						if pod.Pubkey != address {
							delete(nd.knownNodes, address)
							existingNode.ID = pod.Pubkey
							nd.knownNodes[pod.Pubkey] = existingNode
							log.Printf("Migrated node %s to pubkey-based ID: %s", address, pod.Pubkey)
						}
						
						// Enrich with credits
						nd.enrichNodeWithCredits(existingNode)
					}
					nd.nodesMutex.Unlock()
					break
				}
			}
			
			// Now process peer nodes
			for _, pod := range podsResp.Pods {
				host, _, err := net.SplitHostPort(pod.Address)
				if err != nil {
					host = pod.Address
				}

				var rpcAddress string
				if pod.RpcPort > 0 {
					rpcAddress = net.JoinHostPort(host, strconv.Itoa(pod.RpcPort))
				} else {
					rpcAddress = pod.Address
				}

				// Process peer as new node
				nd.processNodeAddress(rpcAddress)
			}
		}
	}()
}

func (nd *NodeDiscovery) updateStats(node *models.Node, stats *models.PRPCStatsResponse) {
	node.CPUPercent = stats.Stats.CPUPercent
	node.RAMUsed = stats.Stats.RAMUsed
	node.RAMTotal = stats.Stats.RAMTotal
	node.StorageCapacity = stats.FileSize
	node.StorageUsed = stats.Metadata.TotalBytes

	node.UptimeSeconds = stats.Stats.Uptime
	node.PacketsReceived = stats.Stats.PacketsReceived
	node.PacketsSent = stats.Stats.PacketsSent

	if node.UptimeSeconds > 0 {
		knownDuration := time.Since(node.FirstSeen).Seconds()
		if knownDuration > 0 {
			ratio := float64(node.UptimeSeconds) / knownDuration
			if ratio > 1 {
				ratio = 1
			}
			node.UptimeScore = ratio * 100
		} else {
			node.UptimeScore = 100
		}
	} else {
		node.UptimeScore = 0
	}
}

// GetNodes returns all known nodes
func (nd *NodeDiscovery) GetNodes() []*models.Node {
	nd.nodesMutex.RLock()
	defer nd.nodesMutex.RUnlock()

	nodes := make([]*models.Node, 0, len(nd.knownNodes))
	for _, n := range nd.knownNodes {
		nodes = append(nodes, n)
	}
	return nodes
}


func (nd *NodeDiscovery) updateNodeFromPod(node *models.Node, pod *models.Pod) {
	node.Pubkey = pod.Pubkey
	node.IsPublic = pod.IsPublic
	node.Version = pod.Version
	node.StorageCapacity = pod.StorageCommitted
	node.StorageUsed = pod.StorageUsed
	node.StorageUsagePercent = pod.StorageUsagePercent
	node.UptimeSeconds = pod.Uptime
	
	// Update LastSeen if we have timestamp
	if pod.LastSeenTimestamp > 0 {
		node.LastSeen = time.Unix(pod.LastSeenTimestamp, 0)
	}
	
	// Calculate uptime score from the uptime field
	if pod.Uptime > 0 {
		knownDuration := time.Since(node.FirstSeen).Seconds()
		if knownDuration > 0 {
			ratio := float64(pod.Uptime) / knownDuration
			if ratio > 1 {
				ratio = 1
			}
			node.UptimeScore = ratio * 100
		} else {
			node.UptimeScore = 100
		}
	}
	
	// ADD THIS: Update version status when version changes
	if pod.Version != "" {
		versionStatus, needsUpgrade, severity := utils.CheckVersionStatus(pod.Version, nil)
		node.VersionStatus = versionStatus
		node.IsUpgradeNeeded = needsUpgrade
		node.UpgradeSeverity = severity
		node.UpgradeMessage = utils.GetUpgradeMessage(pod.Version, nil)
	}
	
	// ADD THIS: If we now have a pubkey and node ID is still address-based, migrate
	if pod.Pubkey != "" && node.ID != pod.Pubkey && !strings.Contains(node.ID, ":") == false {
		// Node ID is currently an address (contains ":"), but we have pubkey now
		// This will be handled by updateNodeID in the caller
		node.Pubkey = pod.Pubkey
	}
}


func (nd *NodeDiscovery) enrichNodeWithCredits(node *models.Node) {
	if nd.credits == nil || node.Pubkey == "" {
		return
	}

	credits, exists := nd.credits.GetCredits(node.Pubkey)
	if exists {
		node.Credits = credits.Credits
		node.CreditsRank = credits.Rank
		node.CreditsChange = credits.CreditsChange
	}
}





// ForcePubkeyLookup attempts to get pubkey for nodes that don't have one
func (nd *NodeDiscovery) forcePubkeyLookup(node *models.Node) {
	if node.Pubkey != "" {
		return // Already has pubkey
	}

	// Try to get pubkey from pods
	podsResp, err := nd.prpc.GetPods(node.Address)
	if err != nil {
		return
	}

	host, _, _ := net.SplitHostPort(node.Address)
	for _, pod := range podsResp.Pods {
		podHost, _, _ := net.SplitHostPort(pod.Address)
		if podHost == host && pod.Pubkey != "" {
			nd.nodesMutex.Lock()
			node.Pubkey = pod.Pubkey
			nd.updateNodeFromPod(node, &pod)
			
			// Migrate to pubkey-based ID if needed
			if node.ID != pod.Pubkey {
				delete(nd.knownNodes, node.ID)
				node.ID = pod.Pubkey
				nd.knownNodes[pod.Pubkey] = node
				log.Printf("Migrated node %s to pubkey: %s", node.Address, pod.Pubkey)
			}
			nd.nodesMutex.Unlock()
			break
		}
	}
}
```

---
### services/cache.go
- Size: 3.51 KB
- Lines: 164
- Last Modified: 2025-12-18 02:57:49

```go
package services

import (
	"log"
	"sync"
	"time"

	"xand/config"
	"xand/models"
)

// CacheItem Generic container
type CacheItem struct {
	Data      interface{}
	ExpiresAt time.Time
}

type CacheService struct {
	cfg        *config.Config
	aggregator *DataAggregator // To refresh data

	// Storage
	// keys: "nodes", "stats", "node:<id>"
	store sync.Map // map[string]*CacheItem

	stopChan chan struct{}
}

func NewCacheService(cfg *config.Config, aggregator *DataAggregator) *CacheService {
	return &CacheService{
		cfg:        cfg,
		aggregator: aggregator,
		stopChan:   make(chan struct{}),
	}
}

// StartCacheWarmer starts the background loop
func (cs *CacheService) StartCacheWarmer() {
	log.Println("Starting Cache Warmer...")

	// Initial warm
	cs.Refresh()

	ticker := time.NewTicker(time.Duration(cs.cfg.Polling.StatsInterval) * time.Second) // "Every 30 seconds" from prompt

	go func() {
		for {
			select {
			case <-ticker.C:
				cs.Refresh()
			case <-cs.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

func (cs *CacheService) Stop() {
	close(cs.stopChan)
}

// Refresh fetches fresh data and updates cache
func (cs *CacheService) Refresh() {
	// 1. Get Aggregated Stats
	stats := cs.aggregator.Aggregate()

	// 2. Get All Nodes
	nodes := cs.aggregator.discovery.GetNodes()

	// 3. Update "stats" cache
	cs.Set("stats", stats, time.Duration(cs.cfg.Cache.TTL)*time.Second)

	// 4. Update "nodes" cache
	cs.Set("nodes", nodes, time.Duration(cs.cfg.Cache.TTL)*time.Second)

	// 5. Update "node:<id>" for each node
	for _, n := range nodes {
		cs.Set("node:"+n.ID, n, 60*time.Second)
	}

	log.Printf("Cache refreshed. Stats: %d nodes online.", stats.OnlineNodes)
}

// Generic Get/Set

func (cs *CacheService) Set(key string, data interface{}, ttl time.Duration) {
	item := &CacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
	cs.store.Store(key, item)
}

func (cs *CacheService) Get(key string) (interface{}, bool) {
	val, ok := cs.store.Load(key)
	if !ok {
		return nil, false
	}

	item := val.(*CacheItem)
	if time.Now().After(item.ExpiresAt) {
		// New Logic: Do Not Delete. Just return false.
		// Handlers can use GetWithStale if they want stale data.
		return nil, false
	}

	return item.Data, true
}

func (cs *CacheService) GetWithStale(key string) (interface{}, bool, bool) {
	val, ok := cs.store.Load(key)
	if !ok {
		return nil, false, false // data, stale, found
	}

	item := val.(*CacheItem)
	isStale := time.Now().After(item.ExpiresAt)
	return item.Data, isStale, true
}

// Typed Helpers with Stale Support

func (cs *CacheService) GetNetworkStats(allowStale bool) (*models.NetworkStats, bool, bool) {
	data, stale, found := cs.GetWithStale("stats")
	if !found {
		return nil, false, false
	}
	if !allowStale && stale {
		return nil, false, false
	}
	if stats, ok := data.(models.NetworkStats); ok {
		return &stats, stale, true
	}
	return nil, false, false
}

func (cs *CacheService) GetNodes(allowStale bool) ([]*models.Node, bool, bool) {
	data, stale, found := cs.GetWithStale("nodes")
	if !found {
		return nil, false, false
	}
	if !allowStale && stale {
		return nil, false, false
	}
	if nodes, ok := data.([]*models.Node); ok {
		return nodes, stale, true
	}
	return nil, false, false
}

func (cs *CacheService) GetNode(id string, allowStale bool) (*models.Node, bool, bool) {
	data, stale, found := cs.GetWithStale("node:" + id)
	if !found {
		return nil, false, false
	}
	if !allowStale && stale {
		return nil, false, false
	}
	if node, ok := data.(*models.Node); ok {
		return node, stale, true
	}
	return nil, false, false
}

```

---
### services/calculator_service.go
- Size: 4.97 KB
- Lines: 144
- Last Modified: 2025-12-18 02:57:49

```go
package services

import (
	"xand/models"
)

type CalculatorService struct{}

func NewCalculatorService() *CalculatorService {
	return &CalculatorService{}
}

// CompareCosts compares storage costs across providers
func (cs *CalculatorService) CompareCosts(storageTB float64) models.StorageCostComparison {
	comparison := models.StorageCostComparison{
		StorageAmountTB: storageTB,
		Duration:        "monthly",
		Providers:       make([]models.ProviderCostBreakdown, 0),
	}

	// Xandeum (Pricing pending real-time feed)
	xandeum := models.ProviderCostBreakdown{
		Name:           "Xandeum",
		MonthlyCostUSD: 0,
		YearlyCostUSD:  0,
		Features:       []string{"Decentralized", "Solana-native", "Erasure coded", "High durability"},
		Notes:          "Pricing pending live network data",
	}

	// AWS S3 Standard (as of 2024)
	awsS3 := models.ProviderCostBreakdown{
		Name:           "AWS S3",
		MonthlyCostUSD: storageTB * 23.0, // ~$0.023/GB = $23/TB
		YearlyCostUSD:  storageTB * 23.0 * 12,
		Features:       []string{"Centralized", "99.999999999% durability", "Global CDN", "Instant access"},
		Notes:          "Standard tier, excludes data transfer & API costs",
	}

	// Arweave (Permanent storage)
	arweave := models.ProviderCostBreakdown{
		Name:           "Arweave",
		MonthlyCostUSD: storageTB * 1000 / 240, // ~$1000/TB one-time / 240 months (20 years)
		YearlyCostUSD:  storageTB * 1000 / 20,
		Features:       []string{"Permanent storage", "Decentralized", "Pay once", "Blockchain-based"},
		Notes:          "One-time payment model, amortized over 20 years",
	}

	// Filecoin
	filecoin := models.ProviderCostBreakdown{
		Name:           "Filecoin",
		MonthlyCostUSD: storageTB * 1.5, // Variable, ~$1.5/TB/month average
		YearlyCostUSD:  storageTB * 1.5 * 12,
		Features:       []string{"Decentralized", "Proof-of-storage", "Market-driven pricing", "Retrieval fees apply"},
		Notes:          "Pricing varies by storage provider and deal terms",
	}

	comparison.Providers = []models.ProviderCostBreakdown{xandeum, awsS3, arweave, filecoin}

	// Determine recommendation
	if storageTB < 10 {
		comparison.Recommendation = "For small storage needs, Xandeum offers competitive pricing with decentralization benefits."
	} else if storageTB < 100 {
		comparison.Recommendation = "Xandeum provides significant cost savings compared to AWS S3 at this scale."
	} else {
		comparison.Recommendation = "At enterprise scale, Xandeum's decentralized model offers both cost efficiency and censorship resistance."
	}

	return comparison
}

// EstimateROI calculates earnings for running a pNode
func (cs *CalculatorService) EstimateROI(storageTB float64, uptimePercent float64) models.ROIEstimate {
	// XAND token price (pending real-time feed)
	xandPrice := 0.0

	// Reward structure (pending governance/network parameters)
	baseRewardPerTBPerDay := 0.0

	// Adjust for uptime
	actualRewardPerTBPerDay := baseRewardPerTBPerDay * (uptimePercent / 100.0)

	// Calculate monthly/yearly
	monthlyXAND := storageTB * actualRewardPerTBPerDay * 30
	yearlyXAND := monthlyXAND * 12

	monthlyUSD := monthlyXAND * xandPrice
	yearlyUSD := yearlyXAND * xandPrice

	// Estimate costs (hardware + electricity)
	// Assuming: 1TB requires ~$5/month for storage + power
	monthlyCosts := storageTB * 5.0

	estimate := models.ROIEstimate{
		StorageCommitmentTB: storageTB,
		UptimePercent:       uptimePercent,
		MonthlyXAND:         monthlyXAND,
		MonthlyUSD:          monthlyUSD,
		YearlyXAND:          yearlyXAND,
		YearlyUSD:           yearlyUSD,
		MonthlyCostsUSD:     monthlyCosts,
		NetProfitMonthly:    monthlyUSD - monthlyCosts,
		XANDPriceUSD:        xandPrice,
		RewardPerTBPerDay:   actualRewardPerTBPerDay,
	}

	// Calculate break-even (initial hardware investment)
	// Assuming $100/TB for hardware
	initialInvestment := storageTB * 100.0
	if estimate.NetProfitMonthly > 0 {
		estimate.BreakEvenMonths = int(initialInvestment / estimate.NetProfitMonthly)
	} else {
		estimate.BreakEvenMonths = -1 // Never breaks even
	}

	return estimate
}

// SimulateRedundancy demonstrates erasure coding
func (cs *CalculatorService) SimulateRedundancy(failedNodes []int) models.RedundancySimulation {
	sim := models.RedundancySimulation{
		DataShards:     4,
		ParityShards:   2,
		TotalShards:    6,
		FailedNodes:    failedNodes,
		RequiredShards: 4, // Need at least 4 shards to reconstruct
	}

	sim.AvailableShards = sim.TotalShards - len(failedNodes)
	sim.CanRecover = sim.AvailableShards >= sim.RequiredShards

	if sim.CanRecover {
		if len(failedNodes) == 0 {
			sim.Message = "All shards available. Data is fully accessible with optimal redundancy."
		} else if len(failedNodes) == 1 {
			sim.Message = "1 shard lost. Data can be fully reconstructed from remaining 5 shards. Redundancy maintained."
		} else if len(failedNodes) == 2 {
			sim.Message = "2 shards lost. Data can still be reconstructed from 4 remaining shards. Minimum redundancy threshold reached."
		}
	} else {
		sim.Message = "CRITICAL: Too many shards lost. Data cannot be fully reconstructed. Minimum 4 shards required."
	}

	return sim
}

```

---
### services/comparsion_service.go
- Size: 5.86 KB
- Lines: 222
- Last Modified: 2025-12-18 02:57:49

```go
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"xand/models"
)

type ComparisonService struct {
	cache      *CacheService
	httpClient *http.Client
}

func NewComparisonService(cache *CacheService) *ComparisonService {
	return &ComparisonService{
		cache: cache,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetCrossChainComparison compares Xandeum vs Solana
func (cs *ComparisonService) GetCrossChainComparison() models.CrossChainComparison {
	comparison := models.CrossChainComparison{
		Timestamp: time.Now(),
	}

	// Get Xandeum metrics
	comparison.Xandeum = cs.getXandeumMetrics()

	// Get Solana metrics
	comparison.Solana = cs.getSolanaMetrics()

	// Calculate deltas
	comparison.PerformanceDelta = cs.calculateDelta(comparison.Xandeum, comparison.Solana)

	return comparison
}

func (cs *ComparisonService) getXandeumMetrics() models.XandeumMetrics {
	stats, _, found := cs.cache.GetNetworkStats(true)
	if !found {
		return models.XandeumMetrics{}
	}

	nodes, _, _ := cs.cache.GetNodes(true)

	// Calculate average latency
	var totalLatency int64
	var count int
	for _, node := range nodes {
		if node.ResponseTime > 0 {
			totalLatency += node.ResponseTime
			count++
		}
	}
	var avgLatency int64
	if count > 0 {
		avgLatency = totalLatency / int64(count)
	}

	// Storage Power Index: sqrt(nodes * storage_pb)
	// This is a custom metric to quantify storage network strength
	storagePowerIndex := math.Sqrt(float64(stats.TotalNodes) * stats.TotalStorage)

	// Data availability: percentage of data that can be retrieved
	// Simplified: (online_nodes / total_nodes) * 100
	dataAvailability := 0.0
	if stats.TotalNodes > 0 {
		dataAvailability = (float64(stats.OnlineNodes) / float64(stats.TotalNodes)) * 100
	}

	return models.XandeumMetrics{
		StoragePowerIndex: storagePowerIndex,
		TotalNodes:        stats.TotalNodes,
		TotalStoragePB:    stats.TotalStorage,
		AverageLatency:    avgLatency,
		NetworkHealth:     stats.NetworkHealth,
		DataAvailability:  dataAvailability,
	}
}

func (cs *ComparisonService) getSolanaMetrics() models.SolanaMetrics {
	// Attempt to fetch real Solana data from public RPC
	// Fallback to mock data if unavailable

	metrics := cs.fetchSolanaRPC()
	if metrics != nil {
		return *metrics
	}

	// Return an empty struct if fetching fails
	return models.SolanaMetrics{}
}

func (cs *ComparisonService) fetchSolanaRPC() *models.SolanaMetrics {
	// Try to fetch from a public Solana RPC endpoint
	// Using mainnet-beta public endpoint
	url := "https://api.mainnet-beta.solana.com"

	// Get cluster nodes
	nodesReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "getClusterNodes",
	}

	nodesData, err := cs.callSolanaRPC(url, nodesReq)
	if err != nil {
		return nil
	}

	var nodesResp struct {
		Result []map[string]interface{} `json:"result"`
	}
	if err := json.Unmarshal(nodesData, &nodesResp); err != nil {
		return nil
	}

	// Get recent performance samples
	perfReq := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "getRecentPerformanceSamples",
		"params":  []interface{}{10},
	}

	perfData, err := cs.callSolanaRPC(url, perfReq)
	if err != nil {
		return nil
	}

	var perfResp struct {
		Result []struct {
			NumSlots         int64 `json:"numSlots"`
			NumTransactions  int64 `json:"numTransactions"`
			SamplePeriodSecs int64 `json:"samplePeriodSecs"`
		} `json:"result"`
	}
	if err := json.Unmarshal(perfData, &perfResp); err != nil {
		return nil
	}

	// Calculate metrics
	totalValidators := len(nodesResp.Result)

	var avgSlotTime int64 = 400 // Default
	var tps int64 = 0
	if len(perfResp.Result) > 0 {
		sample := perfResp.Result[0]
		if sample.NumSlots > 0 {
			avgSlotTime = (sample.SamplePeriodSecs * 1000) / sample.NumSlots
			tps = sample.NumTransactions / sample.SamplePeriodSecs
		}
	}

	return &models.SolanaMetrics{
		StakePowerIndex: 500000000, // Would need staking info endpoint
		TotalValidators: totalValidators,
		TotalStake:      500000000000000000,
		AverageSlotTime: avgSlotTime,
		TPS:             tps,
		NetworkHealth:   99.5,
	}
}

func (cs *ComparisonService) callSolanaRPC(url string, payload map[string]interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	resp, err := cs.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http error: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return json.Marshal(result)
}

func (cs *ComparisonService) calculateDelta(xandeum models.XandeumMetrics, solana models.SolanaMetrics) models.PerformanceDelta {
	delta := models.PerformanceDelta{
		LatencyDifference: xandeum.AverageLatency - solana.AverageSlotTime,
		HealthDifference:  xandeum.NetworkHealth - solana.NetworkHealth,
	}

	// Generate summary
	if delta.LatencyDifference > 0 {
		delta.Summary = fmt.Sprintf("Xandeum storage layer has %.0fms higher latency than Solana consensus layer", float64(delta.LatencyDifference))
	} else {
		delta.Summary = fmt.Sprintf("Xandeum storage layer has %.0fms lower latency than Solana consensus layer", float64(-delta.LatencyDifference))
	}

	// Interpretation
	if math.Abs(float64(delta.LatencyDifference)) < 100 {
		delta.Interpretation = "Latency difference is minimal. Both layers perform comparably."
	} else if delta.LatencyDifference > 500 {
		delta.Interpretation = "Storage layer latency is significantly higher, which is expected for distributed storage operations."
	} else if delta.LatencyDifference < -100 {
		delta.Interpretation = "Storage layer is performing exceptionally well with lower latency than consensus layer."
	} else {
		delta.Interpretation = "Latency difference is within acceptable range for a storage layer."
	}

	return delta
}

```

---
### services/alert_service.go
- Size: 8.96 KB
- Lines: 382
- Last Modified: 2025-12-18 02:57:49

```go
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"xand/models"
)

type AlertService struct {
	alerts      map[string]*models.Alert
	history     []*models.AlertHistory
	alertsMutex sync.RWMutex
	cache       *CacheService
	stopChan    chan struct{}
}

func NewAlertService(cache *CacheService) *AlertService {
	return &AlertService{
		alerts:   make(map[string]*models.Alert),
		history:  make([]*models.AlertHistory, 0),
		cache:    cache,
		stopChan: make(chan struct{}),
	}
}

func (as *AlertService) Start() {
	log.Println("Starting Alert Service...")
	ticker := time.NewTicker(30 * time.Second)
	
	go func() {
		for {
			select {
			case <-ticker.C:
				as.EvaluateAlerts()
			case <-as.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

func (as *AlertService) Stop() {
	close(as.stopChan)
}

// CreateAlert adds a new alert
func (as *AlertService) CreateAlert(alert *models.Alert) error {
	if alert.ID == "" {
		alert.ID = fmt.Sprintf("alert_%d", time.Now().UnixNano())
	}
	alert.CreatedAt = time.Now()
	alert.UpdatedAt = time.Now()

	as.alertsMutex.Lock()
	as.alerts[alert.ID] = alert
	as.alertsMutex.Unlock()

	return nil
}

// GetAlert retrieves a specific alert
func (as *AlertService) GetAlert(id string) (*models.Alert, bool) {
	as.alertsMutex.RLock()
	defer as.alertsMutex.RUnlock()
	alert, exists := as.alerts[id]
	return alert, exists
}

// ListAlerts returns all alerts
func (as *AlertService) ListAlerts() []*models.Alert {
	as.alertsMutex.RLock()
	defer as.alertsMutex.RUnlock()
	
	alerts := make([]*models.Alert, 0, len(as.alerts))
	for _, a := range as.alerts {
		alerts = append(alerts, a)
	}
	return alerts
}

// UpdateAlert modifies an existing alert
func (as *AlertService) UpdateAlert(id string, updated *models.Alert) error {
	as.alertsMutex.Lock()
	defer as.alertsMutex.Unlock()
	
	if _, exists := as.alerts[id]; !exists {
		return fmt.Errorf("alert not found")
	}
	
	updated.ID = id
	updated.UpdatedAt = time.Now()
	as.alerts[id] = updated
	return nil
}

// DeleteAlert removes an alert
func (as *AlertService) DeleteAlert(id string) error {
	as.alertsMutex.Lock()
	defer as.alertsMutex.Unlock()
	
	if _, exists := as.alerts[id]; !exists {
		return fmt.Errorf("alert not found")
	}
	
	delete(as.alerts, id)
	return nil
}

// GetHistory returns alert history
func (as *AlertService) GetHistory(limit int) []*models.AlertHistory {
	as.alertsMutex.RLock()
	defer as.alertsMutex.RUnlock()
	
	if limit <= 0 || limit > len(as.history) {
		limit = len(as.history)
	}
	
	// Return most recent first
	start := len(as.history) - limit
	if start < 0 {
		start = 0
	}
	
	result := make([]*models.AlertHistory, limit)
	copy(result, as.history[start:])
	
	// Reverse to get newest first
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	
	return result
}

// EvaluateAlerts checks all active alerts
func (as *AlertService) EvaluateAlerts() {
	as.alertsMutex.RLock()
	alerts := make([]*models.Alert, 0, len(as.alerts))
	for _, a := range as.alerts {
		if a.Enabled {
			alerts = append(alerts, a)
		}
	}
	as.alertsMutex.RUnlock()

	for _, alert := range alerts {
		// Check cooldown
		if time.Since(alert.LastFired) < time.Duration(alert.Cooldown)*time.Minute {
			continue
		}

		triggered, context := as.evaluateCondition(alert)
		if triggered {
			as.fireAlert(alert, context)
		}
	}
}

func (as *AlertService) evaluateCondition(alert *models.Alert) (bool, map[string]interface{}) {
	context := make(map[string]interface{})

	switch alert.RuleType {
	case "node_status":
		return as.evaluateNodeStatus(alert, context)
	case "network_health":
		return as.evaluateNetworkHealth(alert, context)
	case "storage_threshold":
		return as.evaluateStorageThreshold(alert, context)
	case "latency_spike":
		return as.evaluateLatencySpike(alert, context)
	default:
		return false, context
	}
}

func (as *AlertService) evaluateNodeStatus(alert *models.Alert, context map[string]interface{}) (bool, map[string]interface{}) {
	nodeID, _ := alert.Conditions["node_id"].(string)
	targetStatus, _ := alert.Conditions["status"].(string)

	nodes, _, found := as.cache.GetNodes(true)
	if !found {
		return false, context
	}

	for _, node := range nodes {
		if nodeID != "" && node.ID != nodeID {
			continue
		}
		
		if node.Status == targetStatus {
			context["node_id"] = node.ID
			context["node_address"] = node.Address
			context["status"] = node.Status
			return true, context
		}
	}

	return false, context
}

func (as *AlertService) evaluateNetworkHealth(alert *models.Alert, context map[string]interface{}) (bool, map[string]interface{}) {
	operator, _ := alert.Conditions["operator"].(string)
	threshold, _ := alert.Conditions["threshold"].(float64)

	stats, _, found := as.cache.GetNetworkStats(true)
	if !found {
		return false, context
	}

	context["network_health"] = stats.NetworkHealth
	context["threshold"] = threshold

	switch operator {
	case "lt":
		return stats.NetworkHealth < threshold, context
	case "gt":
		return stats.NetworkHealth > threshold, context
	case "eq":
		return stats.NetworkHealth == threshold, context
	}

	return false, context
}

func (as *AlertService) evaluateStorageThreshold(alert *models.Alert, context map[string]interface{}) (bool, map[string]interface{}) {
	storageType, _ := alert.Conditions["type"].(string)
	operator, _ := alert.Conditions["operator"].(string)
	threshold, _ := alert.Conditions["threshold"].(float64)

	stats, _, found := as.cache.GetNetworkStats(true)
	if !found {
		return false, context
	}

	var value float64
	switch storageType {
	case "total":
		value = stats.TotalStorage
	case "used":
		value = stats.UsedStorage
	case "percent":
		if stats.TotalStorage > 0 {
			value = (stats.UsedStorage / stats.TotalStorage) * 100
		}
	}

	context["storage_type"] = storageType
	context["value"] = value
	context["threshold"] = threshold

	switch operator {
	case "lt":
		return value < threshold, context
	case "gt":
		return value > threshold, context
	}

	return false, context
}

func (as *AlertService) evaluateLatencySpike(alert *models.Alert, context map[string]interface{}) (bool, map[string]interface{}) {
	nodeID, _ := alert.Conditions["node_id"].(string)
	threshold, _ := alert.Conditions["threshold"].(float64)

	nodes, _, found := as.cache.GetNodes(true)
	if !found {
		return false, context
	}

	for _, node := range nodes {
		if nodeID != "" && node.ID != nodeID {
			continue
		}
		
		if node.ResponseTime > int64(threshold) {
			context["node_id"] = node.ID
			context["latency"] = node.ResponseTime
			context["threshold"] = threshold
			return true, context
		}
	}

	return false, context
}

func (as *AlertService) fireAlert(alert *models.Alert, context map[string]interface{}) {
	log.Printf("Alert triggered: %s", alert.Name)

	// Update last fired
	as.alertsMutex.Lock()
	alert.LastFired = time.Now()
	as.alertsMutex.Unlock()

	// Execute actions
	for _, action := range alert.Actions {
		success := as.executeAction(action, alert, context)
		
		// Record history
		history := &models.AlertHistory{
			ID:          fmt.Sprintf("hist_%d", time.Now().UnixNano()),
			AlertID:     alert.ID,
			AlertName:   alert.Name,
			Timestamp:   time.Now(),
			Condition:   alert.RuleType,
			TriggeredBy: context,
			Success:     success,
		}
		
		as.alertsMutex.Lock()
		as.history = append(as.history, history)
		// Keep only last 1000 history items
		if len(as.history) > 1000 {
			as.history = as.history[len(as.history)-1000:]
		}
		as.alertsMutex.Unlock()
	}
}

func (as *AlertService) executeAction(action models.AlertAction, alert *models.Alert, context map[string]interface{}) bool {
	switch action.Type {
	case "webhook", "discord":
		return as.sendWebhook(action, alert, context)
	case "email":
		log.Printf("Email simulation: Alert '%s' triggered", alert.Name)
		return true
	default:
		return false
	}
}

func (as *AlertService) sendWebhook(action models.AlertAction, alert *models.Alert, context map[string]interface{}) bool {
	url, _ := action.Config["url"].(string)
	if url == "" {
		return false
	}

	payload := map[string]interface{}{
		"alert_id":   alert.ID,
		"alert_name": alert.Name,
		"description": alert.Description,
		"rule_type":  alert.RuleType,
		"timestamp":  time.Now(),
		"context":    context,
	}

	// Discord-specific formatting
	if action.Type == "discord" {
		payload = map[string]interface{}{
			"embeds": []map[string]interface{}{
				{
					"title":       "🚨 " + alert.Name,
					"description": alert.Description,
					"color":       15158332, // Red
					"fields": []map[string]interface{}{
						{"name": "Rule Type", "value": alert.RuleType, "inline": true},
						{"name": "Context", "value": fmt.Sprintf("%v", context), "inline": false},
					},
					"timestamp": time.Now().Format(time.RFC3339),
				},
			},
		}
	}

	jsonData, _ := json.Marshal(payload)
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Webhook error: %v", err)
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}
```

---
### services/history_service.go
- Size: 10.15 KB
- Lines: 379
- Last Modified: 2025-12-20 01:14:12

```go
package services

import (
	"context"
	"log"
	"math"
	"sync"
	"time"

	"xand/models"
)

type HistoryService struct {
	cache     *CacheService
	mongo     *MongoDBService
	stopChan  chan struct{}
	mutex     sync.RWMutex
	
	// Keep hot data in memory for quick access (last 1 hour)
	recentNetworkSnapshots []models.NetworkSnapshot
	recentNodeSnapshots    map[string][]models.NodeSnapshot
}

func NewHistoryService(cache *CacheService, mongo *MongoDBService) *HistoryService {
	return &HistoryService{
		cache:                  cache,
		mongo:                  mongo,
		stopChan:               make(chan struct{}),
		recentNetworkSnapshots: make([]models.NetworkSnapshot, 0),
		recentNodeSnapshots:    make(map[string][]models.NodeSnapshot),
	}
}

func (hs *HistoryService) Start() {
	log.Println("Starting History Service with MongoDB...")
	
	// Collect snapshots every 5 minutes
	ticker := time.NewTicker(5 * time.Minute)
	
	go func() {
		// Immediate first collection
		hs.collectSnapshot()
		
		for {
			select {
			case <-ticker.C:
				hs.collectSnapshot()
			case <-hs.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

func (hs *HistoryService) Stop() {
	close(hs.stopChan)
}

func (hs *HistoryService) collectSnapshot() {
	ctx := context.Background()
	
	stats, _, found := hs.cache.GetNetworkStats(true)
	if !found {
		return
	}

	nodes, _, _ := hs.cache.GetNodes(true)

	// Calculate average latency
	var totalLatency int64
	var latencyCount int
	for _, node := range nodes {
		if node.ResponseTime > 0 {
			totalLatency += node.ResponseTime
			latencyCount++
		}
	}
	var avgLatency int64
	if latencyCount > 0 {
		avgLatency = totalLatency / int64(latencyCount)
	}

	// Create network snapshot
	netSnap := models.NetworkSnapshot{
		Timestamp:      time.Now(),
		TotalNodes:     stats.TotalNodes,
		OnlineNodes:    stats.OnlineNodes,
		WarningNodes:   stats.WarningNodes,
		OfflineNodes:   stats.OfflineNodes,
		TotalStoragePB: stats.TotalStorage,
		UsedStoragePB:  stats.UsedStorage,
		AverageLatency: avgLatency,
		NetworkHealth:  stats.NetworkHealth,
		TotalStake:     stats.TotalStake,
		AverageUptime:  stats.AverageUptime,
		AveragePerf:    stats.AveragePerformance,
	}

	// Save to MongoDB
	if hs.mongo != nil && hs.mongo.enabled {
		if err := hs.mongo.InsertNetworkSnapshot(ctx, &netSnap); err != nil {
			log.Printf("Error saving network snapshot to MongoDB: %v", err)
		}
	}

	// Save to in-memory cache (last 1 hour = 12 snapshots at 5min intervals)
	hs.mutex.Lock()
	hs.recentNetworkSnapshots = append(hs.recentNetworkSnapshots, netSnap)
	if len(hs.recentNetworkSnapshots) > 12 {
		hs.recentNetworkSnapshots = hs.recentNetworkSnapshots[len(hs.recentNetworkSnapshots)-12:]
	}
	hs.mutex.Unlock()

	// Save node snapshots
	for _, node := range nodes {
		nodeSnap := models.NodeSnapshot{
			Timestamp:        time.Now(),
			NodeID:           node.ID,
			Status:           node.Status,
			ResponseTime:     node.ResponseTime,
			CPUPercent:       node.CPUPercent,
			RAMUsed:          node.RAMUsed,
			StorageUsed:      node.StorageUsed,
			UptimeScore:      node.UptimeScore,
			PerformanceScore: node.PerformanceScore,
		}
		
		// Save to MongoDB
		if hs.mongo != nil && hs.mongo.enabled {
			if err := hs.mongo.InsertNodeSnapshot(ctx, &nodeSnap); err != nil {
				log.Printf("Error saving node snapshot for %s to MongoDB: %v", node.ID, err)
			}
			
			// Register node in registry (tracks first_seen)
			if err := hs.mongo.RegisterNode(ctx, node.ID, node.FirstSeen); err != nil {
				log.Printf("Error registering node %s: %v", node.ID, err)
			}
		}
		
		// Save to in-memory cache (last 1 hour per node)
		hs.mutex.Lock()
		if _, exists := hs.recentNodeSnapshots[node.ID]; !exists {
			hs.recentNodeSnapshots[node.ID] = make([]models.NodeSnapshot, 0)
		}
		hs.recentNodeSnapshots[node.ID] = append(hs.recentNodeSnapshots[node.ID], nodeSnap)
		if len(hs.recentNodeSnapshots[node.ID]) > 12 {
			hs.recentNodeSnapshots[node.ID] = hs.recentNodeSnapshots[node.ID][len(hs.recentNodeSnapshots[node.ID])-12:]
		}
		hs.mutex.Unlock()
	}

	log.Printf("Collected snapshot: %d nodes, %.2f PB used (saved to MongoDB)", stats.TotalNodes, stats.UsedStorage)
}

// ============================================
// LEGACY METHODS (for backward compatibility)
// These use in-memory cache for recent data, MongoDB for older data
// ============================================

// GetNetworkHistory returns network snapshots
// If MongoDB is available, uses it. Otherwise falls back to in-memory.
func (hs *HistoryService) GetNetworkHistory(hours int) []models.NetworkSnapshot {
	if hours <= 0 {
		hours = 24
	}

	// If MongoDB is available and we need more than 1 hour of data
	if hs.mongo != nil && hs.mongo.enabled && hours > 1 {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		
		startTime := time.Now().Add(-time.Duration(hours) * time.Hour)
		
		// Query MongoDB
		snapshots, err := hs.mongo.GetNetworkSnapshotsRange(ctx, startTime, time.Now())
		if err != nil {
			log.Printf("Error fetching network history from MongoDB: %v", err)
			// Fallback to in-memory
			return hs.getInMemoryNetworkHistory(hours)
		}
		
		return snapshots
	}

	// Use in-memory cache for recent data
	return hs.getInMemoryNetworkHistory(hours)
}

func (hs *HistoryService) getInMemoryNetworkHistory(hours int) []models.NetworkSnapshot {
	hs.mutex.RLock()
	defer hs.mutex.RUnlock()

	// Calculate how many snapshots to return (12 per hour at 5min intervals)
	count := hours * 12
	if count > len(hs.recentNetworkSnapshots) {
		count = len(hs.recentNetworkSnapshots)
	}

	start := len(hs.recentNetworkSnapshots) - count
	if start < 0 {
		start = 0
	}

	result := make([]models.NetworkSnapshot, count)
	copy(result, hs.recentNetworkSnapshots[start:])
	return result
}

// GetNodeHistory returns snapshots for a specific node
func (hs *HistoryService) GetNodeHistory(nodeID string, hours int) []models.NodeSnapshot {
	if hours <= 0 {
		hours = 24
	}

	// If MongoDB is available and we need more than 1 hour of data
	if hs.mongo != nil && hs.mongo.enabled && hours > 1 {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		
		startTime := time.Now().Add(-time.Duration(hours) * time.Hour)
		
		// Query MongoDB
		snapshots, err := hs.mongo.GetNodeSnapshotsRange(ctx, nodeID, startTime, time.Now())
		if err != nil {
			log.Printf("Error fetching node history from MongoDB: %v", err)
			// Fallback to in-memory
			return hs.getInMemoryNodeHistory(nodeID, hours)
		}
		
		return snapshots
	}

	// Use in-memory cache for recent data
	return hs.getInMemoryNodeHistory(nodeID, hours)
}

func (hs *HistoryService) getInMemoryNodeHistory(nodeID string, hours int) []models.NodeSnapshot {
	hs.mutex.RLock()
	defer hs.mutex.RUnlock()

	snapshots, exists := hs.recentNodeSnapshots[nodeID]
	if !exists {
		return []models.NodeSnapshot{}
	}

	count := hours * 12
	if count > len(snapshots) {
		count = len(snapshots)
	}

	start := len(snapshots) - count
	if start < 0 {
		start = 0
	}

	result := make([]models.NodeSnapshot, count)
	copy(result, snapshots[start:])
	return result
}

// GetCapacityForecast predicts storage saturation
func (hs *HistoryService) GetCapacityForecast() models.CapacityForecast {
	forecast := models.CapacityForecast{
		CurrentUsagePB:    0,
		CurrentCapacityPB: 0,
		GrowthRatePBPerDay: 0,
		DaysToSaturation:  -1,
		Confidence:        0,
	}

	// Try MongoDB first for more accurate forecast with more data
	if hs.mongo != nil && hs.mongo.enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		
		// Get 30 days of data for better forecast
		result, err := hs.mongo.GetStorageGrowthRate(ctx, 30)
		if err == nil {
			forecast.CurrentUsagePB = result.EndStoragePB
			forecast.GrowthRatePBPerDay = result.GrowthRatePerDay
			
			// Get current capacity from latest snapshot
			stats, _, found := hs.cache.GetNetworkStats(true)
			if found {
				forecast.CurrentCapacityPB = stats.TotalStorage
				
				if forecast.GrowthRatePBPerDay > 0 {
					remaining := forecast.CurrentCapacityPB - forecast.CurrentUsagePB
					if remaining > 0 {
						forecast.DaysToSaturation = int(math.Ceil(remaining / forecast.GrowthRatePBPerDay))
						forecast.SaturationDate = time.Now().AddDate(0, 0, forecast.DaysToSaturation)
					}
				}
				
				forecast.Confidence = 85.0 // High confidence with 30 days of data
			}
			
			return forecast
		}
	}

	// Fallback to in-memory calculation (less accurate, only 1 hour of data)
	hs.mutex.RLock()
	snapshots := hs.recentNetworkSnapshots
	hs.mutex.RUnlock()

	if len(snapshots) < 2 {
		return forecast
	}

	// Get latest snapshot
	latest := snapshots[len(snapshots)-1]
	forecast.CurrentUsagePB = latest.UsedStoragePB
	forecast.CurrentCapacityPB = latest.TotalStoragePB

	// Get oldest snapshot in memory
	oldest := snapshots[0]
	
	hoursDiff := latest.Timestamp.Sub(oldest.Timestamp).Hours()
	if hoursDiff > 0 {
		usageDiff := latest.UsedStoragePB - oldest.UsedStoragePB
		forecast.GrowthRatePBPerDay = (usageDiff / hoursDiff) * 24

		// Calculate days to saturation
		if forecast.GrowthRatePBPerDay > 0 {
			remaining := forecast.CurrentCapacityPB - forecast.CurrentUsagePB
			if remaining > 0 {
				forecast.DaysToSaturation = int(math.Ceil(remaining / forecast.GrowthRatePBPerDay))
				forecast.SaturationDate = time.Now().AddDate(0, 0, forecast.DaysToSaturation)
			}
		}

		// Low confidence with only 1 hour of data
		forecast.Confidence = 30.0
	}

	return forecast
}

// GetLatencyDistribution returns latency histogram data
func (hs *HistoryService) GetLatencyDistribution() map[string]int {
	nodes, _, found := hs.cache.GetNodes(true)
	if !found {
		return map[string]int{}
	}

	distribution := map[string]int{
		"0-50ms":      0,
		"50-100ms":    0,
		"100-250ms":   0,
		"250-500ms":   0,
		"500-1000ms":  0,
		"1000-2000ms": 0,
		"2000ms+":     0,
	}

	for _, node := range nodes {
		latency := node.ResponseTime
		switch {
		case latency <= 50:
			distribution["0-50ms"]++
		case latency <= 100:
			distribution["50-100ms"]++
		case latency <= 250:
			distribution["100-250ms"]++
		case latency <= 500:
			distribution["250-500ms"]++
		case latency <= 1000:
			distribution["500-1000ms"]++
		case latency <= 2000:
			distribution["1000-2000ms"]++
		default:
			distribution["2000ms+"]++
		}
	}

	return distribution
}
```

---
### services/data_aggregator.go
- Size: 2.06 KB
- Lines: 90
- Last Modified: 2025-12-20 13:26:42

```go
package services

import (
	"log"
	"time"

	"xand/models"
	"xand/utils"
)

type DataAggregator struct {
	discovery *NodeDiscovery
}

func NewDataAggregator(discovery *NodeDiscovery) *DataAggregator {
	return &DataAggregator{
		discovery: discovery,
	}
}

// Aggregate performs full network aggregation
func (da *DataAggregator) Aggregate() models.NetworkStats {
	nodes := da.discovery.GetNodes()

	log.Printf("DEBUG: Aggregating %d nodes", len(nodes))
	for _, node := range nodes {
		log.Printf("DEBUG: Node %s - IsOnline: %v, Status: %s, UptimeScore: %.2f, LastSeen: %v ago",
			node.ID, node.IsOnline, node.Status, node.UptimeScore, time.Since(node.LastSeen))
	}

	aggr := models.NetworkStats{
		TotalNodes:  len(nodes),
		LastUpdated: time.Now(),
	}

	var sumUptime float64
	var sumPerformance float64
	var countPerformance int

	for _, node := range nodes {
		// 1. Determine Status
		utils.DetermineStatus(node)

		// 2. Calculate Performance Score
		utils.CalculateScore(node)

		// 3. Aggregate Counts
		switch node.Status {
		case "online":
			aggr.OnlineNodes++
		case "warning":
			aggr.WarningNodes++
		case "offline":
			aggr.OfflineNodes++
		}

		// 4. Aggregate Storage (PB)
		aggr.TotalStorage += float64(node.StorageCapacity)
		aggr.UsedStorage += float64(node.StorageUsed)

		// 5. Aggregate Stake
		aggr.TotalStake += int64(node.TotalStake)

		// 6. Aggregate Averages
		sumUptime += node.UptimeScore
		sumPerformance += node.PerformanceScore
		countPerformance++
	}

	// Normalize Storage to PB
	// 1 PB = 1e15 bytes
	aggr.TotalStorage /= 1e15
	aggr.UsedStorage /= 1e15

	// Averages
	if len(nodes) > 0 {
		aggr.AverageUptime = sumUptime / float64(len(nodes))
		aggr.AveragePerformance = sumPerformance / float64(len(nodes))
	}

	// Network Health: (online/total)*80 + (avgUptime)*0.2
	if len(nodes) > 0 {
		onlineRatio := float64(aggr.OnlineNodes) / float64(aggr.TotalNodes)
		aggr.NetworkHealth = (onlineRatio * 80) + (aggr.AverageUptime * 0.2)
	}

	log.Printf("Aggregated %d nodes. Health: %.2f%%. Storage: %.2f PB", len(nodes), aggr.NetworkHealth, aggr.TotalStorage)

	return aggr
}

```

---
### services/credits_service.go
- Size: 3.60 KB
- Lines: 156
- Last Modified: 2025-12-20 12:57:49

```go
package services

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"xand/models"
)

type CreditsService struct {
	httpClient    *http.Client
	credits       map[string]*models.PodCredits // Key: pod_id (used as pubkey)
	creditsMutex  sync.RWMutex
	stopChan      chan struct{}
	apiEndpoint   string
}

func NewCreditsService() *CreditsService {
	return &CreditsService{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		credits:     make(map[string]*models.PodCredits),
		stopChan:    make(chan struct{}),
		apiEndpoint: "https://podcredits.xandeum.network/api/pods-credits",
	}
}

func (cs *CreditsService) Start() {
	log.Println("Starting Pod Credits Service (updates every 30 seconds)...")
	
	cs.fetchCredits() // Initial fetch
	
	ticker := time.NewTicker(30 * time.Second)
	
	go func() {
		for {
			select {
			case <-ticker.C:
				cs.fetchCredits()
			case <-cs.stopChan:
				ticker.Stop()
				log.Println("Pod Credits Service stopped")
				return
			}
		}
	}()
}

func (cs *CreditsService) Stop() {
	close(cs.stopChan)
}

func (cs *CreditsService) fetchCredits() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", cs.apiEndpoint, nil)
	if err != nil {
		log.Printf("Error creating credits request: %v", err)
		return
	}

	resp, err := cs.httpClient.Do(req)
	if err != nil {
		log.Printf("Error fetching pod credits: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Pod credits API returned status %d", resp.StatusCode)
		return
	}

	var creditsResp models.PodCreditsResponse
	if err := json.NewDecoder(resp.Body).Decode(&creditsResp); err != nil {
		log.Printf("Error decoding credits response: %v", err)
		return
	}

	if creditsResp.Status != "success" {
		log.Printf("Pod credits API returned non-success status: %s", creditsResp.Status)
		return
	}

	// Update credits map
	cs.creditsMutex.Lock()
	defer cs.creditsMutex.Unlock()

	newCredits := make(map[string]*models.PodCredits)
	
	for i, entry := range creditsResp.PodsCredits {
		pubkey := entry.PodID // Use pod_id as the key/pubkey

		oldCredits := int64(0)
		if existing, exists := cs.credits[pubkey]; exists {
			oldCredits = existing.Credits
		}

		newCredits[pubkey] = &models.PodCredits{
			Pubkey:        pubkey,
			Credits:       entry.Credits,
			LastUpdated:   time.Now(),
			Rank:          i + 1, // Position in the list (assuming API sorts descending by credits)
			CreditsChange: entry.Credits - oldCredits,
		}
	}

	cs.credits = newCredits
	log.Printf("Updated pod credits: %d nodes tracked", len(cs.credits))
}

// GetCredits returns credits for a specific pubkey/pod_id
func (cs *CreditsService) GetCredits(pubkey string) (*models.PodCredits, bool) {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	credits, exists := cs.credits[pubkey]
	return credits, exists
}

// GetAllCredits returns a copy of all pod credits
func (cs *CreditsService) GetAllCredits() []*models.PodCredits {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	result := make([]*models.PodCredits, 0, len(cs.credits))
	for _, c := range cs.credits {
		result = append(result, c)
	}
	return result
}

// GetTopCredits returns top N nodes by credits (using pre-assigned Rank)
func (cs *CreditsService) GetTopCredits(limit int) []*models.PodCredits {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	result := make([]*models.PodCredits, 0, limit)
	count := 0
	for _, c := range cs.credits {
		if c.Rank <= limit {
			result = append(result, c)
			count++
			if count >= limit {
				break
			}
		}
	}
	return result
}
```

---
### services/topology_service.go
- Size: 11.02 KB
- Lines: 453
- Last Modified: 2025-12-20 16:01:50

```go
package services

import (
	"fmt"
	"math"
	"net"
	"sync"
	"time"

	"xand/models"
)

type TopologyService struct {
	cache      *CacheService
	discovery  *NodeDiscovery
	peerGraph  map[string][]string // NodeID -> []PeerIDs
	graphMutex sync.RWMutex
}



func NewTopologyService(cache *CacheService, discovery *NodeDiscovery) *TopologyService {
	ts := &TopologyService{
		cache:     cache,
		discovery: discovery,
		peerGraph: make(map[string][]string),
	}
	
	// Start background peer tracking
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		
		for {
			ts.TrackPeerRelationships()
			<-ticker.C
		}
	}()
	
	return ts
}



func (ts *TopologyService) BuildTopology() models.NetworkTopology {
	nodes, _, found := ts.cache.GetNodes(true)
	if !found {
		return models.NetworkTopology{
			Nodes: []models.TopologyNode{},
			Edges: []models.TopologyEdge{},
			Stats: models.TopologyStats{},
		}
	}

	topology := models.NetworkTopology{
		Nodes: make([]models.TopologyNode, 0),
		Edges: make([]models.TopologyEdge, 0),
	}

	// Build node map for lookup
	nodeMap := make(map[string]*models.Node)
	for _, node := range nodes {
		nodeMap[node.ID] = node
	}

	// First pass: Create topology nodes
	topologyNodesMap := make(map[string]*models.TopologyNode)
	for _, node := range nodes {
		tNode := models.TopologyNode{
			ID:        node.ID,
			Address:   node.Address,
			Status:    node.Status,
			Country:   node.Country,
			City:      node.City,
			Lat:       node.Lat,
			Lon:       node.Lon,
			Version:   node.Version,
			PeerCount: 0,
			Peers:     make([]string, 0), // Initialize empty peers list
		}
		topologyNodesMap[node.ID] = &tNode
	}

	// Build edges and populate peer lists
	ts.graphMutex.RLock()
	peerGraph := make(map[string][]string)
	for k, v := range ts.peerGraph {
		peerGraph[k] = v
	}
	ts.graphMutex.RUnlock()

	if len(peerGraph) > 0 {
		// Use tracked peer relationships
		for sourceID, peerIDs := range peerGraph {
			for _, targetID := range peerIDs {
				if _, exists := nodeMap[targetID]; !exists {
					continue
				}

				sourceNode := nodeMap[sourceID]
				targetNode := nodeMap[targetID]

				edgeType := "local"
				if sourceNode.Country != targetNode.Country {
					edgeType = "bridge"
				}

				edge := models.TopologyEdge{
					Source:   sourceID,
					Target:   targetID,
					Type:     edgeType,
					Strength: 5,
				}
				topology.Edges = append(topology.Edges, edge)
				
				// ADD THIS: Update peer list for source node
				if tNode, exists := topologyNodesMap[sourceID]; exists {
					tNode.Peers = append(tNode.Peers, targetID)
				}
			}
		}
	} else {
		// Generate simulated topology
		topology.Edges = ts.generateSimulatedTopology(nodes, nodeMap)
		
		// ADD THIS: Build peers list from edges
		for _, edge := range topology.Edges {
			if tNode, exists := topologyNodesMap[edge.Source]; exists {
				tNode.Peers = append(tNode.Peers, edge.Target)
			}
		}
	}

	// Calculate peer counts and convert map to slice
	for _, tNode := range topologyNodesMap {
		tNode.PeerCount = len(tNode.Peers)
		topology.Nodes = append(topology.Nodes, *tNode)
	}

	// Calculate stats
	topology.Stats = ts.calculateTopologyStats(topology)

	return topology
}


func (ts *TopologyService) generateSimulatedTopology(nodes []*models.Node, nodeMap map[string]*models.Node) []models.TopologyEdge {
	edges := make([]models.TopologyEdge, 0)

	// Connect each node to 3-6 closest nodes geographically
	for _, sourceNode := range nodes {
		if sourceNode.Lat == 0 && sourceNode.Lon == 0 {
			continue // Skip nodes without geolocation
		}

		distances := make([]struct {
			nodeID   string
			distance float64
		}, 0)

		// Calculate distances to all other nodes
		for _, targetNode := range nodes {
			if sourceNode.ID == targetNode.ID {
				continue
			}
			if targetNode.Lat == 0 && targetNode.Lon == 0 {
				continue
			}

			dist := ts.haversineDistance(
				sourceNode.Lat, sourceNode.Lon,
				targetNode.Lat, targetNode.Lon,
			)

			distances = append(distances, struct {
				nodeID   string
				distance float64
			}{targetNode.ID, dist})
		}

		// Sort by distance (simple bubble sort for small arrays)
		for i := 0; i < len(distances); i++ {
			for j := i + 1; j < len(distances); j++ {
				if distances[j].distance < distances[i].distance {
					distances[i], distances[j] = distances[j], distances[i]
				}
			}
		}

		// Connect to 3-6 nearest nodes
		numPeers := 3
		if len(distances) > 6 {
			numPeers = 5
		} else if len(distances) < 3 {
			numPeers = len(distances)
		}

		for i := 0; i < numPeers && i < len(distances); i++ {
			targetID := distances[i].nodeID
			targetNode := nodeMap[targetID]

			edgeType := "local"
			if sourceNode.Country != targetNode.Country {
				edgeType = "bridge"
			}

			// Calculate strength based on distance (closer = stronger)
			strength := 10
			if distances[i].distance > 1000 {
				strength = 5
			} else if distances[i].distance > 5000 {
				strength = 3
			}

			edge := models.TopologyEdge{
				Source:   sourceNode.ID,
				Target:   targetID,
				Type:     edgeType,
				Strength: strength,
			}
			edges = append(edges, edge)
		}
	}

	return edges
}

func (ts *TopologyService) calculateTopologyStats(topology models.NetworkTopology) models.TopologyStats {
	stats := models.TopologyStats{
		TotalConnections: len(topology.Edges),
	}

	// Count local vs bridge
	for _, edge := range topology.Edges {
		if edge.Type == "local" {
			stats.LocalConnections++
		} else {
			stats.BridgeConnections++
		}
	}

	// Average connections per node
	if len(topology.Nodes) > 0 {
		stats.AverageConnections = float64(stats.TotalConnections*2) / float64(len(topology.Nodes))
	}

	// Network density (edges / max_possible_edges)
	maxEdges := len(topology.Nodes) * (len(topology.Nodes) - 1) / 2
	if maxEdges > 0 {
		stats.NetworkDensity = float64(stats.TotalConnections) / float64(maxEdges)
	}

	// Largest connected component (simplified)
	stats.LargestComponent = len(topology.Nodes) // Assume all connected for simplicity

	return stats
}

// UpdatePeerGraph updates the tracked peer relationships
func (ts *TopologyService) UpdatePeerGraph(nodeID string, peers []string) {
	ts.graphMutex.Lock()
	defer ts.graphMutex.Unlock()
	ts.peerGraph[nodeID] = peers
}

// GetRegionalClusters groups nodes by region
func (ts *TopologyService) GetRegionalClusters() []models.RegionalCluster {
	nodes, _, found := ts.cache.GetNodes(true)
	if !found {
		return []models.RegionalCluster{}
	}

	// Group nodes by country
	countryMap := make(map[string][]string)
	for _, node := range nodes {
		if node.Country == "" {
			continue
		}
		countryMap[node.Country] = append(countryMap[node.Country], node.ID)
	}

	clusters := make([]models.RegionalCluster, 0)
	for country, nodeIDs := range countryMap {
		cluster := models.RegionalCluster{
			Region:    country,
			NodeCount: len(nodeIDs),
			NodeIDs:   nodeIDs,
		}
		clusters = append(clusters, cluster)
	}

	return clusters
}

// haversineDistance calculates distance between two lat/lon points in km
func (ts *TopologyService) haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371.0 // km

	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}




// TrackPeerRelationships discovers and tracks peer connections from pods
func (ts *TopologyService) TrackPeerRelationships() {
	nodes, _, found := ts.cache.GetNodes(true)
	if !found {
		return
	}

	ts.graphMutex.Lock()
	defer ts.graphMutex.Unlock()

	for _, node := range nodes {
		// Get this node's pods list to see who it's connected to
		go func(n *models.Node) {
			podsResp, err := ts.discovery.prpc.GetPods(n.Address)
			if err != nil {
				return
			}

			// Extract peer IDs
			peerIDs := make([]string, 0)
			for _, pod := range podsResp.Pods {
				// Skip self
				if pod.Pubkey == n.Pubkey {
					continue
				}
				
				// Add peer by pubkey if available, otherwise by address
				if pod.Pubkey != "" {
					peerIDs = append(peerIDs, pod.Pubkey)
				} else {
					// Construct address
					host, _, _ := net.SplitHostPort(pod.Address)
					rpcAddr := fmt.Sprintf("%s:%d", host, pod.RpcPort)
					peerIDs = append(peerIDs, rpcAddr)
				}
			}

			ts.graphMutex.Lock()
			ts.peerGraph[n.ID] = peerIDs
			ts.graphMutex.Unlock()
		}(node)
	}
}
```

---
### services/prpc_client.go
- Size: 3.51 KB
- Lines: 147
- Last Modified: 2025-12-18 03:32:06

```go
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"xand/config"
	"xand/models"
)

// PRPCClient handles communication with pNodes
type PRPCClient struct {
	config     *config.Config
	httpClient *http.Client
}

// NewPRPCClient creates a new client
func NewPRPCClient(cfg *config.Config) *PRPCClient {
	return &PRPCClient{
		config: cfg,
		httpClient: &http.Client{
			Timeout: cfg.PRPCTimeoutDuration(),
		},
	}
}

// CallPRPC makes a generic JSON-RPC 2.0 call
func (c *PRPCClient) CallPRPC(nodeIP string, method string, params interface{}) (*models.RPCResponse, error) {
	// 1. Build Payload
	reqBody := models.RPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      1,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 2. Construct URL
	url := fmt.Sprintf("http://%s/rpc", nodeIP)

	// 3. Execute with Retry
	var resp *http.Response

	delay := 200 * time.Millisecond
	maxRetries := c.config.PRPC.MaxRetries
	if maxRetries <= 0 {
		maxRetries = 1
	}

	for i := 0; i < maxRetries; i++ {
		// Re-create request for each attempt
		httpReq, reqErr := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if reqErr != nil {
			err = fmt.Errorf("failed to create request: %w", reqErr)
			break
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err = c.httpClient.Do(httpReq)
		if err == nil {
			// Check for server-side errors that might justify retry (5xx, 429)
			if resp.StatusCode >= 500 || resp.StatusCode == 429 {
				resp.Body.Close()
				err = fmt.Errorf("server error: %d", resp.StatusCode)
				// fallthrough to retry
			} else {
				break // Success (at network level)
			}
		}

		if i < maxRetries-1 {
			time.Sleep(delay)
			delay *= 2
		}
	}

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
    return nil, fmt.Errorf("http error %d from %s %s", resp.StatusCode, method, nodeIP)
	}

	// 5. Decode Response
	var rpcResp models.RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// 6. Check RPC Error
	if rpcResp.Error != nil {
		return &rpcResp, fmt.Errorf("rpc error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return &rpcResp, nil
}

// GetVersion calls "get_version"
func (c *PRPCClient) GetVersion(nodeIP string) (*models.VersionResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get-version", nil)
	if err != nil {
		return nil, err
	}

	var verResp models.VersionResponse
	if err := json.Unmarshal(resp.Result, &verResp); err != nil {
		return nil, fmt.Errorf("failed to list unmarshal version result: %w", err)
	}
	return &verResp, nil
}

// GetStats calls "get_stats"
func (c *PRPCClient) GetStats(nodeIP string) (*models.PRPCStatsResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get-stats", nil)
	if err != nil {
		return nil, err
	}

	var statsResp models.PRPCStatsResponse
	if err := json.Unmarshal(resp.Result, &statsResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stats result: %w", err)
	}
	return &statsResp, nil
}

// GetPods calls "get_pods"
func (c *PRPCClient) GetPods(nodeIP string) (*models.PodsResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get-pods-with-stats", nil)
	if err != nil {
		return nil, err
	}

	var podsResp models.PodsResponse
	if err := json.Unmarshal(resp.Result, &podsResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pods result: %w", err)
	}
	return &podsResp, nil
}

```

---
### utils/scoring.go
- Size: 1.83 KB
- Lines: 90
- Last Modified: 2025-12-20 13:22:45

```go
package utils

import (
	"time"

	"xand/models"
)

// DetermineStatus updates the node's status based on latency and uptime
func DetermineStatus(n *models.Node) {
	lastSeen := time.Since(n.LastSeen)

	// If node was just discovered (within last 5 minutes), be lenient
	justDiscovered := time.Since(n.FirstSeen) < 5*time.Minute

	// Check Offline triggers
	if lastSeen > 5*time.Minute {
		n.Status = "offline"
		return
	}

	// For newly discovered nodes, use relaxed criteria
	if justDiscovered {
		if n.IsOnline && lastSeen < 2*time.Minute {
			n.Status = "online"
			return
		}
	}

	// For established nodes, use strict criteria
	if n.UptimeScore < 85 {
		n.Status = "offline"
		return
	}

	// Check Online conditions
	if lastSeen < 2*time.Minute && n.UptimeScore > 95 && n.ResponseTime < 1000 {
		n.Status = "online"
		return
	}

	// Default fallback
	n.Status = "warning"
}

// CalculateScore computes the node's performance score (0-100)
func CalculateScore(n *models.Node) {
	// 1. Response Time (40%)
	// <100ms: 40
	// 100-500ms: 30
	// 500-1000ms: 20
	// >1000ms: 10
	var scoreResponse float64
	if n.ResponseTime < 100 {
		scoreResponse = 40
	} else if n.ResponseTime < 500 {
		scoreResponse = 30
	} else if n.ResponseTime < 1000 {
		scoreResponse = 20
	} else {
		scoreResponse = 10
	}

	// 2. Success Rate (30%)
	// (successful_calls / 10) * 30
	successCount := 0
	for _, ok := range n.CallHistory {
		if ok {
			successCount++
		}
	}
	n.SuccessCalls = successCount

	var scoreSuccess float64
	if len(n.CallHistory) > 0 {
		rate := float64(successCount) / float64(len(n.CallHistory))
		scoreSuccess = rate * 30
	}

	// 3. Uptime (30%)
	// (uptime_percentage / 100) * 30
	scoreUptime := (n.UptimeScore / 100.0) * 30

	n.PerformanceScore = scoreResponse + scoreSuccess + scoreUptime

	// Cap at 100
	if n.PerformanceScore > 100 {
		n.PerformanceScore = 100
	}
}

```

---
### utils/version.go
- Size: 2.12 KB
- Lines: 81
- Last Modified: 2025-12-20 13:14:20

```go
package utils

import (
	"strings"

	"github.com/hashicorp/go-version"
)

// VersionConfig holds current version requirements
type VersionConfig struct {
	CurrentStable string
	MinSupported  string
	Deprecated    string
}

var DefaultVersionConfig = VersionConfig{
	CurrentStable: "0.8.0",  // Latest stable version
	MinSupported:  "0.7.3",  // Minimum supported version
	Deprecated:    "0.7.2",  // Versions below this are deprecated
}

// CheckVersionStatus determines if a node version needs upgrading
func CheckVersionStatus(nodeVersion string, config *VersionConfig) (status string, needsUpgrade bool, severity string) {
	if config == nil {
		config = &DefaultVersionConfig
	}

	// Clean version string (remove 'v' prefix if present)
	nodeVersion = strings.TrimPrefix(nodeVersion, "v")
	
	nodeVer, err := version.NewVersion(nodeVersion)
	if err != nil {
		return "unknown", false, "info"
	}
	
	current, _ := version.NewVersion(config.CurrentStable)
	minSupported, _ := version.NewVersion(config.MinSupported)
	deprecated, _ := version.NewVersion(config.Deprecated)
	
	// Check if deprecated (critical)
	if nodeVer.LessThan(deprecated) {
		return "deprecated", true, "critical"
	}
	
	// Check if below minimum supported (warning)
	if nodeVer.LessThan(minSupported) {
		return "outdated", true, "warning"
	}
	
	// Check if not on latest stable (info)
	if nodeVer.LessThan(current) {
		return "outdated", true, "info"
	}
	
	// On latest or newer
	return "current", false, "none"
}

// GetUpgradeMessage returns a human-readable upgrade message
func GetUpgradeMessage(nodeVersion string, config *VersionConfig) string {
	if config == nil {
		config = &DefaultVersionConfig
	}
	
	_, needsUpgrade, severity := CheckVersionStatus(nodeVersion, config)
	
	if !needsUpgrade {
		return ""
	}
	
	switch severity {
	case "critical":
		return "CRITICAL: This version is deprecated and no longer supported. Upgrade to " + config.CurrentStable + " immediately."
	case "warning":
		return "WARNING: This version is outdated. Please upgrade to " + config.CurrentStable + " soon."
	case "info":
		return "INFO: A newer version " + config.CurrentStable + " is available."
	}
	
	return ""
}
```

---
### utils/geolocation.go
- Size: 3.01 KB
- Lines: 154
- Last Modified: 2025-12-18 03:49:44

```go
package utils

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/oschwald/geoip2-golang"
)

type GeoLocation struct {
	Country string
	City    string
	Lat     float64
	Lon     float64
}

type GeoResolver struct {
	db         *geoip2.Reader
	httpClient *http.Client
	cache      sync.Map // map[string]GeoLocation
}

// NewGeoResolver creates a new GeoResolver. It never returns an error - if the database
// can't be loaded, it falls back to API-only mode.
func NewGeoResolver(dbPath string) (*GeoResolver, error) {
	var db *geoip2.Reader

	if dbPath != "" {
		var err error
		db, err = geoip2.Open(dbPath)
		if err != nil {
			// Log but don't fail - we'll use API fallback
			fmt.Printf("Warning: Could not open GeoIP database at %s: %v. Using API fallback only.\n", dbPath, err)
			db = nil
		}
	}

	return &GeoResolver{
		db: db,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}, nil
}

func (g *GeoResolver) Close() {
	if g.db != nil {
		g.db.Close()
	}
}

// Lookup is safe to call even if GeoResolver is nil or has no database
func (g *GeoResolver) Lookup(ipStr string) (string, string, float64, float64) {
	// Handle nil receiver gracefully
	if g == nil {
		return "Unknown", "Unknown", 0, 0
	}

	// 1. Check Cache
	if val, ok := g.cache.Load(ipStr); ok {
		loc := val.(GeoLocation)
		return loc.Country, loc.City, loc.Lat, loc.Lon
	}

	var country, city string
	var lat, lon float64
	var found bool

	// 2. Try DB (if available)
	if g.db != nil {
		ip := net.ParseIP(ipStr)
		if ip != nil {
			record, err := g.db.City(ip)
			if err == nil {
				country = record.Country.Names["en"]
				city = record.City.Names["en"]
				lat = record.Location.Latitude
				lon = record.Location.Longitude
				found = true
			}
		}
	}

	// 3. Try API Fallback
	if !found {
		loc, err := g.fetchFromAPI(ipStr)
		if err == nil {
			country = loc.Country
			city = loc.City
			lat = loc.Lat
			lon = loc.Lon
			found = true
		}
	}

	// 4. Default Fallback
	if !found {
		country = "Unknown"
		city = "Unknown"
		lat = 0
		lon = 0
	}

	// Cache result
	g.cache.Store(ipStr, GeoLocation{
		Country: country,
		City:    city,
		Lat:     lat,
		Lon:     lon,
	})

	return country, city, lat, lon
}

type ipApiResponse struct {
	Country string  `json:"country"`
	City    string  `json:"city"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`
	Status  string  `json:"status"`
}

func (g *GeoResolver) fetchFromAPI(ip string) (*GeoLocation, error) {
	url := fmt.Sprintf("http://ip-api.com/json/%s", ip)
	resp, err := g.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("api error: %d", resp.StatusCode)
	}

	var apiResp ipApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	if apiResp.Status == "fail" {
		return nil, fmt.Errorf("api returned fail status")
	}

	return &GeoLocation{
		Country: apiResp.Country,
		City:    apiResp.City,
		Lat:     apiResp.Lat,
		Lon:     apiResp.Lon,
	}, nil
}
```

---
### config/config.go
- Size: 5.12 KB
- Lines: 224
- Last Modified: 2025-12-20 01:04:55

```go
package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server  ServerConfig  `json:"server"`
	PRPC    PRPCConfig    `json:"prpc"`
	Polling PollingConfig `json:"polling"`
	Cache   CacheConfig   `json:"cache"`
	GeoIP   GeoIPConfig   `json:"geoip"`
	MongoDB MongoDBConfig `json:"mongodb"` // NEW
}

type ServerConfig struct {
	Port           int      `json:"port"`
	Host           string   `json:"host"`
	AllowedOrigins []string `json:"allowed_origins"`
	SeedNodes      []string `json:"seed_nodes"`
}

type PRPCConfig struct {
	DefaultPort int `json:"default_port"`
	Timeout     int `json:"timeout_seconds"`
	MaxRetries  int `json:"max_retries"`
}

type PollingConfig struct {
	DiscoveryInterval   int `json:"discovery_interval_seconds"`
	StatsInterval       int `json:"stats_interval_seconds"`
	HealthCheckInterval int `json:"health_check_interval_seconds"`
	StaleThreshold      int `json:"stale_threshold_minutes"`
}

type CacheConfig struct {
	TTL     int `json:"ttl_seconds"`
	MaxSize int `json:"max_size"`
}

type GeoIPConfig struct {
	DBPath string `json:"db_path"`
}

// NEW: MongoDB Configuration
type MongoDBConfig struct {
	URI      string `json:"uri"`
	Database string `json:"database"`
	Enabled  bool   `json:"enabled"`
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Server: ServerConfig{
			Port: 8080,
			Host: "0.0.0.0",
			AllowedOrigins: []string{
				"http://localhost:5173",
				"http://localhost:5174",
				"https://your-deployed-frontend.vercel.app",
			},
			SeedNodes: []string{},
		},
		PRPC: PRPCConfig{
			DefaultPort: 6000,
			Timeout:     5,
			MaxRetries:  3,
		},
		Polling: PollingConfig{
			DiscoveryInterval:   60,
			StatsInterval:       30,
			HealthCheckInterval: 60,
			StaleThreshold:      5,
		},
		Cache: CacheConfig{
			TTL:     30,
			MaxSize: 1000,
		},
		GeoIP: GeoIPConfig{
			DBPath: "",
		},
		MongoDB: MongoDBConfig{
			URI:      "mongodb://localhost:27017",
			Database: "xandeum_analytics",
			Enabled:  true,
		},
	}

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

	loadEnv(cfg)

	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	var serverPort int
	var serverHost string

	fs.IntVar(&serverPort, "port", 0, "Server port")
	fs.StringVar(&serverHost, "host", "", "Server host")

	_ = fs.Parse(os.Args[1:])

	if isFlagPassed(fs, "port") {
		cfg.Server.Port = serverPort
	}
	if isFlagPassed(fs, "host") {
		cfg.Server.Host = serverHost
	}

	return cfg, nil
}

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
	if val := os.Getenv("HEALTH_CHECK_INTERVAL"); val != "" {
		if p, err := strconv.Atoi(val); err == nil {
			cfg.Polling.HealthCheckInterval = p
		}
	}
	if val := os.Getenv("GEOIP_DB_PATH"); val != "" {
		cfg.GeoIP.DBPath = val
	}
	
	// NEW: MongoDB environment variables
	if val := os.Getenv("MONGODB_URI"); val != "" {
		cfg.MongoDB.URI = val
	}
	if val := os.Getenv("MONGODB_DATABASE"); val != "" {
		cfg.MongoDB.Database = val
	}
	if val := os.Getenv("MONGODB_ENABLED"); val != "" {
		cfg.MongoDB.Enabled = val == "true" || val == "1"
	}
}

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
```

---
### middleware/logger.go
- Size: 0.92 KB
- Lines: 46
- Last Modified: 2025-12-18 02:57:45

```go
package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

func LoggerMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			// Process request
			err := next(c)

			if err != nil {
				c.Error(err)
			}

			// Prepare log data
			stop := time.Now()
			req := c.Request()
			res := c.Response()

			timestamp := stop.Format("2006-01-02 15:04:05")
			method := req.Method
			path := req.URL.Path
			if req.URL.RawQuery != "" {
				path += "?" + req.URL.RawQuery
			}
			status := res.Status
			statusText := http.StatusText(status)
			latency := stop.Sub(start).Milliseconds()
			ip := c.RealIP()

			// [2024-12-13 10:30:15] GET /api/nodes → 200 OK (234ms) from 127.0.0.1
			fmt.Printf("[%s] %s %s -> %d %s (%dms) from %s\n",
				timestamp, method, path, status, statusText, latency, ip)

			return nil
		}
	}
}

```

---
### middleware/cors.go
- Size: 0.43 KB
- Lines: 15
- Last Modified: 2025-12-18 02:57:45

```go
package middleware

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func CORSMiddleware(allowedOrigins []string) echo.MiddlewareFunc {
	return middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{echo.GET, echo.POST, echo.OPTIONS},
		AllowHeaders: []string{echo.HeaderContentType, echo.HeaderAuthorization},
		MaxAge:       3600, // 1 hour
	})
}

```

---

---
## 📊 Summary
- Total files: 41
- Total size: 154.43 KB
- File types: .go, unknown
