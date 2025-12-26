import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { NetworkSnapshot, StorageGrowthMetrics, CapacityForecast, DailyHealthMetric } from '../types/api.types';

export function useAnalytics() {
    const [networkHistory, setNetworkHistory] = useState<NetworkSnapshot[]>([]);
    const [storageGrowth, setStorageGrowth] = useState<StorageGrowthMetrics | null>(null);
    const [capacityForecast, setCapacityForecast] = useState<CapacityForecast | null>(null);
    const [dailyHealth, setDailyHealth] = useState<DailyHealthMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const [historyData, growthData, forecastData, healthData] = await Promise.all([
                apiService.getNetworkHistory({ interval: '24h' }),
                apiService.getStorageGrowth(30),
                apiService.getCapacityForecast(),
                apiService.getDailyHealth()
            ]);

            setNetworkHistory(historyData);
            setStorageGrowth(growthData);
            setCapacityForecast(forecastData);
            setDailyHealth(healthData);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err);
            setError(err.message || 'Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return {
        networkHistory,
        storageGrowth,
        capacityForecast,
        dailyHealth,
        loading,
        error,
        refresh: fetchAnalytics
    };
}
