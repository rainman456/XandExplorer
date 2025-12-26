import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { NodeHistoryPoint } from '../types/api.types';

/**
 * Custom hook for fetching node historical data
 * @param pubkey - Node public key or ID
 * @param hours - Hours of history to fetch (default: 24)
 * @returns Historical data points, loading state, and error
 */
export function useNodeHistory(
    pubkey: string | null,
    hours: number = 24
) {
    const [history, setHistory] = useState<NodeHistoryPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pubkey) {
            setHistory([]);
            return;
        }

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await apiService.getNodeHistory(pubkey, hours);
                setHistory(data);
                setError(null);
            } catch (err: any) {
                // Gracefully handle 404 - node may not have history yet
                if (err.status === 404) {
                    console.warn(`No history available for node ${pubkey}`);
                    setHistory([]);
                    setError(null);
                } else {
                    console.error('Error fetching node history:', err);
                    setError(err.message || 'Failed to fetch node history');
                    setHistory([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [pubkey, hours]);

    return { history, loading, error };
}
