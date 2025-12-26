import React, { useState } from 'react';
import { PNode } from '../types/node.types';
import {
    Server,
    Activity,
    Cpu,
    HardDrive,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle,
    Zap,
    Copy,
    Check,
    Globe,
    Signal
} from 'lucide-react';

interface NodeHybridCardProps {
    node: PNode;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onCopyProp: (e: React.MouseEvent, text: string) => void;
    copiedId: string | null;
}

export const NodeHybridCard: React.FC<NodeHybridCardProps> = ({
    node,
    isExpanded,
    onToggleExpand,
    onCopyProp,
    copiedId
}) => {
    // Helper: Health Score Calculation
    const getHealthScore = (n: PNode) => {
        // Simple composite score logic (can be refined)
        // Weighted avg: Performance (40%), Uptime (40%), Version (20% - simplified as 100 if defined)
        const perf = n.performance_score ?? 0;
        const uptime = n.uptime_score ?? 0;
        // For now, return the backend-provided score or fallback to a healthy default for active nodes
        if (n.status === 'active' || n.status === 'online') return Math.max(perf, 85);
        if (n.status === 'delinquent') return Math.max(perf, 45);
        return 0;
    };

    const healthScore = getHealthScore(node);

    // Helper: Offline Duration
    const getOfflineDuration = (lastSeen?: string | number) => {
        if (!lastSeen) return null;
        const last = new Date(lastSeen).getTime();
        const now = Date.now();
        const diffMs = now - last;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 5) return null; // Recently seen

        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${mins}m`;
    };

    const offlineDuration = node.status !== 'active' && node.status !== 'online'
        ? getOfflineDuration(node.last_seen)
        : null;

    // Status Colors
    const statusColor =
        node.status === 'active' || node.status === 'online' ? 'text-emerald-500' :
            node.status === 'delinquent' ? 'text-amber-500' :
                'text-red-500';

    const statusBg =
        node.status === 'active' || node.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20' :
            node.status === 'delinquent' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-red-500/10 border-red-500/20';

    return (
        <div className={`
      group bg-surface border rounded-xl transition-all duration-200
      ${isExpanded ? 'border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20' : 'border-border-subtle hover:border-border-strong hover:shadow-md'}
    `}>
            {/* Primary Row */}
            <div
                onClick={onToggleExpand}
                className="grid grid-cols-12 gap-4 p-4 items-center cursor-pointer"
            >

                {/* A. Identity Block (Cols 1-4) */}
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${node.status === 'active' || node.status === 'online' ? 'bg-emerald-500' :
                            node.status === 'delinquent' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-text-primary truncate text-base">
                                {node.pubkey.substring(0, 8)}...{node.pubkey.substring(node.pubkey.length - 4)}
                            </span>
                            <button
                                onClick={(e) => onCopyProp(e, node.pubkey)}
                                className="text-text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1"
                                title="Copy PubKey"
                            >
                                {copiedId === node.pubkey ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                            <span className="flex items-center gap-1 bg-overlay-hover px-1.5 py-0.5 rounded text-[10px]">
                                <Globe size={10} />
                                {node.city || 'Unknown'}, {node.country || 'Unknown'}
                            </span>
                            <span className="hidden sm:inline font-mono opacity-60">
                                {node.ip || node.ip_address || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* B. Status & Health (Cols 5-7) */}
                <div className="col-span-6 md:col-span-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${statusBg} ${statusColor}`}>
                            {node.status}
                        </span>
                        {offlineDuration && (
                            <span className="text-[10px] font-mono text-base-content/50 flex items-center gap-1 text-red-500/80">
                                <Clock size={10} />
                                {offlineDuration}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-overlay-active rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${healthScore > 80 ? 'bg-emerald-500' :
                                        healthScore > 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${healthScore}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold ${healthScore > 80 ? 'text-emerald-500' :
                                healthScore > 50 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                            {healthScore}/100
                        </span>
                    </div>
                </div>

                {/* C. Core Metrics (Cols 8-10) */}
                <div className="hidden md:flex col-span-3 justify-between items-center pr-4 border-r border-border-subtle/50">
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                            <HardDrive size={10} /> S
                        </div>
                        <span className="text-xs font-mono font-bold text-text-primary">
                            {((node.storage_capacity ?? (node.total_storage_tb ?? 0) * 1e12) / 1e12).toFixed(1)}T
                        </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                            <Cpu size={10} /> C
                        </div>
                        <span className="text-xs font-mono font-bold text-text-primary">
                            {(node.cpu_percent ?? node.cpu_usage_percent ?? 0).toFixed(0)}%
                        </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-text-muted uppercase flex items-center gap-1">
                            <Zap size={10} /> V
                        </div>
                        <span className="text-xs font-mono text-text-secondary">
                            v{node.version?.split('-')[0] || '?'}
                        </span>
                    </div>
                </div>

                {/* E. Action Area (Cols 11-12) */}
                <div className="col-span-6 md:col-span-2 flex items-center justify-end">
                    <button
                        className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-overlay-hover hover:text-text-primary'}`}
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Progressive Disclosure: Expanded Panel */}
            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="pt-4 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Detailed Metrics */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <Activity size={12} /> Resource Usage
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">RAM Usage</span>
                                    <span className="font-mono text-text-primary">
                                        {((node.ram_used ?? 0) / 1e9).toFixed(1)} / {((node.ram_total ?? 0) / 1e9).toFixed(1)} GB
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-overlay-active rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary" style={{ width: `${node.ram_total ? ((node.ram_used ?? 0) / node.ram_total) * 100 : 0}%` }}></div>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-text-muted">Response Time</span>
                                    <span className="font-mono text-text-primary">
                                        {node.response_time ?? node.latency_ms ?? 0} ms
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Geography & Network */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <Signal size={12} /> Network Info
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-overlay-hover p-2 rounded col-span-2">
                                    <div className="text-text-muted text-[10px]">Region</div>
                                    <div className="font-semibold text-text-primary truncate">
                                        {node.geo_info?.region ? `${node.geo_info.region}, ${node.geo_info.country}` : 'Unknown Region'}
                                    </div>
                                </div>
                                <div className="col-span-2 bg-overlay-hover p-2 rounded flex justify-between items-center">
                                    <span className="text-text-muted text-[10px] font-mono">Full IP</span>
                                    <span className="font-mono text-text-primary select-all">
                                        {node.ip || node.ip_address || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions & History */}
                        <div className="flex flex-col justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Server size={12} /> Node History
                                </h4>
                                <div className="text-xs text-text-muted italic">
                                    Advanced historical metrics and RPC logs are available in the full detail view.
                                </div>
                            </div>

                            <button className="mt-4 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                                View Full Node Profile
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
