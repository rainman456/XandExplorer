/**
 * TypeScript types matching the Xandeum backend API schema
 * These types correspond to the Go models in backend/models/
 */

// ============================================================================
// Alert Types
// ============================================================================

export type AlertRuleType = 'node_status' | 'network_health' | 'storage_threshold' | 'latency_spike';

export interface AlertAction {
    type: string;
    config: Record<string, any>;
}

export interface Alert {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    rule_type: AlertRuleType;
    conditions: Record<string, any>;
    actions: AlertAction[];
    cooldown_minutes: number;
    last_fired: string;
    created_at: string;
    updated_at: string;
}

export interface CreateAlertRequest {
    name: string;
    description: string;
    enabled: boolean;
    rule_type: AlertRuleType;
    conditions: Record<string, any>;
    actions: AlertAction[];
    cooldown_minutes: number;
}

export interface AlertHistoryItem {
    id: string;
    alert_id: string;
    alert_name: string;
    timestamp: string;
    condition: string;
    triggered_by: Record<string, any>;
    success: boolean;
    error_msg: string;
}

export interface TestAlertResponse {
    alert: Alert;
    message: string;
}

// ============================================================================
// Node Types
// ============================================================================

export interface GeoInfo {
    region: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
}

export interface NodeAddress {
    address: string;
    ip: string;
    port: number;
    type: string;
    is_public: boolean;
    last_seen: string;
    is_working: boolean;
}

export interface PNode {
    id: string;
    pubkey: string;
    addresses: NodeAddress[];
    ip: string;
    port: number;
    address: string;
    version: string;
    is_online: boolean;
    is_public: boolean;
    last_seen: string;
    first_seen: string;
    status: string;
    country: string;
    city: string;
    lat: number;
    lon: number;
    cpu_percent: number;
    ram_used: number; // bytes
    ram_total: number; // bytes
    storage_capacity: number; // bytes
    storage_used: number; // bytes
    storage_usage_percent: number;
    uptime_seconds: number;
    packets_received: number;
    packets_sent: number;
    uptime_score: number;
    performance_score: number;
    response_time: number;
    credits: number;
    credits_rank: number;
    credits_change: number;
    total_stake: number;
    commission: number;
    apy: number;
    boost_factor: number;
    version_status: string;
    is_upgrade_needed: boolean;
    upgrade_severity: string;
    upgrade_message: string;

