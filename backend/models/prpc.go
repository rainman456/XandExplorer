// package models

// import "encoding/json"

// // JSON-RPC 2.0 Request
// type RPCRequest struct {
// 	JSONRPC string      `json:"jsonrpc"`
// 	Method  string      `json:"method"`
// 	Params  any  `json:"params,omitempty"`
// 	ID      int         `json:"id"`
// }

// // JSON-RPC 2.0 Response
// type RPCResponse struct {
// 	JSONRPC string          `json:"jsonrpc"`
// 	Result  json.RawMessage `json:"result,omitempty"`
// 	Error   *RPCError       `json:"error,omitempty"`
// 	ID      int             `json:"id"`
// }

// // JSON-RPC 2.0 Error
// type RPCError struct {
// 	Code    int    `json:"code"`
// 	Message string `json:"message"`
// 	Data    any    `json:"data,omitempty"`
// }

// // --- Specific Response Models ---

// // VersionResponse (result of get_version)
// type VersionResponse struct {
// 	Version string `json:"version"`
// }

// // StatsResponse (result of get_stats)
// type StatsResponse struct {
// 	Metadata Metadata  `json:"metadata"`
// 	Stats    NodeStats `json:"stats"`
// 	FileSize int64     `json:"file_size"`
// }

// type Metadata struct {
// 	TotalBytes  int64 `json:"total_bytes"`
// 	TotalPages  int   `json:"total_pages"`
// 	LastUpdated int64 `json:"last_updated"`
// }

// // Stats struct already exists in models/stats.go, but we might need to unify or define specific one here.
// // Checking user request: "Stats" return structure.
// // If models/stats.go is empty/placeholder, I should probably define the detailed one there or here.
// // Given strict "models/stats.go" in file list, I'll put shared structs there or assume they might be used by DB/API too.
// // For now, I'll define the specific JSON shape here to match pNode response EXACTLY.
// // If there's a collision with `models.Stats` from other files, I'll rename or consolidate.
// // Let's check `models/stats.go` content first? It was just "package models".
// // So I will put the Stats struct detail here or in models/stats.go.
// // The user algorithm defines the shape clearly.
// // I'll put it in models/stats.go properly later?
// // Actually, let's put it here for the *response* type, or reuse if possible.
// // I'll define `NodeStats` here for the RPC response to be safe and explicit.

// type NodeStats struct {
// 	CPUPercent      float64 `json:"cpu_percent"`
// 	RAMUsed         int64   `json:"ram_used"`
// 	RAMTotal        int64   `json:"ram_total"`
// 	Uptime          int64   `json:"uptime"`
// 	PacketsReceived int64   `json:"packets_received"`
// 	PacketsSent     int64   `json:"packets_sent"`
// 	ActiveStreams   int     `json:"active_streams"`
// }

// // Redefine StatsResponse with NodeStats to avoid ambiguity
// type PRPCStatsResponse struct {
// 	Metadata Metadata  `json:"metadata"`
// 	Stats    NodeStats `json:"stats"`
// 	FileSize int64     `json:"file_size"`
// }

// // PodsResponse (result of get_pods)
// type PodsResponse struct {
// 	Pods       []Pod `json:"pods"`
// 	TotalCount int   `json:"total_count"`
// }

// type Pod struct {
// 	Address           string `json:"address"`
// 	RpcPort           int    `json:"rpc_port"`
// 	IsPublic          bool   `json:"is_public"`
// 	Version           string `json:"version"`
// 	LastSeen          string `json:"last_seen"`
// 	LastSeenTimestamp int64  `json:"last_seen_timestamp"`
// }


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