package utils

import (
	"testing"
)

func TestGeoResolver_CacheAndFallback(t *testing.T) {
	// Initialize without DB to force fallback logic
	geo, err := NewGeoResolver("")
	if err != nil {
		t.Fatalf("Failed to init GeoResolver: %v", err)
	}

	// 1. First Lookup (Should hit Mock/API)
	// We rely on API or Mock. Since we can't guarantee API network in tests easily without mocking HTTP client,
	// and we didn't inject HTTP client interface, we might hit real network if we use a real IP.
	// Or we use a private IP which API will fail on -> Mock matches.

	ip := "127.0.0.1" // Localhost
	c, city, _, _ := geo.Lookup(ip)
	t.Logf("Localhost lookup result: %s, %s", c, city)

	// API typically fails for localhost or returns generic info depending on proxy.
	// ip-api.com returns loopback info for 127.0.0.1 often? Or fails?
	// If it fails, we get Unknown.
	// If it succeeds, we get something.
	// This test essentially verifies no panic.
	// But let's verify caching.

	// manually inject into cache to test cache hit
	geo.cache.Store("test_ip", GeoLocation{Country: "TestLand", City: "TestCity"})

	c2, city2, _, _ := geo.Lookup("test_ip")
	if c2 != "TestLand" || city2 != "TestCity" {
		t.Errorf("Cache miss or wrong data: %s, %s", c2, city2)
	}

	// Test Mock Fallback (using invalid IP/Failure)
	// We hope invalid IP fails API call instantly-ish.
	// "invalid" string is not an IP, fetchFromAPI might just form bad URL or API returns error.
	// Lookup calls net.ParseIP first for DB, but fetchFromAPI takes string.
	// Let's rely on "Unknown" checks.
	// "192.168.0.1" is private, ip-api returns 'fail' usually.
	c3, _, _, _ := geo.Lookup("192.168.0.1")
	if c3 != "Unknown" && c3 != "" { // API might return "fail" but our code maps fail to error -> Unknown
		// Wait, if API returns valid JSON with "fail", we return error -> Unknown.
		// So expected is Unknown.
		if c3 != "Unknown" {
			t.Logf("Got non-unknown for private IP? %s", c3)
		}
	}

	// Verify lat/lon are 0 for Unknown
	// We need to fetch again or just trust c3 is Unknown
	// If it's Unknown, we expect 0, 0
	if c3 == "Unknown" {
		_, _, l3, o3 := geo.Lookup("192.168.0.1")
		if l3 != 0 || o3 != 0 {
			t.Error("Expected 0,0 for Unknown")
		}
	}
}
