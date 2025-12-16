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
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Services
	// GeoIP
	geo, err := utils.NewGeoResolver(cfg.GeoIP.DBPath)
	if err != nil {
		log.Printf("Warning: GeoIP DB not found at %s: %v", cfg.GeoIP.DBPath, err)
	}
	defer geo.Close()

	// Clients
	prpc := services.NewPRPCClient(cfg)

	// Discovery
	discovery := services.NewNodeDiscovery(cfg, prpc, geo)

	// Aggregator
	aggregator := services.NewDataAggregator(discovery)

	// Cache
	cache := services.NewCacheService(cfg, aggregator)

	// 3. Start Background Services
	discovery.Start()
	cache.StartCacheWarmer()

	// 4. Web Server
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

	// Handlers
	h := handlers.NewHandler(cfg, cache, discovery, prpc)

	// Routes
	e.GET("/health", h.GetHealth)

	api := e.Group("/api")
	api.GET("/status", h.GetStatus)
	api.GET("/nodes", h.GetNodes)
	api.GET("/nodes/:id", h.GetNode)
	api.GET("/stats", h.GetStats)
	api.POST("/rpc", h.ProxyRPC)

	// 5. Start Server with Graceful Shutdown
	serverAddr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)

	go func() {
		log.Printf("Server running on http://%s", serverAddr)
		if err := e.Start(serverAddr); err != nil && err != http.ErrServerClosed {
			log.Fatalf("shutting down the server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 10 seconds.
	// Use a buffered channel to avoid missing signals as recommended for signal.Notify
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

	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
	log.Println("Server exited")
}
