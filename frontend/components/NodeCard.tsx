import React from 'react';
import { PNode } from '../types/node.types';
import {
    Copy,
    Check,
    MapPin,
    Clock,
    Zap,
    Activity,
    Server
} from 'lucide-react';

interface NodeCardProps {
    node: PNode;
    onNodeClick?: (node: PNode) => void;
    copiedId: string | null;
    onCopy: (e: React.MouseEvent, id: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onNodeClick, copiedId, onCopy }) => {
    // Generate avatar color from pubkey
    const getAvatarColor = (pubkey: string) => {
        const hash = pubkey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = [
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'bg-gradient-to-br from-blue-500 to-cyan-500',
            'bg-gradient-to-br from-green-500 to-emerald-500',
            'bg-gradient-to-br from-orange-500 to-red-500',
            'bg-gradient-to-br from-indigo-500 to-purple-500',
        ];
        return colors[hash % colors.length];
    };

    // Status badge config
    const getStatusConfig = () => {
        if (node.status === 'active' || node.status === 'online') {
            return { label: 'Healthy', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
        }
        if (node.status === 'delinquent') {
            return { label: 'Degraded', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
        }
        return { label: 'Offline', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    };

    const statusConfig = getStatusConfig();
    const uptimePercent = (node.uptime_score ?? 0);
    const performanceScore = (node.performance_score ?? 0);

    // Relative time helper
    const getRelativeTime = (timestamp?: string | number) => {
        if (!timestamp) return 'Unknown';
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div
            onClick={() => onNodeClick?.(node)}
            className="group relative bg-surface border border-border-subtle rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[280px] flex flex-col"
        >
            {/* Status Indicator - Left Edge */}
            <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${node.status === 'active' || node.status === 'online' ? 'bg-emerald-500' :
                    node.status === 'delinquent' ? 'bg-amber-500' : 'bg-red-500'
                }`} />

            {/* Header Area */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full ${getAvatarColor(node.pubkey)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                        {node.pubkey.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                        {/* Node Name/Identifier */}
                        <h3 className="text-base font-bold text-text-primary truncate mb-1">
                            Node {node.pubkey.substring(0, 4)}...{node.pubkey.substring(node.pubkey.length - 4)}
                        </h3>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Identity Section */}
            <div className="space-y-2 mb-4 pb-4 border-b border-border-subtle">
                {/* Address with Copy */}
                <div className="flex items-center justify-between bg-overlay-hover rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Server size={14} className="text-text-muted flex-shrink-0" />
                        <span className="font-mono text-sm text-text-primary truncate">
                            {node.pubkey.substring(0, 8)}...{node.pubkey.substring(node.pubkey.length - 6)}
                        </span>
                    </div>
                    <button
                        onClick={(e) => onCopy(e, node.pubkey)}
                        className="text-text-muted hover:text-primary transition-colors p-1 flex-shrink-0"
                    >
                        {copiedId === node.pubkey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                </div>

                {/* IP with Location */}
                <div className="flex items-center gap-2 text-xs text-text-muted px-1">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">
                        {node.ip || node.ip_address || 'N/A'} • {node.city || 'Unknown'}, {node.country || 'Unknown'}
                    </span>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3 flex-1">
                {/* Uptime */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-text-muted">Uptime</span>
                        <span className="text-xs font-bold text-text-primary">{uptimePercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-overlay-active rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${uptimePercent}%` }}
                        />
                    </div>
                </div>

                {/* Performance Score */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-text-muted">Performance</span>
                        <span className={`text-xs font-bold ${performanceScore >= 90 ? 'text-emerald-500' :
                                performanceScore >= 70 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                            {performanceScore}/100
                        </span>
                    </div>
                    <div className="h-1.5 bg-overlay-active rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${performanceScore >= 90 ? 'bg-emerald-500' :
                                    performanceScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${performanceScore}%` }}
                        />
                    </div>
                </div>

                {/* Latency & Version Row */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-text-muted" />
                        <div>
                            <div className="text-[10px] text-text-muted uppercase">Latency</div>
                            <div className="text-sm font-bold text-text-primary font-mono">
                                {node.response_time ?? node.latency_ms ?? 0}ms
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-text-muted" />
                        <div>
                            <div className="text-[10px] text-text-muted uppercase">Version</div>
                            <div className="text-sm font-bold text-text-primary font-mono">
                                v{node.version?.split('-')[0] || '?'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Last Seen */}
                <div className="flex items-center gap-2 text-xs text-text-muted pt-2">
                    <Clock size={12} />
                    <span>Last seen {getRelativeTime(node.last_seen)}</span>
                </div>
            </div>
        </div>
    );
};
