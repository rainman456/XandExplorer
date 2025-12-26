import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { NetworkTopology } from '../types/api.types';

export function useTopology() {
    const [topology, setTopology] = useState<NetworkTopology | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTopology = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getTopology();
            setTopology(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch topology:', err);
            setError(err.message || 'Failed to fetch network topology');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTopology();
        // Optional: Poll for topology updates
        const interval = setInterval(fetchTopology, 30000); // 30s
        return () => clearInterval(interval);
    }, [fetchTopology]);

    return {
        topology,
        loading,
        error,
        refresh: fetchTopology
    };
}
