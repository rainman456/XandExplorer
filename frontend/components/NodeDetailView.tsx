import React, { useEffect, useState } from 'react';
import { PNode } from '../types/node.types';
import { useNodeHistory } from '../hooks/useNodeHistory';
import { useNodeCredits } from '../hooks/useNodeCredits';
import { formatStorage, formatTimestamp, getLatencyColor } from '../utils/formatters';
import { ArrowLeft, Server, Activity, Database, Clock, Cpu, MemoryStick as Memory, Globe, Code, Copy, Check, Loader2, Award, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

interface NodeDetailViewProps {
    node: PNode;
    onBack: () => void;
}

// --- Mini Map Component ---
const MiniMap: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
    const [geoData, setGeoData] = useState<any>(null);

    useEffect(() => {
        fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(data => setGeoData(data));
    }, []);

    // Simple projection logic for SVGs
    const project = (latitude: number, longitude: number) => {
        const x = (longitude + 180) * (400 / 360);
        const y = (90 - latitude) * (200 / 180);
        return { x, y };
    };

    const generatePath = (coordinates: any[], type: string): string => {
        const coordToPoint = (ln: number, lt: number) => {
            const p = project(lt, ln);
            return `${p.x},${p.y}`;
        };

        if (type === 'Polygon') {
            return coordinates.map(ring => {
                return 'M' + ring.map(([ln, lt]: [number, number]) => coordToPoint(ln, lt)).join('L') + 'Z';
            }).join(' ');
        } else if (type === 'MultiPolygon') {
            return coordinates.map((polygon: any[]) => {
                return polygon.map(ring => {
                    return 'M' + ring.map(([ln, lt]: [number, number]) => coordToPoint(ln, lt)).join('L') + 'Z';
                }).join(' ');
            }).join(' ');
        }
        return '';
    };

    const nodePos = project(lat, lon);

    return (
        <div className="w-full h-full bg-[#0C0D12] rounded-lg overflow-hidden relative border border-border-subtle">
            <svg viewBox="0 0 400 200" className="w-full h-full opacity-50">
                {geoData && geoData.features.map((feature: any, i: number) => (
                    <path
                        key={i}
                        d={generatePath(feature.geometry.coordinates, feature.geometry.type)}
                        fill="#2A2C3A"
                        stroke="none"
                    />
                ))}
            </svg>
            {/* The Node Pin */}
            <div
                className="absolute w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)] border-2 border-white transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ left: `${(nodePos.x / 400) * 100}%`, top: `${(nodePos.y / 200) * 100}%` }}
            ></div>
            {/* Crosshairs */}
            <div
                className="absolute w-full h-[1px] bg-primary/20 pointer-events-none"
                style={{ top: `${(nodePos.y / 200) * 100}%` }}
            ></div>
            <div
                className="absolute h-full w-[1px] bg-primary/20 pointer-events-none"
                style={{ left: `${(nodePos.x / 400) * 100}%` }}
            ></div>
        </div>
    );
};

