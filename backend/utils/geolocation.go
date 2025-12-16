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

func NewGeoResolver(dbPath string) (*GeoResolver, error) {
	var db *geoip2.Reader
	var err error

	if dbPath != "" {
		db, err = geoip2.Open(dbPath)
		if err != nil {
			// We can return error, or log and proceed without DB (fallback mode)
			// Returning error as request implies DB is expected if path provided?
			// Step 8: "Implement internal caching... Fall back to API if database missing".
			// But NewGeoResolver error usually halts startup.
			// I'll return nil error but with nil db if it fails?
			// But user main.go logs fatal on error.
			// Let's stick to existing behavior: return error if open fails.
			// User can choose empty string if they want purely API.
			return nil, err
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

func (g *GeoResolver) Lookup(ipStr string) (string, string, float64, float64) {
	// 1. Check Cache
	if val, ok := g.cache.Load(ipStr); ok {
		loc := val.(GeoLocation)
		return loc.Country, loc.City, loc.Lat, loc.Lon
	}

	var country, city string
	var lat, lon float64
	var found bool

	// 2. Try DB
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

	// 4. Mock Fallback
	if !found {
		country = "Unknown"
		city = "Unknown"
		lat = 0
		lon = 0
	}

	// Cache result (indefinitely as per requirements)
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
	// Skip private IPs or invalid for API? API handles them by erroring usually.

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
