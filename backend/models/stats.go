package models

import "time"

// NetworkStats represents aggregated network statistics
// type NetworkStats struct {
// 	TotalNodes   int `json:"total_nodes"`
// 	OnlineNodes  int `json:"online_nodes"`
// 	WarningNodes int `json:"warning_nodes"`
// 	OfflineNodes int `json:"offline_nodes"`

// 	TotalStorage float64 `json:"total_storage_pb"` // Petabytes
// 	UsedStorage  float64 `json:"used_storage_pb"`  // Petabytes

// 	AverageUptime      float64 `json:"average_uptime"`
// 	AveragePerformance float64 `json:"average_performance"`

// 	TotalStake int64 `json:"total_stake"`

// 	NetworkHealth float64 `json:"network_health"` // 0-100

// 	LastUpdated time.Time `json:"last_updated"`
// }

type NetworkStats struct {
    // RENAME: TotalNodes → TotalPods (semantic fix)
    TotalPods    int `json:"total_pods"`    // Count of unique pubkeys
    TotalNodes   int `json:"total_nodes"`   // NEW: Count of all IPs
    
    OnlineNodes  int `json:"online_nodes"`
    WarningNodes int `json:"warning_nodes"`
    OfflineNodes int `json:"offline_nodes"`

    // CHANGE: Remove PB suffix, change to bytes
    TotalStorage float64 `json:"total_storage_bytes"` // Was: TotalStorage (PB)
    UsedStorage  float64 `json:"used_storage_bytes"`  // Was: UsedStorage (PB)

    // NEW METRIC
    AvgStorageCommittedPerPodBytes float64 `json:"average_storage_committed_per_pod_bytes"`

    AverageUptime      float64 `json:"average_uptime"`
    AveragePerformance float64 `json:"average_performance"`

    TotalStake int64 `json:"total_stake"`

    NetworkHealth float64 `json:"network_health"`

    LastUpdated time.Time `json:"last_updated"`
}