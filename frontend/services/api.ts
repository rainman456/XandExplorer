/**
 * Centralized API service for Xandeum backend
 * Handles all HTTP requests with proper error handling and type safety
 */

import type {
    PNode,
    NetworkStats,
    NetworkSnapshot,
    NodeHistoryPoint,
    CapacityForecast,
    LatencyDistribution,
    DailyHealthMetric,
    StorageGrowthPoint,
    StorageGrowthMetrics,
    HighUptimeNode,
    WeeklyComparison,
    NodeGraveyard,
    NodeCredits,
    AllCreditsResponse,
    TopCreditsResponse,
    RankCreditsResponse,
    CreditsStats,
    NetworkTopology,
    RegionalCluster,
    CacheStatus,
    CostComparison,
    ROIEstimate,
    RedundancySimulation,
    Alert,
    AlertHistoryItem,
    TestAlertResponse,
    CrossChainComparison,
    NodesResponse,
    NodesQueryParams,
    BackendStatus,
    RPCRequest,
    RPCResponse,
} from '../types/api.types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public endpoint?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Main API Service Class
 */
class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    private async fetchApi<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    endpoint
                );
            }

            const data = await response.json();
            return data as T;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            // Network or parsing error
            throw new ApiError(
                `Failed to fetch ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undefined,
                endpoint
            );
        }
    }

    // ============================================================================
    // Core Endpoints
    // ============================================================================

    /**
     * Get all nodes in the network (Paginated)
     */
    async getNodes(params?: NodesQueryParams): Promise<NodesResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.status) queryParams.set('status', params.status);
        if (params?.sort) queryParams.set('sort', params.sort);
        if (params?.order) queryParams.set('order', params.order);
        if (params?.include_offline !== undefined) {
            queryParams.set('include_offline', params.include_offline.toString());
        }

        const query = queryParams.toString();
        return this.fetchApi<NodesResponse>(`/api/nodes${query ? `?${query}` : ''}`);
    }

    /**
     * Get a specific node by pubkey
     */
    async getNode(pubkey: string): Promise<PNode> {
        return this.fetchApi<PNode>(`/api/nodes/${encodeURIComponent(pubkey)}`);
    }

    /**
     * Get network statistics
     */
    async getStats(): Promise<NetworkStats> {
        return this.fetchApi<NetworkStats>('/api/stats');
    }

    /**
     * Get backend system status
     */
    async getStatus(): Promise<BackendStatus> {
        return this.fetchApi<BackendStatus>('/api/status');
    }

    /**
     * Get cache service status and statistics
     */
    async getCacheStatus(): Promise<CacheStatus> {
        return this.fetchApi<CacheStatus>('/cache/status');
    }

    /**
     * Health check
     */
    async getHealth(): Promise<{ status: string }> {
        return this.fetchApi('/health');
    }

    // ============================================================================
    // History Endpoints
    // ============================================================================

    /**
     * Get network history snapshots
     */
    async getNetworkHistory(params?: {
        start?: number;
        end?: number;
        interval?: string;
    }): Promise<NetworkSnapshot[]> {
        const queryParams = new URLSearchParams();
        if (params?.start) queryParams.set('start', params.start.toString());
        if (params?.end) queryParams.set('end', params.end.toString());
        if (params?.interval) queryParams.set('interval', params.interval);

        const query = queryParams.toString();
        return this.fetchApi<NetworkSnapshot[]>(
            `/api/history/network${query ? `?${query}` : ''}`
        );
    }

    /**
     * Get node history
     * @param id - Node ID
     * @param hours - Hours of history (default: 24)
     */
    async getNodeHistory(id: string, hours?: number): Promise<NodeHistoryPoint[]> {
        const query = hours ? `?hours=${hours}` : '';
        return this.fetchApi<NodeHistoryPoint[]>(`/api/history/nodes/${encodeURIComponent(id)}${query}`);
    }

    /**
     * Get capacity forecast
     * Predicts when network storage will reach capacity
     */
    async getCapacityForecast(): Promise<CapacityForecast> {
        return this.fetchApi<CapacityForecast>('/api/forecast');
    }

    /**
     * Get latency distribution histogram
     * Returns histogram of node latencies across different time ranges
     */
    async getLatencyDistribution(): Promise<LatencyDistribution> {
        return this.fetchApi<LatencyDistribution>('/api/history/latency-distribution');
    }

    // ============================================================================
    // Analytics Endpoints
    // ============================================================================

    /**
     * Get daily health metrics for a specific month
     * @param year - Year (defaults to current year)
     * @param month - Month 1-12 (defaults to current month)
     */
    async getDailyHealth(params?: { year?: number; month?: number }): Promise<DailyHealthMetric[]> {
        const queryParams = new URLSearchParams();
        if (params?.year) queryParams.set('year', params.year.toString());
        if (params?.month) queryParams.set('month', params.month.toString());

        const query = queryParams.toString();
        return this.fetchApi<DailyHealthMetric[]>(`/api/analytics/daily-health${query ? `?${query}` : ''}`);
    }

    /**
     * Get high uptime nodes
     * @param min_uptime - Minimum uptime percentage (default: 90.0)
     * @param days - Days to analyze (default: 30)
     */
    async getHighUptimeNodes(params?: { min_uptime?: number; days?: number }): Promise<HighUptimeNode[]> {
        const queryParams = new URLSearchParams();
        if (params?.min_uptime !== undefined) queryParams.set('min_uptime', params.min_uptime.toString());
        if (params?.days) queryParams.set('days', params.days.toString());

        const query = queryParams.toString();
        return this.fetchApi<HighUptimeNode[]>(`/api/analytics/high-uptime${query ? `?${query}` : ''}`);
    }

    /**
     * Get storage growth metrics
     * @param days - Days to analyze (default: 30)
     */
    async getStorageGrowth(days?: number): Promise<StorageGrowthMetrics> {
        const query = days ? `?days=${days}` : '';
        return this.fetchApi<StorageGrowthMetrics>(`/api/analytics/storage-growth${query}`);
    }


    /**
     * Get recently joined nodes
     */
    async getRecentlyJoined(limit?: number): Promise<PNode[]> {
        const query = limit ? `?limit=${limit}` : '';
        return this.fetchApi<PNode[]>(`/api/analytics/recently-joined${query}`);
    }

    /**
     * Get weekly comparison
     */
    /**
     * Get weekly performance comparison (this week vs last week)
     */
    async getWeeklyComparison(): Promise<WeeklyComparison> {
        return this.fetchApi<WeeklyComparison>('/api/analytics/weekly-comparison');
    }

    /**
     * Get node graveyard (offline nodes)
     */
    /**
     * Get inactive/dead nodes
     * @param days - Days of inactivity threshold (default: 30)
     */
    async getNodeGraveyard(days?: number): Promise<NodeGraveyard> {
        const query = days ? `?days=${days}` : '';
        return this.fetchApi<NodeGraveyard>(`/api/analytics/node-graveyard${query}`);
    }

    // ============================================================================
    // Credits Endpoints
    // ============================================================================

    /**
     * Get credits for all nodes
     */
    async getAllCredits(): Promise<AllCreditsResponse> {
        return this.fetchApi<AllCreditsResponse>('/api/credits');
    }

    /**
     * Get top nodes by credits
     * @param limit - Number of top nodes (default: 20)
     */
    async getTopCredits(limit?: number): Promise<TopCreditsResponse> {
        const query = limit ? `?limit=${limit}` : '';
        return this.fetchApi<TopCreditsResponse>(`/api/credits/top${query}`);
    }

    /**
     * Get credits for a specific node
     */
    async getNodeCredits(pubkey: string): Promise<NodeCredits> {
        return this.fetchApi<NodeCredits>(`/api/credits/${encodeURIComponent(pubkey)}`);
    }

    /**
     * Get credits for nodes in a specific rank range
     * @param start - Start rank (default: 1)
     * @param end - End rank (default: 50)
     */
    async getCreditsByRank(params?: { start?: number; end?: number }): Promise<RankCreditsResponse> {
        const queryParams = new URLSearchParams();
        if (params?.start) queryParams.set('start', params.start.toString());
        if (params?.end) queryParams.set('end', params.end.toString());

        const query = queryParams.toString();
        return this.fetchApi<RankCreditsResponse>(`/api/credits/rank${query ? `?${query}` : ''}`);
    }

    /**
     * Get credits distribution statistics
     */
    async getCreditsStats(): Promise<CreditsStats> {
        return this.fetchApi<CreditsStats>('/api/credits/stats');
    }

    // ============================================================================
    // Topology Endpoints
    // ============================================================================

    /**
     * Get network topology graph data
     * Returns nodes, edges, and topology statistics
     */
    async getTopology(): Promise<NetworkTopology> {
        return this.fetchApi<NetworkTopology>('/api/topology');
    }

    /**
     * Get regional clusters
     */
    async getRegionalClusters(): Promise<RegionalCluster[]> {
        return this.fetchApi<RegionalCluster[]>('/api/topology/regions');
    }

    // ============================================================================
    // Calculator Endpoints
    // ============================================================================

    /**
     * Compare storage costs across providers
     * @param storage_tb - Storage amount in TB
     */
    async compareCosts(storage_tb: number): Promise<CostComparison> {
        return this.fetchApi<CostComparison>(`/api/calculator/costs?storage_tb=${storage_tb}`);
    }

    /**
     * Estimate ROI for running a pNode
     * @param storage_tb - Storage commitment in TB
     * @param uptime_percent - Expected uptime percentage (default: 99.0)
     */
    async estimateROI(storage_tb: number, uptime_percent: number = 99.0): Promise<ROIEstimate> {
        return this.fetchApi<ROIEstimate>(
            `/api/calculator/roi?storage_tb=${storage_tb}&uptime_percent=${uptime_percent}`
        );
    }

    /**
     * Simulate redundancy
     */
    async simulateRedundancy(params: {
        data_size_tb: number;
        replication_factor: number;
    }): Promise<RedundancySimulation> {
        return this.fetchApi<RedundancySimulation>('/api/calculator/redundancy', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    // ============================================================================
    // Alert Endpoints
    // ============================================================================

    /**
     * Get all configured alerts
     */
    async getAlerts(): Promise<Alert[]> {
        return this.fetchApi<Alert[]>('/api/alerts');
    }

    /**
     * Get a specific alert by ID
     * @param id - Alert ID
     */
    async getAlert(id: string): Promise<Alert> {
        return this.fetchApi<Alert>(`/api/alerts/${encodeURIComponent(id)}`);
    }

    /**
     * Create a new monitoring alert
     */
    async createAlert(alert: Omit<Alert, 'id' | 'last_fired' | 'created_at' | 'updated_at'>): Promise<Alert> {
        return this.fetchApi<Alert>('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert),
        });
    }

    /**
     * Update an existing alert
     * @param id - Alert ID
     * @param alert - Updated alert data
     */
    async updateAlert(id: string, alert: Omit<Alert, 'id' | 'last_fired' | 'created_at' | 'updated_at'>): Promise<Alert> {
        return this.fetchApi<Alert>(`/api/alerts/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert),
        });
    }

    /**
     * Delete an alert
     * @param id - Alert ID
     */
    async deleteAlert(id: string): Promise<{ message: string }> {
        return this.fetchApi<{ message: string }>(`/api/alerts/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get alert firing history
     * @param limit - Number of history items (default: 100)
     */
    async getAlertHistory(limit?: number): Promise<AlertHistoryItem[]> {
        const query = limit ? `?limit=${limit}` : '';
        return this.fetchApi<AlertHistoryItem[]>(`/api/alerts/history${query}`);
    }

    /**
     * Test an alert configuration without saving
     * @param alert - Alert configuration to test
     */
    async testAlert(alert: Omit<Alert, 'id' | 'last_fired' | 'created_at' | 'updated_at'>): Promise<TestAlertResponse> {
        return this.fetchApi<TestAlertResponse>('/api/alerts/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert),
        });
    }

    // ============================================================================
    // Comparison Endpoints
    // ============================================================================

    /**
     * Get cross-chain comparison
     */
    async getCrossChainComparison(): Promise<CrossChainComparison[]> {
        return this.fetchApi<CrossChainComparison[]>('/api/comparison');
    }

    // ============================================================================
    // RPC Proxy
    // ============================================================================

    /**
     * Proxy JSON-RPC 2.0 call to backend
     * Forwards RPC requests to a random healthy node
     */
    async proxyRPC<T = any>(request: Omit<RPCRequest, 'jsonrpc'>): Promise<RPCResponse<T>> {
        const rpcRequest: RPCRequest = {
            jsonrpc: '2.0',
            ...request,
        };

        return this.fetchApi<RPCResponse<T>>('/api/rpc', {
            method: 'POST',
            body: JSON.stringify(rpcRequest),
        });
    }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing or custom instances
export { ApiService };
