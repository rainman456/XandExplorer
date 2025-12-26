import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type {
    WeeklyComparison,
    HighUptimeNode,
    StorageGrowthMetrics,
    CacheStatus
} from '../types/api.types';

interface DashboardMetrics {
    weeklyComparison: WeeklyComparison | null;
    highUptimeNodes: HighUptimeNode[];
    storageGrowth: StorageGrowthMetrics | null;
    cacheStatus: CacheStatus | null;
}

export const useDashboardMetrics = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        weeklyComparison: null,
        highUptimeNodes: [],
        storageGrowth: null,
        cacheStatus: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            setError(null);

            const [weeklyComp, uptimeNodes, growth, cache] = await Promise.all([
                apiService.getWeeklyComparison().catch(() => null),
                apiService.getHighUptimeNodes({ min_uptime: 95, days: 30 }).catch(() => []),
                apiService.getStorageGrowth(30).catch(() => null),
                apiService.getCacheStatus().catch(() => null),
            ]);

            setMetrics({
                weeklyComparison: weeklyComp,
                highUptimeNodes: uptimeNodes.slice(0, 5), // Top 5
                storageGrowth: growth,
                cacheStatus: cache,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Refresh every 60 seconds
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, []);

    return { metrics, loading, error, refresh: fetchMetrics };
};
