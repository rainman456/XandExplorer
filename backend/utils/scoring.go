package utils

import (
	"time"

	"xand/models"
)

// DetermineStatus updates the node's status based on latency and uptime
func DetermineStatus(n *models.Node) {
	// Rules:
	// Online: Last RPC < 2min AND Uptime > 95% AND Response < 1000ms
	// Warning: Last RPC < 5min AND Uptime 85-95% AND Response 1000-3000ms
	// Offline: Last RPC > 5min OR Unable to connect OR Uptime < 85%

	lastSeen := time.Since(n.LastSeen)

	// Check Offline triggers first (Precedence)
	if lastSeen > 5*time.Minute || n.UptimeScore < 85 {
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
