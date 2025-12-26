import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { NodeCredits } from '../types/api.types';

/**
 * Custom hook for fetching node credits information
 * @param pubkey - Node public key
 * @returns Node credits data, loading state, and error
 */
export function useNodeCredits(pubkey: string | null) {
    const [credits, setCredits] = useState<NodeCredits | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pubkey) {
            setCredits(null);
            return;
        }

        const fetchCredits = async () => {
            setLoading(true);
            try {
                const data = await apiService.getNodeCredits(pubkey);
                setCredits(data);
                setError(null);
            } catch (err: any) {
                // Gracefully handle 404 - node may not have credits yet
                if (err.status === 404) {
                    console.warn(`No credits available for node ${pubkey}`);
                    setCredits(null);
                    setError(null);
                } else {
                    console.error('Error fetching node credits:', err);
                    setError(err.message || 'Failed to fetch node credits');
                    setCredits(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCredits();
    }, [pubkey]);

    return { credits, loading, error };
}
