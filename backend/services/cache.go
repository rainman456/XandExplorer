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
