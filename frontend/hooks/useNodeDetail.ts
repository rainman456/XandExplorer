import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { PNode } from '../types/api.types';

/**
 * Custom hook for fetching individual node details
 * @param pubkey - Node public key
 * @returns Node data, loading state, and error
 */
export function useNodeDetail(pubkey: string | null) {
    const [node, setNode] = useState<PNode | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pubkey) {
            setNode(null);
            return;
        }

        const fetchNode = async () => {
            setLoading(true);
            try {
                const data = await apiService.getNode(pubkey);
                setNode(data);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching node details:', err);
                setError(err.message || 'Failed to fetch node details');
            } finally {
                setLoading(false);
            }
        };

        fetchNode();
    }, [pubkey]);

    return { node, loading, error };
}
