import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Alert, CreateAlertRequest, AlertHistoryItem, TestAlertResponse } from '../types/api.types';

export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [history, setHistory] = useState<AlertHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getAlerts();
            setAlerts(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching alerts:', err);
            setError(err.message || 'Failed to fetch alerts');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async (limit?: number) => {
        try {
            const data = await apiService.getAlertHistory(limit);
            setHistory(data);
        } catch (err: any) {
            console.error('Error fetching alert history:', err);
        }
    }, []);

    const createAlert = async (alert: CreateAlertRequest): Promise<Alert> => {
        try {
            const newAlert = await apiService.createAlert(alert);
            setAlerts(prev => [newAlert, ...prev]);
            return newAlert;
        } catch (err: any) {
            throw new Error(err.message || 'Failed to create alert');
        }
    };

    const updateAlert = async (id: string, updates: Partial<Alert>): Promise<Alert> => {
        try {
            // Merge existing alert with updates to form complete object as required by API
            const existingAlert = alerts.find(a => a.id === id);
            if (!existingAlert) throw new Error('Alert not found');

            const updatedAlert = await apiService.updateAlert(id, {
                ...existingAlert,
                ...updates
            });

            setAlerts(prev => prev.map(a => a.id === id ? updatedAlert : a));
            return updatedAlert;
        } catch (err: any) {
            throw new Error(err.message || 'Failed to update alert');
        }
    };

    const deleteAlert = async (id: string) => {
        try {
            await apiService.deleteAlert(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            throw new Error(err.message || 'Failed to delete alert');
        }
    };

    const testAlert = async (alert: Omit<Alert, 'id' | 'last_fired' | 'created_at' | 'updated_at'>): Promise<TestAlertResponse> => {
        try {
            return await apiService.testAlert(alert);
        } catch (err: any) {
            throw new Error(err.message || 'Failed to test alert');
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    return {
        alerts,
        history,
        loading,
        error,
        fetchAlerts,
        fetchHistory,
        createAlert,
        updateAlert,
        deleteAlert,
        testAlert
    };
}
