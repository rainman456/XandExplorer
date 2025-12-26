import { useState, useEffect, useCallback } from 'react';
import { PNode } from '../types/node.types';
import { apiService } from '../services/api';
import { AppSettings } from '../types';
import { PaginationMeta } from '../types/api.types';

export function useNodes(settings?: AppSettings) {
  const [nodes, setNodes] = useState<PNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20); // Default limit - 20 nodes per page

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch nodes from backend API with pagination support
      const response = await apiService.getNodes({ page, limit });

      // Deduplicate nodes based on pubkey just in case
      const uniqueNodes = Array.from(new Map(response.nodes.map(node => [node.pubkey, node])).values());

      setNodes(uniqueNodes);
      setPagination(response.pagination);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Error fetching nodes:', err);
      setError(err.message || 'Failed to fetch node data from backend');
      setNodes([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchNodes();
    let intervalId: any;
    if (settings?.autoRefresh) {
      intervalId = setInterval(fetchNodes, settings.refreshInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchNodes, settings?.autoRefresh, settings?.refreshInterval]);

  return { nodes, loading, error, refetch: fetchNodes, lastUpdated, pagination, setPage, page };
}