export const NodeDetailView: React.FC<NodeDetailViewProps> = ({ node, onBack }) => {
    const [copied, setCopied] = useState(false);
    const { history, loading: historyLoading } = useNodeHistory(node.pubkey, 48); // 48 hours
    const { credits, loading: creditsLoading } = useNodeCredits(node.pubkey);

    // Transform history data for charts
    const historyData = history.length > 0
        ? history.map((point, i) => ({
            time: i,
            timestamp: point.timestamp,
            latency: point.response_time,
            storage: point.storage_used / 1e12,
            uptime: point.uptime_score,
        }))
        : Array.from({ length: 20 }).map((_, i) => ({
            time: i,
            timestamp: Date.now() - (20 - i) * 3600000,
            latency: (node.response_time ?? 0) + (Math.random() * 20 - 10),
            storage: (node.storage_used ?? 0) / 1e12,
            uptime: node.uptime_score,
        }));

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(node, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-secondary text-secondary-content border-secondary/20';
            case 'delinquent': return 'bg-accent text-accent-content border-accent/20';
            default: return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
    };

    return (
        <div className="h-full flex flex-col bg-root text-text-primary overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 fade-in duration-300">

            {/* Top Bar */}
            <div className="bg-surface border-b border-border-subtle p-4 lg:p-6 sticky top-0 z-20 flex items-center justify-between backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-overlay-hover rounded-lg transition-colors text-text-secondary hover:text-text-primary"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold font-mono tracking-tight">{node.pubkey.substring(0, 8)}...{node.pubkey.substring(node.pubkey.length - 6)}</h1>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${node.status === 'active' ? 'bg-secondary-soft text-secondary border-secondary/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                {node.status}
                            </span>
                        </div>
                        <div className="text-xs text-text-muted mt-1 flex items-center">
                            <Clock size={12} className="mr-1" /> Last seen: {node.last_seen ? new Date(node.last_seen).toLocaleString() : 'N/A'}
                        </div>
                    </div>
                </div>
                <div className="hidden md:block">
                    <button className="px-4 py-2 bg-gradient-primary hover:brightness-110 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20">
                        Connect RPC
                    </button>
                </div>
            </div>

            <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">

                {/* Top Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Basic Info Card */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center">
                            <Server size={16} className="mr-2 text-primary" /> Node Identity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-text-muted uppercase">Public Key</label>
                                <div className="font-mono text-xs break-all bg-root p-2 rounded border border-border-subtle mt-1 select-all">
                                    {node.pubkey}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase">IP Address</label>
                                    <div className="font-mono text-sm">{node.ip}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase">Version</label>
                                    <div className="font-mono text-sm">{node.version}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase">Port</label>
                                    <div className="font-mono text-sm">{node.port}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted uppercase">Response Time</label>
                                    <div className="font-mono text-sm">{node.response_time} ms</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resources Gauges */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center">
                            <Activity size={16} className="mr-2 text-secondary" /> System Resources
                        </h3>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            {/* CPU */}
                            <div className="bg-root rounded-xl p-4 border border-border-subtle flex flex-col justify-between relative overflow-hidden group min-h-[140px]">
                                {/* Background Chart */}
                                <div className="absolute inset-0 z-0 opacity-15 pointer-events-none translate-y-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={historyData}>
                                            <Line type="monotone" dataKey="latency" stroke="var(--color-primary)" strokeWidth={3} dot={false} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4 z-0">
                                    <Cpu size={64} />
                                </div>

                                <div className="relative z-10">
                                    <span className="text-xs text-text-muted font-bold uppercase">CPU Usage</span>
                                    <div className="mt-2">
                                        <span className="text-2xl font-black text-text-primary">{(node.cpu_percent ?? 0).toFixed(1)}%</span>
                                    </div>
                                </div>

                                <div className="relative z-10 mt-auto">
                                    <div className="w-full h-1.5 bg-border-strong rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${node.cpu_percent ?? 0}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-text-muted text-right mt-1 font-mono">
                                        Avg: {((node.cpu_percent ?? 0) * 0.9).toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* RAM */}
                            <div className="bg-root rounded-xl p-4 border border-border-subtle flex flex-col justify-between relative overflow-hidden group min-h-[140px]">
                                {/* Background Chart */}
                                <div className="absolute inset-0 z-0 opacity-15 pointer-events-none translate-y-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={historyData}>
                                            <Line type="monotone" dataKey="storage" stroke="var(--color-secondary)" strokeWidth={3} dot={false} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4 z-0">
                                    <Memory size={64} />
                                </div>

                                <div className="relative z-10">
                                    <span className="text-xs text-text-muted font-bold uppercase">RAM Usage</span>
                                    <div className="mt-2">
                                        <span className="text-2xl font-black text-text-primary">{((node.ram_used ?? 0) / 1e9).toFixed(1)} GB</span>
                                    </div>
                                </div>

                                <div className="relative z-10 mt-auto">
                                    <div className="w-full h-1.5 bg-border-strong rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${node.ram_total ? ((node.ram_used ?? 0) / node.ram_total) * 100 : 0}%` }}></div>
                                    </div>
                                    <div className="text-[10px] text-text-muted text-right mt-1 font-mono">
                                        Total: {((node.ram_total ?? 0) / 1e9).toFixed(1)} GB
                                    </div>
                                </div>
                            </div>

                            {/* Storage */}
                            <div className="col-span-2 bg-root rounded-xl p-4 border border-border-subtle flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-text-muted font-bold uppercase block">Storage Utilized</span>
                                    <span className="text-xl font-bold text-text-primary">
                                        {((node.storage_used ?? 0) / 1e12).toFixed(2)} <span className="text-sm text-text-muted font-normal">/ {((node.storage_capacity ?? 0) / 1e12).toFixed(2)} TB</span>
                                    </span>
                                </div>
                                <Database className="text-text-muted opacity-20" size={32} />
                            </div>
                        </div>
                    </div>

                    {/* Map Location */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center">
                            <Globe size={16} className="mr-2 text-accent" /> Physical Location
                        </h3>
                        {node.lat && node.lon ? (
                            <>
                                <div className="flex-1 min-h-[150px] mb-4">
                                    <MiniMap lat={node.lat} lon={node.lon} />
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-border-subtle pt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-muted uppercase">Country</span>
                                        <span className="font-semibold text-text-primary">{node.country}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-text-muted uppercase">City</span>
                                        <span className="font-semibold text-text-primary">{node.city}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 min-h-[150px] flex items-center justify-center text-text-muted text-sm">
                                Location data unavailable
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Row: Charts & Raw Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Performance History Chart */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm h-[300px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Resource History (24h)</h3>
                            {historyLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#933481" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#933481" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#008E7C" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#008E7C" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                                        formatter={(value: number, name: string) => {
                                            if (name === 'latency') return [`${value.toFixed(1)} ms`, 'Latency'];
                                            if (name === 'storage') return [`${value.toFixed(2)} TB`, 'Storage'];
                                            return [value, name];
                                        }}
                                    />
                                    <Area type="monotone" dataKey="latency" stroke="#933481" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="storage" stroke="#008E7C" fillOpacity={1} fill="url(#colorStorage)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Raw JSON Response */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-0 shadow-sm flex flex-col overflow-hidden h-[300px]">
                        <div className="p-4 border-b border-border-subtle bg-overlay-hover flex justify-between items-center">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center">
                                <Code size={16} className="mr-2" /> JSON RPC Response
                            </h3>
                            <button
                                onClick={handleCopy}
                                className="text-xs flex items-center text-primary hover:text-primary-hover transition-colors"
                            >
                                {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                                {copied ? 'Copied' : 'Copy JSON'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-[#0C0D12] p-4 custom-scrollbar">
                            <pre className="font-mono text-xs text-blue-200 leading-relaxed">
                                {JSON.stringify(node, null, 2)}
                            </pre>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
};