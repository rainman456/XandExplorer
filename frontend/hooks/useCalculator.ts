import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { CostComparison, ROIEstimate, RedundancySimulation } from '../types/api.types';

export function useCalculator() {
    const [costs, setCosts] = useState<CostComparison | null>(null);
    const [roi, setRoi] = useState<ROIEstimate | null>(null);
    const [simulation, setSimulation] = useState<RedundancySimulation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCosts = useCallback(async (storageTb: number) => {
        try {
            setLoading(true);
            const data = await apiService.compareCosts(storageTb);
            setCosts(data);
            setError(null);
            return data;
        } catch (err: any) {
            console.error('Failed to fetch costs:', err);
            setError(err.message || 'Failed to calculate costs');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchROI = useCallback(async (storageTb: number, uptimePercent: number) => {
        try {
            setLoading(true);
            const data = await apiService.estimateROI(storageTb, uptimePercent);
            setRoi(data);
            setError(null);
            return data;
        } catch (err: any) {
            console.error('Failed to fetch ROI:', err);
            setError(err.message || 'Failed to calculate ROI');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const runSimulation = useCallback(async (dataSizeTb: number, replicationFactor: number) => {
        try {
            setLoading(true);
            const data = await apiService.simulateRedundancy({
                data_size_tb: dataSizeTb,
                replication_factor: replicationFactor
            });
            setSimulation(data);
            setError(null);
            return data;
        } catch (err: any) {
            console.error('Failed to run simulation:', err);
            setError(err.message || 'Failed to run redundancy simulation');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        costs,
        roi,
        simulation,
        loading,
        error,
        fetchCosts,
        fetchROI,
        runSimulation
    };
}