    // Legacy fields handling for backward compatibility during migration
    ip_address?: string; // Mapped to ip
    gossip_port?: number;
    rpc_port?: number; // Mapped to port
    is_registered?: boolean; // Inferred from credits > 0
    total_storage_tb?: number; // Deprecated
    used_storage_tb?: number; // Deprecated
    uptime_percent?: number; // Deprecated
    cpu_usage_percent?: number; // Deprecated
    ram_usage_percent?: number; // Deprecated
    last_seen_ts?: number; // Deprecated
    latency_ms?: number; // Deprecated
    geo_info?: GeoInfo; // Deprecated
    node_pubkey?: string; // Some views use this alias
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface NodesResponse {
    nodes: PNode[];
    pagination: PaginationMeta;
}

export interface NodesQueryParams {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    include_offline?: boolean;
}

// ============================================================================
// Backend Status Types
// ============================================================================

export interface BackendStatus {
    status: string;
    uptime: string; // TODO: Backend should return number (app start time)
    knownNodes: number;
    cacheStatus: string;
    timestamp: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface NetworkStats {
    total_nodes: number;
    online_nodes: number;
    warning_nodes: number;
    offline_nodes: number;
    public_nodes: number;
    private_nodes: number;
    total_storage_pb: number;
    used_storage_pb: number;
    average_uptime: number;
    average_performance: number;
    total_stake: number;
    network_health: number;
    last_updated: string;
}

export type LatencyDistribution = Record<string, number>;

// ============================================================================
// History Types
// ============================================================================

export interface NetworkSnapshot {
    timestamp: string;
    total_nodes: number;
    online_nodes: number;
    warning_nodes: number;
    offline_nodes: number;
    total_storage_pb: number;
    used_storage_pb: number;
    average_latency: number;
    network_health: number;
    total_stake: number;
    average_uptime: number;
    average_performance: number;
}

export interface NodeHistoryPoint {
    timestamp: string;
    node_id: string;
    status: string;
    response_time: number;
    cpu_percent: number;
    ram_used: number;
    storage_used: number;
    uptime_score: number;
    performance_score: number;
}

export interface CapacityForecast {
    current_usage_pb: number;
    current_capacity_pb: number;
    growth_rate_pb_per_day: number;
    days_to_saturation: number;
    saturation_date?: string;
    confidence: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface DailyHealthMetric {
    date: string; // ISO 8601 date string
    avg_health: number;
    avg_online_nodes: number;
    avg_total_nodes: number;
    max_storage_used: number;
    min_network_health: number;
    max_network_health: number;
}

export interface StorageGrowthPoint {
    date: string;
    total_storage_tb: number;
    used_storage_tb: number;
    growth_rate: number;
}

export interface StorageGrowthMetrics {
    start_date: string;
    end_date: string;
    start_storage_pb: number;
    end_storage_pb: number;
    growth_pb: number;
    growth_percentage: number;
    growth_rate_per_day: number;
    days_analyzed: number;
}

export interface HighUptimeNode {
    node_id: string;
    avg_uptime: number;
    avg_performance: number;
    total_checks: number;
    online_count: number;
}

export interface WeeklyMetrics {
    start_date: string;
    end_date: string;
    avg_health: number;
    avg_online_nodes: number;
    avg_total_nodes: number;
    avg_storage_used: number;
    avg_storage_total: number;
}

export interface WeeklyComparison {
    this_week: WeeklyMetrics;
    last_week: WeeklyMetrics;
    health_change: number;
    storage_change: number;
    nodes_change: number;
}

export interface NodeSnapshot {
    timestamp: string;
    node_id: string;
    status: string;
    response_time: number;
    cpu_percent: number;
    ram_used: number;
    storage_used: number;
    uptime_score: number;
    performance_score: number;
}

export interface InactiveNode {
    node_id: string;
    first_seen: string;
    last_snapshot: NodeSnapshot;
    days_since_seen: number;
    status: string;
}

export interface NodeGraveyard {
    inactive_days_threshold: number;
    total_inactive_nodes: number;
    nodes: InactiveNode[];
}

// ============================================================================
// Credits Types
// ============================================================================

export interface NodeCredits {
    pubkey: string;
    credits: number;
    rank: number;
    last_updated: number;
}

export interface AllCreditsResponse {
    total: number;
    credits: NodeCredits[];
}

export interface TopCreditsResponse {
    limit: number;
    count: number;
    top_credits: NodeCredits[];
}

export interface RankCreditsResponse {
    start_rank: number;
    end_rank: number;
    count: number;
    credits: NodeCredits[];
}

export interface CreditsStats {
    total_nodes: number;
    total_credits: number;
    average_credits: number;
    median_credits: number;
    max_credits: number;
    min_credits: number;
}

// ============================================================================
// Topology Types
// ============================================================================

export interface TopologyNode {
    id: string;
    address: string;
    status: string;
    country: string;
    city: string;
    lat: number;
    lon: number;
    version: string;
    peer_count: number;
    peers: string[];
}

export interface TopologyEdge {
    source: string;
    target: string;
    type: 'local' | 'bridge';
    strength: number;
}

export interface TopologyStats {
    total_connections: number;
    local_connections: number;
    bridge_connections: number;
    average_connections_per_node: number;
    network_density: number;
    largest_component: number;
}

export interface NetworkTopology {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    stats: TopologyStats;
}

export interface RegionalCluster {
    region: string;
    node_count: number;
    node_ids: string[];
    internal_edges: number;
    external_edges: number;
}

// ============================================================================
// System Types
// ============================================================================

export interface CacheStats {
    mode: string;
    enabled: boolean;
    redis_keys: number;
    in_memory_keys: number;
}

export interface CacheStatus {
    mode: 'redis' | 'in-memory';
    healthy: boolean;
    stats: CacheStats;
}

// ============================================================================
// Calculator Types
// ============================================================================

export interface CostProvider {
    name: string;
    monthly_cost_usd: number;
    yearly_cost_usd: number;
    features: string[];
    notes: string;
}

export interface CostComparison {
    storage_amount_tb: number;
    duration: string;
    providers: CostProvider[];
    recommendation: string;
}

export interface ROIEstimate {
    storage_commitment_tb: number;
    uptime_percent: number;
    monthly_xand: number;
    monthly_usd: number;
    yearly_xand: number;
    yearly_usd: number;
    monthly_costs_usd: number;
    net_profit_monthly: number;
    break_even_months: number;
    xand_price_usd: number;
    reward_per_tb_per_day: number;
}

export interface RedundancySimulation {
    replication_factor: number;
    data_size_tb: number;
    total_storage_needed_tb: number;
    estimated_cost: number;
    failure_tolerance: number;
}

// ============================================================================
// Cross-Chain Comparison Types
// ============================================================================

export interface CrossChainComparison {
    network: string;
    total_nodes: number;
    total_storage_tb: number;
    avg_latency_ms: number;
    decentralization_score: number;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// ============================================================================
// RPC Types (JSON-RPC 2.0)
// ============================================================================

export interface RPCRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id: number | string;
}

export interface RPCResponse<T = any> {
    jsonrpc: '2.0';
    result?: T;
    error?: RPCError;
    id: number | string | null;
}

export interface RPCError {
    code: number;
    message: string;
    data?: any;
}

// ============================================================================
// Utility Types
// ============================================================================

export type NodeStatus = 'active' | 'delinquent' | 'offline';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'node_down' | 'high_latency' | 'storage_full' | 'custom';
