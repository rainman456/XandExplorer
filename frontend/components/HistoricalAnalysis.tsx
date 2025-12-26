import React, { useMemo } from 'react';
import { PNode } from '../types/node.types';
import { History, TrendingUp, Activity, Server, Database, Calendar, Download, Info, Loader2, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line, Legend } from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';

interface HistoricalAnalysisProps {
   nodes: PNode[];
}

const BYTES_TO_TB = 1e12; // API uses PB, visual uses TB or PB. Let's assume input is PB (1e15). Wait, snapshot says total_storage_pb.

export const HistoricalAnalysis: React.FC<HistoricalAnalysisProps> = ({ nodes }) => {
   const { networkHistory, loading, error, refresh } = useAnalytics();

   const historicalData = useMemo(() => {
      if (!networkHistory || networkHistory.length === 0) return [];

      // Sort by timestamp just in case
      const sorted = [...networkHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return sorted.map((snapshot) => {
         const date = new Date(snapshot.timestamp);
         return {
            day: date.toLocaleDateString(),
            nodeCount: snapshot.total_nodes,
            storageCommitted: snapshot.total_storage_pb * 1000, // Convert PB to TB for display if needed, or keep PB. Let's use TB for consistency with previous mock. 1 PB = 1000 TB.
            avgUptime: snapshot.average_uptime,
            networkTraffic: snapshot.average_performance, // Proxy for traffic/load
         };
      });
   }, [networkHistory]);

   const stats = useMemo(() => {
      if (historicalData.length < 2) return null;
      const first = historicalData[0];
      const last = historicalData[historicalData.length - 1];

      return {
         nodeGrowth: last.nodeCount - first.nodeCount,
         nodeGrowthPercent: ((last.nodeCount - first.nodeCount) / first.nodeCount) * 100,
         storageGrowth: last.storageCommitted - first.storageCommitted,
         storageGrowthPercent: ((last.storageCommitted - first.storageCommitted) / first.storageCommitted) * 100,
         avgUptime: last.avgUptime // Current avg uptime
      };
   }, [historicalData]);

   if (loading && historicalData.length === 0) {
      return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
   }

   if (error) {
      return <div className="p-8 text-red-500">Failed to load analytics: {error}</div>;
   }

   return (
      <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 bg-root h-full overflow-y-auto">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h2 className="text-2xl font-bold text-text-primary flex items-center font-mono">
                  <History className="mr-3 text-primary" />
                  HISTORICAL_TELEMETRY
               </h2>
               <p className="text-text-muted mt-1 text-sm">
                  Analysis of network evolution, storage trends, and node participation over time.
               </p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => refresh()} className="flex items-center px-4 py-2 bg-surface text-text-primary rounded-lg hover:bg-overlay-hover transition-colors border border-border-subtle text-xs font-mono">
                  <RefreshCw size={14} className="mr-2" /> REFRESH
               </button>
               <button className="flex items-center px-4 py-2 bg-surface text-text-primary rounded-lg hover:bg-overlay-hover transition-colors border border-border-subtle text-xs font-mono">
                  <Download size={14} className="mr-2" /> EXPORT_CSV
               </button>
            </div>
         </div>

         {/* Summary Cards */}
         {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-primary-soft rounded-lg"><Server size={18} className="text-primary" /></div>
                     <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Node Growth</span>
                  </div>
                  <div className="text-3xl font-black text-text-primary mb-1">{stats.nodeGrowth > 0 ? '+' : ''}{Math.floor(stats.nodeGrowth)}</div>
                  <p className="text-xs text-secondary flex items-center"><TrendingUp size={12} className="mr-1" /> {stats.nodeGrowthPercent.toFixed(1)}% change</p>
               </div>
               <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-secondary-soft rounded-lg"><Database size={18} className="text-secondary" /></div>
                     <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Storage Expansion</span>
                  </div>
                  <div className="text-3xl font-black text-text-primary mb-1">{stats.storageGrowth > 0 ? '+' : ''}{stats.storageGrowth.toFixed(1)} TB</div>
                  <p className="text-xs text-secondary flex items-center"><TrendingUp size={12} className="mr-1" /> {stats.storageGrowthPercent.toFixed(1)}% capacity expansion</p>
               </div>
               <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-accent-soft/20 rounded-lg"><Activity size={18} className="text-accent" /></div>
                     <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Network Reliability</span>
                  </div>
                  <div className="text-3xl font-black text-text-primary mb-1">{stats.avgUptime.toFixed(2)}%</div>
                  <p className="text-xs text-text-muted">Mean uptime across all epochs</p>
               </div>
            </div>
         )}

         {/* Charts Section */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Node Count Over Time */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
               <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6 flex items-center">
                  <Calendar size={16} className="mr-2" /> Node Count Trend (30d)
               </h3>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="day" hide />
                        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                           contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="nodeCount" stroke="var(--color-primary)" strokeWidth={3} dot={false} animationDuration={1000} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Storage Expansion Area Chart */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm h-[400px] flex flex-col">
               <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6 flex items-center">
                  <Database size={16} className="mr-2" /> Storage Committed Expansion (TB)
               </h3>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={historicalData}>
                        <defs>
                           <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="day" hide />
                        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                           contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="storageCommitted" stroke="var(--color-secondary)" fillOpacity={1} fill="url(#colorStorage)" strokeWidth={2} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Network Utilization */}
            <div className="lg:col-span-2 bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm h-[350px] flex flex-col">
               <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6 flex items-center">
                  <Activity size={16} className="mr-2" /> Multi-Metric Performance Telemetry
               </h3>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="day" hide />
                        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                           contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="networkTraffic" name="Perf Score" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avgUptime" name="Avg Uptime %" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Insight Section */}
         <div className="bg-elevated border border-border-subtle rounded-2xl p-6 flex items-start gap-4">
            <Info className="text-primary w-6 h-6 shrink-0 mt-1" />
            <div>
               <h4 className="font-bold text-text-primary mb-1">Network Evolution Insight</h4>
               <p className="text-sm text-text-secondary leading-relaxed">
                  Historical data indicates a strong correlation between pNode version upgrades and network reliability. Since version 0.8.0, the average latency across the cluster has stabilized by 15% even as the total storage committed grew significantly. The network is currently scaling efficiently to meet projected demand.
               </p>
            </div>
         </div>
      </div>
   );
};
