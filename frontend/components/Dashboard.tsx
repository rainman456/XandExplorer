import React, { useEffect, useState } from 'react';
import { PNode } from '../types/node.types';
import { NetworkStats, LatencyDistribution } from '../types/api.types';
import { apiService } from '../services/api';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, ReferenceLine } from 'recharts';
import { Server, HardDrive, Activity, Globe, Wifi, Layers, Zap, Cpu, TrendingUp, AlertTriangle, CheckCircle, PlusCircle, Loader2, LayoutDashboard, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { StorageUsageChart } from './StorageUsageChart';

interface DashboardProps {
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  onNavigateToNodes?: () => void;
}

// Tech-styled Stat Card
const StatCard = ({ label, value, subtext, icon: Icon, trend, trendColor }: any) => (
  <div className="bg-surface border border-border-subtle rounded-2xl p-6 relative overflow-hidden shadow-lg">
    {/* Decorative blur */}
    <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary-soft rounded-full blur-2xl"></div>

    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">{label}</p>
        <h3 className="text-3xl font-bold text-text-primary font-mono tracking-tight">{value}</h3>
        {subtext && <div className="text-text-muted text-xs mt-2 font-medium bg-overlay-hover inline-block px-2 py-1 rounded">{subtext}</div>}
      </div>
      <div className="p-3 bg-overlay-hover rounded-xl text-text-primary border border-overlay-active">
        <Icon size={22} />
      </div>
    </div>

    {trend && (
      <div className="mt-4 flex items-center text-xs font-mono border-t border-border-subtle pt-3">
        <span className={`font-bold ${trendColor || 'text-secondary'} flex items-center`}>
          <Zap size={10} className="mr-1" />
          {trend > 0 ? '+' : ''}{trend}%
        </span>
        <span className="text-text-muted ml-2">vs epoch 419</span>
      </div>
    )}
  </div>
);

// New Component: Storage Capacity Forecast
const StorageForecast = ({ totalStorageTB, usedStorageTB }: { totalStorageTB: number, usedStorageTB: number }) => {
  const utilization = totalStorageTB > 0 ? (usedStorageTB / totalStorageTB) * 100 : 0;

  // Simulation: Daily growth 0.5% of total or min 5TB
  const dailyGrowthTB = Math.max(5, totalStorageTB * 0.005);
  const daysToFull = dailyGrowthTB > 0 ? (totalStorageTB - usedStorageTB) / dailyGrowthTB : 999;

  // Status Logic
  const needsNodes = utilization > 75 || daysToFull < 60;

  // Calculate recommended nodes (assuming ~50TB per node average)
  const avgNodeStorageTB = 50;
  const storageNeededTB = dailyGrowthTB * 30; // 30 days worth
  const recommendedNodes = Math.ceil(storageNeededTB / avgNodeStorageTB);

  // Milestone: Next Petabyte or next 1000TB chunk
  const milestonePB = Math.ceil((usedStorageTB + 1) / 1000);
  const targetMilestoneTB = milestonePB * 1000;
  const daysToMilestone = dailyGrowthTB > 0 ? (targetMilestoneTB - usedStorageTB) / dailyGrowthTB : 0;

  // Chart Data
  const data = [];
  for (let i = 0; i < 30; i++) {
    data.push({
      day: i,
      used: usedStorageTB + (dailyGrowthTB * i),
      capacity: totalStorageTB
    });
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col md:flex-row gap-5 lg:col-span-3 shadow-lg relative overflow-hidden group">
      {/* Decorative background similar to StatCard */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-soft rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity"></div>

      <div className="flex-1 space-y-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Storage Capacity Forecast
          </h3>
          <p className="text-sm text-text-muted mt-1">Predictive analysis of network growth and storage demand.</p>
        </div>

        <div className={`p-4 rounded-xl border flex items-start gap-3 ${needsNodes ? 'bg-accent/10 border-accent/20' : 'bg-secondary/10 border-secondary/20'}`}>
          {needsNodes ? <AlertTriangle className="text-accent shrink-0 mt-0.5" /> : <CheckCircle className="text-secondary shrink-0 mt-0.5" />}
          <div>
            <h4 className={`text-sm font-bold ${needsNodes ? 'text-accent' : 'text-secondary'}`}>
              {needsNodes ? 'New pNodes Recommended' : 'Capacity Levels Optimal'}
            </h4>
            <p className="text-xs text-text-primary mt-1 leading-relaxed">
              {needsNodes ? (
                <>
                  Deploy <span className="font-bold text-accent">~{recommendedNodes} new pNodes</span> in next 30 days to maintain capacity buffer.
                  Current growth: <span className="font-mono">{dailyGrowthTB.toFixed(1)} TB/day</span>.
                </>
              ) : (
                <>
                  At current growth rate (<span className="font-mono">{dailyGrowthTB.toFixed(1)} TB/day</span>),
                  usage reaches <span className="font-bold">{targetMilestoneTB >= 1000 ? `${(targetMilestoneTB / 1000).toFixed(0)}PB` : `${targetMilestoneTB}TB`}</span> in <span className="font-mono font-bold">{daysToMilestone.toFixed(0)} days</span>.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-root p-3 rounded-lg border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Utilization</div>
            <div className="text-2xl font-bold text-text-primary font-mono">{utilization.toFixed(1)}%</div>
            <div className="w-full h-1.5 bg-border-strong rounded-full mt-2 overflow-hidden">
              <div className={`h-full ${utilization > 80 ? 'bg-accent' : 'bg-secondary'}`} style={{ width: `${utilization}%` }}></div>
            </div>
          </div>
          <div className="bg-root p-3 rounded-lg border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Days to Saturation</div>
            <div className="text-2xl font-bold text-text-primary font-mono">{daysToFull < 999 ? daysToFull.toFixed(0) : '>999'}</div>
            <div className="text-[10px] text-text-muted mt-1">Based on linear projection</div>
          </div>
        </div>


      </div>

      <div className="flex-1 min-h-[180px] bg-root rounded-xl border border-border-subtle p-4 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-text-secondary uppercase">30-Day Projection</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center text-primary"><span className="w-2 h-2 rounded-full bg-primary mr-1"></span> Used</span>
            <span className="flex items-center text-text-muted"><span className="w-2 h-2 rounded-full bg-text-muted mr-1"></span> Cap</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [`${value.toFixed(0)} TB`, '']}
            />
            <ReferenceLine y={totalStorageTB} stroke="var(--text-muted)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="used" stroke="var(--color-primary)" fill="url(#colorUsed)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Node Health Matrix
const NodeMatrix = ({ nodes, onNodeClick }: { nodes: PNode[], onNodeClick?: (node: PNode) => void }) => {
  const displayNodes = nodes.slice(0, 112);

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-text-primary flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-primary" />
          Cluster Health Matrix
        </h3>
        <div className="flex space-x-3 text-[10px] uppercase font-bold text-text-muted">
          <span className="flex items-center"><span className="w-2 h-2 bg-secondary rounded-sm mr-1.5 shadow-[0_0_5px_var(--color-secondary)]"></span> Active</span>
          <span className="flex items-center"><span className="w-2 h-2 bg-accent rounded-sm mr-1.5"></span> Warn</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-8 md:grid-cols-10 lg:grid-cols-14 gap-1 auto-rows-min content-start">
        {displayNodes.map((node, i) => (
          <button
            key={i}
            onClick={() => onNodeClick?.(node)}
            className={`aspect-square rounded-[2px] transition-all duration-200 hover:scale-125 hover:z-20 cursor-pointer relative group ${node.status === 'active' || node.status === 'online' ? 'bg-secondary/30 border border-secondary/50 hover:bg-secondary hover:shadow-[0_0_10px_var(--color-secondary)]' :
              node.status === 'delinquent' ? 'bg-accent/30 border border-accent/50 hover:bg-accent' :
                'bg-red-500/30 border border-red-500/50 hover:bg-red-500'
              }`}
            title={`Node: ${node.pubkey}\nStatus: ${node.status}\nResponse: ${node.response_time ?? 0}ms`}
          >
          </button>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-text-muted text-center font-mono opacity-50">
        {nodes.length > 112 ? `+${nodes.length - 112} more nodes hidden` : 'All nodes visible'}
      </div>
    </div>
  )
}

export const Dashboard: React.FC<DashboardProps> = ({ nodes, onNodeClick, onNavigateToNodes }) => {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [latencyDist, setLatencyDist] = useState<LatencyDistribution | null>(null);
  const [sortMetric, setSortMetric] = useState<'rank' | 'latency' | 'score' | 'credit'>('rank');

  // New analytics metrics
  const { metrics, loading: metricsLoading, refresh } = useDashboardMetrics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLatencyChart, setShowLatencyChart] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, latencyData] = await Promise.all([
          apiService.getStats(),
          apiService.getLatencyDistribution()
        ]);
        setStats(statsData);
        setLatencyDist(latencyData);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchData();
  }, []);

  // Use props nodes as fallback or for side calculations
  const regionData = nodes.reduce((acc: any, node) => {
    // Try to get country from new API structure or fallback to geo_info
    const region = node.country || node.geo_info?.region || 'Unknown';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.keys(regionData).map(key => ({ name: key, value: regionData[key] }));

  const COLORS = ['#933481', '#008E7C', '#FE8300', '#D1D1D6', '#6E6E7E'];

  // Convert API latency distribution to Chart format
  // Order keys numerically logic
  const latencyDistribution = latencyDist ? Object.entries(latencyDist).map(([range, count]) => ({
    range,
    count
  })).sort((a, b) => {
    // Custom sort to handle "0-50ms", "100-250ms" etc.
    // Extract first number
    const getNum = (str: string) => parseInt(str.match(/\d+/)?.[0] || '0');
    return getNum(a.range) - getNum(b.range);
  }) : [];

  // Derived values for display (prefer API stats, fallback to calculation if needed)
  const activeNodesCount = stats?.online_nodes ?? nodes.filter(n => n.status === 'active').length;
  // Convert PB to TB for display (1 PB = 1000 TB)
  const totalStorageTB = stats ? stats.total_storage_pb * 1000 : nodes.reduce((acc, n) => acc + ((n.storage_capacity ?? 0) / 1e12), 0);
  const usedStorageTB = stats ? stats.used_storage_pb * 1000 : nodes.reduce((acc, n) => acc + ((n.storage_used ?? 0) / 1e12), 0);

  // Calculate average latency from nodes as a fallback or additional metric
  const calculatedAvgLatency = Math.round(nodes.reduce((acc, n) => acc + (n.response_time || n.latency_ms || 0), 0) / (nodes.length || 1));
  const avgPerformance = stats?.average_performance ?? 0;

  // Safe storage values for per-node display
  const getStorageCapacity = (n: PNode) => (n.storage_capacity ?? n.total_storage_tb ?? 0);
  const getStorageUsed = (n: PNode) => (n.storage_used ?? n.used_storage_tb ?? 0);

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500 pb-20 bg-root">

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center">
            <LayoutDashboard className="mr-3 text-primary" />
            Network Dashboard
          </h2>
          <p className="text-sm text-text-muted mt-1">Real-time overview of network health and performance.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || metricsLoading}
            className="flex items-center px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-overlay-hover hover:border-primary/30 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin text-primary' : 'text-text-muted group-hover:text-primary transition-colors'}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            onClick={() => setShowLatencyChart(!showLatencyChart)}
            className="flex items-center px-4 py-2 bg-surface border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-overlay-hover hover:border-primary/30 transition-all shadow-sm group"
            title={showLatencyChart ? 'Hide Latency Chart' : 'Show Latency Chart'}
          >
            {showLatencyChart ? <EyeOff className="w-4 h-4 mr-2 text-text-muted group-hover:text-primary transition-colors" /> : <Eye className="w-4 h-4 mr-2 text-text-muted group-hover:text-primary transition-colors" />}
            Latency Chart
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          label="Online Nodes"
          value={activeNodesCount}
          subtext={`Total: ${stats?.total_nodes ?? nodes.length}`}
          icon={Server}
          trend={12}
          trendColor="text-emerald-500"
        />
        <StatCard
          label="Offline Nodes"
          value={(stats?.total_nodes ?? nodes.length) - activeNodesCount}
          subtext={`${((((stats?.total_nodes ?? nodes.length) - activeNodesCount) / ((stats?.total_nodes ?? nodes.length) || 1)) * 100).toFixed(1)}% of total`}
          icon={AlertTriangle}
          trendColor="text-red-500"
        />
        <StatCard
          label="Global Capacity"
          value={`${totalStorageTB.toFixed(0)} TB`}
          subtext={`${((usedStorageTB / (totalStorageTB || 1)) * 100).toFixed(6)}% Utilized`}
          icon={HardDrive}
          trend={8.2}
          trendColor="text-secondary"
        />
        <StatCard
          label="Network Health Score"
          value={`${avgPerformance.toFixed(1)}`}
          subtext="Overall Network"
          icon={Activity}
          trend={2.4}
          trendColor="text-emerald-500"
        />
        <StatCard
          label="Regions"
          value={pieData.length}
          subtext="Geo-distributed"
          icon={Globe}
        />
      </div>

      {/* Storage Forecast Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StorageForecast totalStorageTB={totalStorageTB} usedStorageTB={usedStorageTB} />
      </div>

      {/* Main Visuals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[400px]">
        {/* Latency Chart - Optional */}
        {showLatencyChart && (
          <div className="lg:col-span-2 bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col h-[300px] lg:h-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-text-primary flex items-center">
                <Wifi className="w-5 h-5 mr-2 text-primary" />
                Latency Distribution
              </h3>
              <div className="flex items-center gap-2">
                <div className="bg-overlay-hover rounded-lg p-1 flex text-xs">
                  <button className="px-3 py-1 bg-surface shadow-sm rounded-md text-text-primary font-medium border border-border-subtle">Log</button>
                  <button className="px-3 py-1 text-text-muted">Linear</button>
                </div>
                <button
                  onClick={() => setShowLatencyChart(!showLatencyChart)}
                  className="p-2 hover:bg-overlay-hover rounded-lg transition-colors text-text-muted hover:text-text-primary"
                  title={showLatencyChart ? "Hide chart" : "Show chart"}
                >
                  {showLatencyChart ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
            {showLatencyChart && (
              <div className="flex-1 w-full min-h-0">
                {latencyDist ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="range"
                        stroke="#A6A6B2"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#A6A6B2"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--overlay-hover)' }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-primary)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {latencyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-muted">
                    <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading distribution...
                  </div>
                )}
              </div>
            )}
            {!showLatencyChart && (
              <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                Click the arrow to view latency distribution
              </div>
            )}
          </div>
        )}

        {/* Storage Usage Chart */}
        <div className={`${showLatencyChart ? 'lg:col-span-1' : 'lg:col-span-3'} min-h-[300px] lg:min-h-0`}>
          <StorageUsageChart
            totalStoragePB={stats?.total_storage_pb ?? (totalStorageTB / 1000)}
            usedStoragePB={stats?.used_storage_pb ?? (usedStorageTB / 1000)}
          />
        </div>
      </div>


      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Regional Distribution */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 lg:col-span-1">
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-primary" />
            Geo-Presence
          </h3>
          <div className="h-48 w-full flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-bold text-text-primary">{stats?.total_nodes ?? nodes.length}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest">Total Nodes</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-[10px]">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-text-secondary font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Nodes Table */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-overlay-hover">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center">
                <Layers className="w-5 h-5 mr-2 text-primary" />
                Top Performers
              </h3>
              <div className="flex bg-root rounded-lg p-0.5 border border-border-subtle">
                <button
                  onClick={() => setSortMetric('credit')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${sortMetric === 'credit' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Credit
                </button>
                <button
                  onClick={() => setSortMetric('latency')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${sortMetric === 'latency' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Latency
                </button>
                <button
                  onClick={() => setSortMetric('score')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${sortMetric === 'score' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Score
                </button>
              </div>
            </div>
            <button
              onClick={onNavigateToNodes}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Full Registry &rarr;
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-text-secondary">
              <thead className="bg-overlay-hover text-text-muted uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3 text-center">{sortMetric === 'credit' ? 'Credits' : 'Rank'}</th>
                  <th className="px-6 py-3">Node Identity</th>
                  <th className="px-6 py-3">Storage</th>
                  <th className="px-6 py-3">Performance</th>
                  <th className="px-6 py-3 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono text-xs">
                {[...nodes]
                  .sort((a, b) => {
                    if (sortMetric === 'rank') {
                      return (a.credits_rank ?? Number.MAX_SAFE_INTEGER) - (b.credits_rank ?? Number.MAX_SAFE_INTEGER);
                    } else if (sortMetric === 'credit') {
                      return (b.credits ?? 0) - (a.credits ?? 0);
                    } else if (sortMetric === 'latency') {
                      return (a.response_time ?? Number.MAX_SAFE_INTEGER) - (b.response_time ?? Number.MAX_SAFE_INTEGER);
                    } else {
                      return (b.performance_score ?? b.uptime_score ?? 0) - (a.performance_score ?? a.uptime_score ?? 0);
                    }
                  })
                  .slice(0, 5)
                  .map((node, index) => {
                    const capacity = getStorageCapacity(node);
                    const used = getStorageUsed(node);
                    return (
                      <tr
                        key={node.pubkey}
                        className="hover:bg-overlay-hover transition-colors group cursor-pointer"
                        onClick={() => onNodeClick?.(node)}
                      >
                        <td className="px-6 py-4 text-center">
                          {sortMetric === 'credit' ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-primary text-sm">
                                {(node.credits ?? 0).toLocaleString()}
                              </span>
                              <span className="text-[9px] text-text-muted uppercase">XAND</span>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                            ${index < 3 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-overlay-active text-text-muted'}
                          `}>
                              {index + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-text-primary group-hover:text-primary transition-colors">
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-2">
                              {node.pubkey.substring(0, 8)}...
                              <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'active' || node.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            </span>
                            <span className="text-[10px] text-text-muted uppercase tracking-wider opacity-70">
                              {node.city || 'Unknown'}, {node.country || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-16 h-1 bg-overlay-active rounded-full mr-2 overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${capacity > 0 ? (used / capacity) * 100 : 0}%` }}></div>
                            </div>
                            {(capacity / 1e12).toFixed(2)} TB
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary font-bold">
                          {node.performance_score ?? node.uptime_score ?? 0}
                          <span className="text-[10px] font-normal text-text-muted ml-1">/ 100</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${(node.response_time ?? 999) < 50 ? 'text-emerald-500' :
                            (node.response_time ?? 999) < 150 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                            {node.response_time ?? node.latency_ms ?? 0} ms
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};