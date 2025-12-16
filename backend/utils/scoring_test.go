package utils

import (
	"testing"
	"time"

	"xand/models"
)

func TestDetermineStatus(t *testing.T) {
	tests := []struct {
		name       string
		n          *models.Node
		wantStatus string
	}{
		{
			name: "Status Online",
			n: &models.Node{
				LastSeen:     time.Now(), // < 2m
				UptimeScore:  96,         // > 95
				ResponseTime: 50,         // < 1000
			},
			wantStatus: "online",
		},
		{
			name: "Status Offline by Time",
			n: &models.Node{
				LastSeen:    time.Now().Add(-6 * time.Minute), // > 5m
				UptimeScore: 100,
			},
			wantStatus: "offline",
		},
		{
			name: "Status Offline by Uptime",
			n: &models.Node{
				LastSeen:    time.Now(),
				UptimeScore: 80, // < 85
			},
			wantStatus: "offline",
		},
		{
			name: "Status Warning (Latency)",
			n: &models.Node{
				LastSeen:     time.Now(),
				UptimeScore:  96,
				ResponseTime: 1500, // > 1000
			},
			wantStatus: "warning",
		},
		{
			name: "Status Warning (Uptime)",
			n: &models.Node{
				LastSeen:     time.Now(),
				UptimeScore:  90, // 85-95
				ResponseTime: 50,
			},
			wantStatus: "warning",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			DetermineStatus(tt.n)
			if tt.n.Status != tt.wantStatus {
				t.Errorf("got %s, want %s", tt.n.Status, tt.wantStatus)
			}
		})
	}
}

func TestCalculateScore(t *testing.T) {
	// Case 1: Perfect Node
	// Response < 100 -> 40
	// Success 10/10 -> 30
	// Uptime 100 -> 30
	// Total -> 100
	n1 := &models.Node{
		ResponseTime: 50,
		CallHistory:  []bool{true, true, true, true, true, true, true, true, true, true},
		UptimeScore:  100,
	}
	CalculateScore(n1)
	if n1.PerformanceScore != 100 {
		t.Errorf("Perfect node score: got %.2f, want 100", n1.PerformanceScore)
	}

	// Case 2: Poor Node
	// Response > 1000 -> 10
	// Success 5/10 -> 15
	// Uptime 50 -> 15
	// Total -> 40
	n2 := &models.Node{
		ResponseTime: 1200,
		CallHistory:  []bool{true, false, true, false, true, false, true, false, true, false},
		UptimeScore:  50,
	}
	CalculateScore(n2)
	if n2.PerformanceScore != 40 {
		t.Errorf("Poor node score: got %.2f, want 40", n2.PerformanceScore)
	}
}
