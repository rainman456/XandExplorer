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
		log.Println("API Endpoints available:")
		log.Println("  Core:")
		log.Println("    GET  /health")
		log.Println("    GET  /api/status")
		log.Println("    GET  /api/nodes")
		log.Println("    GET  /api/nodes/:id")
		log.Println("    GET  /api/stats")
		log.Println("    POST /api/rpc")
		log.Println("  Alerts:")
		log.Println("    POST   /api/alerts")
		log.Println("    GET    /api/alerts")
		log.Println("    GET    /api/alerts/:id")
		log.Println("    PUT    /api/alerts/:id")
		log.Println("    DELETE /api/alerts/:id")
		log.Println("    GET    /api/alerts/history")
		log.Println("  History:")
		log.Println("    GET /api/history/network")
		log.Println("    GET /api/history/nodes/:id")
		log.Println("    GET /api/history/forecast")
		log.Println("    GET /api/history/latency-distribution")
		log.Println("  Calculator:")
		log.Println("    GET  /api/calculator/costs?storage_tb=X")
		log.Println("    GET  /api/calculator/roi?storage_tb=X&uptime_percent=Y")
		log.Println("    POST /api/calculator/redundancy")
		log.Println("  Topology:")
		log.Println("    GET /api/topology")
		log.Println("    GET /api/topology/regions")
		log.Println("  Comparison:")
		log.Println("    GET /api/comparison")
		
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