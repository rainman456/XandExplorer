import React, { useState, useMemo } from 'react';
import { PNode } from '../types/node.types';
import { PaginationMeta } from '../types/api.types';
import {
  Search,
  Filter,
  Terminal,
  XCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { NodeCard } from './NodeCard';

interface NodesListViewProps {
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  pagination: PaginationMeta | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}

type SortField = 'storage_capacity' | 'uptime_score' | 'response_time' | 'version' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'delinquent' | 'offline';
type RegisteredFilter = 'all' | 'registered' | 'unregistered';
type ViewMode = 'grid' | 'list';

export const NodesListView: React.FC<NodesListViewProps> = ({ nodes, onNodeClick, pagination, currentPage, onPageChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [registeredFilter, setRegisteredFilter] = useState<RegisteredFilter>('all');

  // Sort States
  const [sortField, setSortField] = useState<SortField>('storage_capacity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      window.prompt('Copy to clipboard: Ctrl+C, Enter', id);
    }
  };

  const filteredAndSortedNodes = useMemo(() => {
    let result = [...nodes];

    // Text Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n =>
        n.pubkey.toLowerCase().includes(term) ||
        (n.ip?.includes(term) ?? n.ip_address?.includes(term) ?? false) ||
        (n.country?.toLowerCase().includes(term)) ||
        (n.city?.toLowerCase().includes(term)) ||
        (n.geo_info?.region && n.geo_info.region.toLowerCase().includes(term))
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(n => n.status === statusFilter);
    }

    // Registration Filter
    if (registeredFilter !== 'all') {
      const isReg = registeredFilter === 'registered';
      result = result.filter(n => isReg ? (n.credits ?? 0) > 0 : (n.credits ?? 0) === 0);
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'storage_capacity' && valA === undefined) valA = (a.total_storage_tb || 0) * 1e12;
      if (sortField === 'storage_capacity' && valB === undefined) valB = (b.total_storage_tb || 0) * 1e12;

      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (sortField === 'status') {
        const statusPriority = { active: 3, delinquent: 2, offline: 1, syncing: 0 };
        valA = statusPriority[a.status as keyof typeof statusPriority] || 0;
        valB = statusPriority[b.status as keyof typeof statusPriority] || 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [nodes, searchTerm, sortField, sortDirection, statusFilter, registeredFilter]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (registeredFilter !== 'all' ? 1 : 0);

  return (
    <div className="flex flex-col h-full text-text-primary bg-root animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-6 border-b border-border-subtle bg-surface/50 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center font-mono">
              <Terminal className="mr-3 text-primary" />
              NODE_REGISTRY
              <span className="ml-3 text-xs bg-primary-soft text-primary px-2 py-0.5 rounded border border-primary/20 font-sans tracking-wide">
                {filteredAndSortedNodes.length} / {pagination?.total_items || nodes.length}
              </span>
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-surface border border-border-subtle rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                title="List View"
              >
                <ListIcon size={16} />
              </button>
            </div>

            <div className="relative group flex-1 md:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface border border-border-strong text-text-primary text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block w-full pl-10 p-2.5 outline-none transition-all w-full md:w-64 font-mono shadow-inner placeholder:text-text-muted"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-lg transition-colors flex items-center relative ${showFilters || activeFiltersCount > 0 ? 'bg-primary-soft border-primary text-primary' : 'bg-surface border-border-strong text-text-muted hover:text-text-primary'}`}
            >
              <Filter size={18} />
              {activeFiltersCount > 0 && !showFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Filter Bar */}
        {showFilters && (
          <div className="bg-elevated/50 p-4 rounded-xl border border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Status</label>
              <div className="flex space-x-2">
                {(['all', 'active', 'delinquent', 'offline'] as StatusFilter[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all border ${statusFilter === status
                      ? 'bg-surface border-primary text-primary shadow-sm'
                      : 'bg-transparent border-transparent text-text-secondary hover:bg-overlay-hover'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Registration</label>
              <div className="flex space-x-2">
                {(['all', 'registered', 'unregistered'] as RegisteredFilter[]).map(reg => (
                  <button
                    key={reg}
                    onClick={() => setRegisteredFilter(reg)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all border ${registeredFilter === reg
                      ? 'bg-surface border-primary text-primary shadow-sm'
                      : 'bg-transparent border-transparent text-text-secondary hover:bg-overlay-hover'
                      }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => { setStatusFilter('all'); setRegisteredFilter('all'); setSearchTerm(''); }}
                className="text-xs text-text-muted hover:text-red-400 flex items-center px-3 py-1.5"
              >
                <XCircle size={14} className="mr-1" /> Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-root p-6">
        {viewMode === 'grid' ? (
          /* Grid View - Responsive 3/2/1 columns */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedNodes.map(node => (
              <NodeCard
                key={node.pubkey}
                node={node}
                onNodeClick={onNodeClick}
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            ))}
            {filteredAndSortedNodes.length === 0 && (
              <div className="col-span-full p-12 text-center text-text-muted border border-dashed border-border-subtle rounded-xl">
                No nodes found matching your filters.
              </div>
            )}
          </div>
        ) : (
          /* List View - Compact table fallback */
          <div className="text-center text-text-muted py-12">
            List view coming soon. Use Grid view for now.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-6 py-4 flex items-center justify-between bg-root">
        <div className="text-xs text-text-muted font-mono">
          DISPLAYING <span className="text-text-primary">{filteredAndSortedNodes.length}</span> / <span className="text-text-primary">{pagination?.total_items || nodes.length}</span> NODES
          {pagination?.total_pages && (
            <span className="ml-2 opacity-50">
              (Page {pagination.page} of {pagination.total_pages})
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center px-3 py-1 bg-surface border border-border-subtle rounded-md text-xs font-medium text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-overlay-hover hover:border-primary/30 transition-all"
          >
            <ChevronLeft size={14} className="mr-1" /> PREV
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination?.total_pages || 1) }, (_, i) => {
              let p = i + 1;
              if ((pagination?.total_pages || 0) > 5 && currentPage > 3) {
                p = currentPage - 3 + i;
              }
              if (p > (pagination?.total_pages || 1)) return null;

              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${currentPage === p
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-surface border border-border-subtle text-text-muted hover:border-primary/50 hover:text-primary'
                    }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= (pagination?.total_pages || 1)}
            className="flex items-center px-3 py-1 bg-surface border border-border-subtle rounded-md text-xs font-medium text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-overlay-hover hover:border-primary/30 transition-all"
          >
            NEXT <ChevronRight size={14} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};