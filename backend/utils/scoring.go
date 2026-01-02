package utils

import (
	// "log"
	"time"

	"xand/models"
)


func DetermineStatus(n *models.Node) {
    lastSeen := time.Since(n.LastSeen)
    justDiscovered := time.Since(n.FirstSeen) < 5*time.Minute

    // Base gossip thresholds: heartbeats ~30s, full propagation takes several minutes
    hasVeryRecentGossip := lastSeen < 2*time.Minute    // Strong evidence of activity
    hasRecentGossip := lastSeen < 8*time.Minute        // Reasonable window for propagation
    hasStaleGossip := lastSeen > 15*time.Minute        // Likely offline if not seen this long

    // RPC connectivity evidence
    hasRecentRPCSuccess := false
    recentFailures := 0
    lookback := 5
    if len(n.CallHistory) < lookback {
        lookback = len(n.CallHistory)
    }
    startIdx := len(n.CallHistory) - lookback
    if startIdx < 0 {
        startIdx = 0
    }
    for i := startIdx; i < len(n.CallHistory); i++ {
        if n.CallHistory[i] {
            hasRecentRPCSuccess = true
        } else {
            recentFailures++
        }
    }

    // Overall failure rate (for longer-term view)
    overallFailureRate := 0.0
    if len(n.CallHistory) > 0 {
        failures := 0
        for _, success := range n.CallHistory {
            if !success {
                failures++
            }
        }
        overallFailureRate = float64(failures) / float64(len(n.CallHistory))
    }

    // === DECISION TREE ===

    // Case 1: Never directly contacted — fully trust gossip data
    if n.TotalCalls == 0 {
        if hasStaleGossip {
            n.Status = "offline"
            n.IsOnline = false
        } else if lastSeen > 8*time.Minute {
            n.Status = "warning"
            n.IsOnline = true
        } else {
            n.Status = "online"
            n.IsOnline = true
        }
        return
    }

    // Case 2: We have direct RPC contact history

    // Strong positive: Recent successful RPC + recent gossip → definitely online
    if hasRecentRPCSuccess && hasRecentGossip {
        n.Status = "online"
        n.IsOnline = true
        return
    }

    // Common case: Active in gossip but RPC unreachable (NAT/firewall)
    // Trust gossip heavily — these nodes are healthy participants
    if hasVeryRecentGossip {
        n.Status = "warning" // or "online" if you prefer; warning is more accurate
        n.IsOnline = true
        return
    }

    if hasRecentGossip {
        if recentFailures >= 4 && overallFailureRate > 0.7 {
            n.Status = "warning"
        } else {
            n.Status = "online"
        }
        n.IsOnline = true
        return
    }

    // Degrading: Gossip getting old + poor RPC history
    if lastSeen >= 8*time.Minute && lastSeen <= 15*time.Minute {
        if overallFailureRate > 0.8 {
            n.Status = "offline"
            n.IsOnline = false
        } else {
            n.Status = "warning"
            n.IsOnline = true
        }
        return
    }

    // Clearly offline: No signs of life for 15+ minutes
    if hasStaleGossip {
        n.Status = "offline"
        n.IsOnline = false
        return
    }

    // New nodes: Be optimistic
    if justDiscovered && hasRecentGossip {
        n.Status = "online"
        n.IsOnline = true
        return
    }

    // Final fallback: Prefer warning over false offline
    if lastSeen < 15*time.Minute {
        n.Status = "warning"
        n.IsOnline = true
    } else {
        n.Status = "offline"
        n.IsOnline = false
    }
}

// CalculateScore computes the node's performance score (0-100)
func CalculateScore(n *models.Node) {
	// 1. Response Time (40%)
	var scoreResponse float64
	if n.ResponseTime < 100 {
		scoreResponse = 40
	} else if n.ResponseTime < 500 {
		scoreResponse = 30
	} else if n.ResponseTime < 1000 {
		scoreResponse = 20
	} else if n.ResponseTime < 2000 {
		scoreResponse = 10
	} else {
		scoreResponse = 5
	}

	// 2. Success Rate (30%)
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
	scoreUptime := (n.UptimeScore / 100.0) * 30

	n.PerformanceScore = scoreResponse + scoreSuccess + scoreUptime

	if n.PerformanceScore > 100 {
		n.PerformanceScore = 100
	}
}