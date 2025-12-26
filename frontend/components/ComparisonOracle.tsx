import React, { useMemo, useState } from 'react';
import { PNode } from '../types/node.types';
import { Download, TrendingUp, Zap, Server, Activity, ArrowRight, Shield, Database, Scale, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';

interface ComparisonOracleProps {
  nodes: PNode[];
}

const REAL_SOLANA_VALIDATORS = [
  { name: 'Jito', stake: 12500000, apy: 7.8, commission: 5, latency: 45, status: 'active' },
  { name: 'Coinbase Cloud', stake: 10200000, apy: 7.2, commission: 8, latency: 50, status: 'active' },
  { name: 'Galaxy', stake: 8100000, apy: 7.5, commission: 7, latency: 48, status: 'active' },
  { name: 'Helius', stake: 5400000, apy: 7.9, commission: 0, latency: 35, status: 'active' },
  { name: 'P2P.org', stake: 4800000, apy: 7.4, commission: 5, latency: 55, status: 'active' },
];

export const ComparisonOracle: React.FC<ComparisonOracleProps> = ({ nodes }) => {
  const xandAvgLatency = Math.round(nodes.reduce((acc, n) => acc + (n.latency_ms || 0), 0) / (nodes.length || 1));
  const xandTotalStorage = nodes.reduce((acc, n) => acc + (n.total_storage_tb || 0), 0);
  const xandAvgUptime = nodes.reduce((acc, n) => acc + (n.uptime_percent || 0), 0) / (nodes.length || 1);
  const xandPowerIndex = (xandTotalStorage) * (xandAvgUptime / 100);

  const solAvgLatency = Math.round(REAL_SOLANA_VALIDATORS.reduce((acc, n) => acc + n.latency, 0) / REAL_SOLANA_VALIDATORS.length);
  const solTotalStake = REAL_SOLANA_VALIDATORS.reduce((acc, n) => acc + n.stake, 0);
  const solAvgUptime = 99.8; 
  const solPowerIndex = (solTotalStake / 1000) * (solAvgUptime / 100);

  const historyData = Array.from({ length: 7 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    Xandeum: Math.floor(xandAvgLatency + (Math.random() * 20 - 10)),
    Solana: Math.floor(solAvgLatency + (Math.random() * 15 - 5)),
  }));

  const CHART_THEME = { text: '#A6A6B2' };

  const handleExportCSV = () => {
    // CSV Logic placeholder
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-root text-text-primary">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center font-mono">
            <Scale className="mr-3 text-primary" />
            CROSS_CHAIN_ORACLE
          </h2>
          <p className="text-text-muted mt-1 text-sm">
            Live telemetry comparison: Xandeum (Storage) vs Solana (Stake)
          </p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center px-4 py-2 bg-surface text-text-primary rounded-lg hover:bg-overlay-hover transition-colors shadow-sm border border-border-subtle text-xs font-mono tracking-wide"
        >
          <Download size={14} className="mr-2" /> EXPORT_DATA
        </button>
      </div>

      {/* Hero Comparison Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-xl">
         {/* Xandeum Side */}
         <div className="p-8 relative bg-primary-soft flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border-subtle group">
             <div className="absolute top-4 left-4 text-xs font-bold text-primary uppercase tracking-widest flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                Xandeum
             </div>
             <div className="mb-4 p-4 rounded-full bg-surface text-primary group-hover:scale-110 transition-transform duration-300 border border-primary/20">
                <Database size={40} />
             </div>
             <div className="text-5xl font-black text-text-primary mb-2 tracking-tighter">{xandPowerIndex.toFixed(0)}</div>
             <div className="text-xs text-primary/60 uppercase font-mono">Storage Power Index</div>
             
             <div className="flex mt-8 space-x-8 text-center">
                <div>
                   <div className="text-xl font-bold text-text-primary">{nodes.length}</div>
                   <div className="text-[10px] text-text-muted uppercase">Nodes</div>
                </div>
                <div>
                   <div className="text-xl font-bold text-text-primary">{xandAvgLatency}ms</div>
                   <div className="text-[10px] text-text-muted uppercase">Latency</div>
                </div>
             </div>
         </div>

         {/* Solana Side */}
         <div className="p-8 relative bg-accent-soft flex flex-col items-center justify-center group">
             <div className="absolute top-4 right-4 text-xs font-bold text-accent uppercase tracking-widest flex items-center">
                Solana
                <div className="w-2 h-2 bg-accent rounded-full ml-2"></div>
             </div>
             <div className="mb-4 p-4 rounded-full bg-surface text-accent group-hover:scale-110 transition-transform duration-300 border border-accent/20">
                <Shield size={40} />
             </div>
             <div className="text-5xl font-black text-text-primary mb-2 tracking-tighter">{solPowerIndex.toFixed(0)}</div>
             <div className="text-xs text-accent/60 uppercase font-mono">Stake Power Index</div>

             <div className="flex mt-8 space-x-8 text-center">
                <div>
                   <div className="text-xl font-bold text-text-primary">{REAL_SOLANA_VALIDATORS.length}</div>
                   <div className="text-[10px] text-text-muted uppercase">Validators (Top)</div>
                </div>
                <div>
                   <div className="text-xl font-bold text-text-primary">{solAvgLatency}ms</div>
                   <div className="text-[10px] text-text-muted uppercase">Latency</div>
                </div>
             </div>
         </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Latency History */}
         <div className="lg:col-span-2 bg-surface border border-border-subtle p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6 flex items-center">
               <Activity className="mr-2" size={16} /> Latency Variance
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1F2A" />
                  <XAxis dataKey="day" stroke={CHART_THEME.text} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={CHART_THEME.text} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="Xandeum" stroke="#933481" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-surface)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="Solana" stroke="#FE8300" strokeWidth={2} dot={{ r: 3, fill: 'var(--bg-surface)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Latency Delta Badge */}
         <div className="bg-surface border border-border-subtle p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5"></div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 relative z-10">Performance Delta</p>
            
            <div className="flex items-baseline relative z-10">
                <span className="text-4xl font-black text-text-primary mr-2">
                    {Math.abs(xandAvgLatency - solAvgLatency)}
                </span>
                <span className="text-sm text-text-muted">ms</span>
            </div>
            
            <div className={`mt-2 inline-flex items-center text-sm font-bold relative z-10 ${xandAvgLatency < solAvgLatency ? 'text-secondary' : 'text-accent'}`}>
                {xandAvgLatency < solAvgLatency ? 'Xandeum Advantage' : 'Solana Advantage'}
                <ArrowRight size={16} className="ml-1" />
            </div>

            <div className="mt-8 relative z-10">
                <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                    <span>XAND</span>
                    <span>SOL</span>
                </div>
                <div className="w-full h-2 bg-root rounded-full overflow-hidden flex">
                    <div className="bg-secondary" style={{ width: `${(solAvgLatency / (xandAvgLatency + solAvgLatency)) * 100}%` }}></div>
                    <div className="bg-accent" style={{ width: `${(xandAvgLatency / (xandAvgLatency + solAvgLatency)) * 100}%` }}></div>
                </div>
            </div>
         </div>
      </div>

      {/* Data Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Xandeum Feed */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden flex flex-col h-[500px]">
           <div className="p-4 border-b border-border-subtle bg-primary-soft flex justify-between items-center">
              <div className="flex items-center text-primary">
                <Database size={16} className="mr-2" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Xandeum Feed</h3>
              </div>
           </div>
           <div className="flex-1 overflow-auto custom-scrollbar p-2">
              <table className="w-full text-left text-xs">
                <thead className="text-text-muted font-bold uppercase sticky top-0 bg-surface">
                   <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Cap</th>
                      <th className="px-4 py-2 text-right">Ping</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                   {nodes.map(node => (
                      <tr key={node.pubkey} className="hover:bg-primary-soft transition-colors">
                         <td className="px-4 py-3 text-text-secondary">{node.pubkey.substring(0,8)}...</td>
                         <td className="px-4 py-3 text-text-primary">{node.total_storage_tb} TB</td>
                         <td className="px-4 py-3 text-right text-text-muted">{node.latency_ms}ms</td>
                      </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>

        {/* Solana Feed */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden flex flex-col h-[500px]">
           <div className="p-4 border-b border-border-subtle bg-accent-soft flex justify-between items-center">
              <div className="flex items-center text-accent">
                <Shield size={16} className="mr-2" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Solana Feed</h3>
              </div>
           </div>
           <div className="flex-1 overflow-auto custom-scrollbar p-2">
              <table className="w-full text-left text-xs">
                <thead className="text-text-muted font-bold uppercase sticky top-0 bg-surface">
                   <tr>
                      <th className="px-4 py-2">Validator</th>
                      <th className="px-4 py-2">Stake</th>
                      <th className="px-4 py-2 text-right">Ping</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                   {REAL_SOLANA_VALIDATORS.map(node => (
                      <tr key={node.name} className="hover:bg-accent-soft transition-colors">
                         <td className="px-4 py-3 text-text-secondary">{node.name}</td>
                         <td className="px-4 py-3 text-text-primary">{(node.stake / 1000000).toFixed(1)}M</td>
                         <td className="px-4 py-3 text-right text-text-muted">{node.latency}ms</td>
                      </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
};