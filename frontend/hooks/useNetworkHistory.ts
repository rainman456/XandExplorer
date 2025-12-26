import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { NetworkSnapshot } from '../types/api.types';

/**
 * Custom hook for fetching network-wide historical data
 * @param params - Optional parameters for filtering history
 * @returns Network snapshots, loading state, and error
 */
export function useNetworkHistory(params?: {
    start?: number;
    end?: number;
    interval?: string;
}) {
    const [snapshots, setSnapshots] = useState<NetworkSnapshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await apiService.getNetworkHistory(params);
                setSnapshots(data);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching network history:', err);
                setError(err.message || 'Failed to fetch network history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [params?.start, params?.end, params?.interval]);

    return { snapshots, loading, error };
}
