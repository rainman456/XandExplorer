import React, { useState, useEffect } from 'react';
import { Calculator, Server, HardDrive, ShieldCheck, ShieldAlert, Layers, Database, AlertCircle, ArrowRight, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const StoragePlannerView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'calculator' | 'simulator'>('calculator');

    return (
        <div className="h-full flex flex-col bg-root overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            {/* Navigation Tabs */}
            <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border-subtle px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-text-primary flex items-center">
                    <Calculator className="w-6 h-6 mr-3 text-primary" />
                    Storage Planner
                </h1>
                <div className="flex bg-root p-1 rounded-lg border border-border-subtle">
                    <button
                        onClick={() => setActiveTab('calculator')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'calculator' ? 'bg-surface text-primary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Cost & ROI Calculator
                    </button>
                    <button
                        onClick={() => setActiveTab('simulator')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'simulator' ? 'bg-surface text-secondary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Redundancy Simulator
                    </button>
                </div>
            </div>

            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex-1">
                {activeTab === 'calculator' ? <CostCalculator /> : <RedundancySimulator />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: COST CALCULATOR ---
import { useCalculator } from '../hooks/useCalculator';

const CostCalculator = () => {
    // Inputs
    const [storageTB, setStorageTB] = useState<number>(10);
    const [durationMonths, setDurationMonths] = useState<number>(12);
    const [nodeSizeTB, setNodeSizeTB] = useState<number>(16); // For ROI
    const [uptime, setUptime] = useState<number>(99.9); // For ROI

    const { costs, roi, fetchCosts, fetchROI, loading } = useCalculator();

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCosts(storageTB);
            fetchROI(nodeSizeTB, uptime);
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [storageTB, nodeSizeTB, uptime, fetchCosts, fetchROI]);

    // Use API data or fallbacks if loading/null
    // Note: The API returns monthly costs. We need to multiply by durationMonths for the comparison chart if we want "Total Cost", or just show monthly. 
    // The previous UI showed Total Cost for durationMonths.

    const xandeumCost = (costs?.providers.find(p => p.name.includes('Xandeum'))?.monthly_cost_usd || 0) * durationMonths;
    const awsCost = (costs?.providers.find(p => p.name.includes('AWS'))?.monthly_cost_usd || 0) * durationMonths;

    // Map API data to chart format
    const comparisonData = costs?.providers.map(p => ({
        name: p.name,
        cost: p.monthly_cost_usd * durationMonths,
        fill: p.name.includes('Xandeum') ? '#662459' : p.name.includes('AWS') ? '#FF9900' : p.name.includes('Arweave') ? '#000000' : '#0090FF'
    })) || [];

    const estMonthlyRewardXAND = roi?.monthly_xand || 0;
    const estMonthlyRewardUSD = roi?.monthly_usd || 0;

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">

            {/* Consumer Section: Cost Estimator */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-lg">
                <div className="flex items-center mb-6">
                    <div className="p-2 bg-primary-soft rounded-lg mr-3">
                        <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Storage Cost Estimator</h2>
                        <p className="text-sm text-text-muted">Compare decentralized storage costs vs traditional cloud.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-4 space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label className="font-bold text-text-primary">Data Volume</label>
                                <span className="text-primary font-mono">{storageTB} TB</span>
                            </div>
                            <input
                                type="range" min="1" max="1000" step="1"
                                value={storageTB} onChange={(e) => setStorageTB(Number(e.target.value))}
                                className="w-full h-2 bg-border-strong rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label className="font-bold text-text-primary">Duration</label>
                                <span className="text-primary font-mono">{durationMonths} Months</span>
                            </div>
                            <input
                                type="range" min="1" max="60" step="1"
                                value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))}
                                className="w-full h-2 bg-border-strong rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        <div className="bg-root p-4 rounded-xl border border-border-subtle">
                            <h3 className="text-xs font-bold text-text-muted uppercase mb-3">Estimated Cost ({durationMonths} Mo)</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-text-secondary font-medium">Xandeum</span>
                                {loading ? <span className="text-sm text-muted">Calculating...</span> :
                                    <span className="text-2xl font-bold text-primary">${xandeumCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
                            </div>
                            <div className="w-full h-px bg-border-subtle my-2"></div>
                            <div className="flex items-end justify-between">
                                <span className="text-text-muted text-sm">AWS S3</span>
                                <span className="text-sm font-mono text-text-secondary">${awsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="mt-2 text-[10px] text-secondary flex items-center">
                                <TrendingUp size={12} className="mr-1" />
                                {awsCost > 0 ? `Save ${(100 - (xandeumCost / awsCost * 100)).toFixed(0)}% vs Hyperscalers` : 'Calculating savings...'}
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="lg:col-span-8 h-64 lg:h-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'var(--overlay-hover)' }}
                                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Cost']}
                                />
                                <Bar dataKey="cost" barSize={20} radius={[0, 4, 4, 0]}>
                                    {comparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Provider Section: ROI Calculator */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-lg">
                <div className="flex items-center mb-6">
                    <div className="p-2 bg-secondary-soft rounded-lg mr-3">
                        <Server className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">pNode ROI Calculator</h2>
                        <p className="text-sm text-text-muted">Estimate rewards for running a storage provider node.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase block mb-2">Committed Storage</label>
                            <select
                                value={nodeSizeTB}
                                onChange={(e) => setNodeSizeTB(Number(e.target.value))}
                                className="w-full bg-root border border-border-strong rounded-lg p-3 text-text-primary outline-none focus:border-secondary"
                            >
                                <option value={4}>4 TB (Minimum)</option>
                                <option value={8}>8 TB</option>
                                <option value={16}>16 TB</option>
                                <option value={32}>32 TB</option>
                                <option value={100}>100 TB (Enterprise)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase block mb-2">Expected Uptime</label>
                            <input
                                type="range" min="90" max="100" step="0.1"
                                value={uptime} onChange={(e) => setUptime(Number(e.target.value))}
                                className="w-full h-2 bg-border-strong rounded-lg appearance-none cursor-pointer accent-secondary"
                            />
                            <div className="text-right text-sm font-mono mt-1 text-secondary">{uptime.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-elevated p-5 rounded-xl border border-border-subtle flex flex-col justify-center items-center text-center">
                            <div className="text-xs font-bold text-text-muted uppercase mb-2">Est. Monthly Tokens</div>
                            {loading ? <span className="text-sm text-text-muted">Calculating...</span> :
                                <div className="text-3xl font-black text-secondary font-mono">{estMonthlyRewardXAND.toLocaleString(undefined, { maximumFractionDigits: 0 })} XAND</div>}
                            <div className="text-xs text-text-muted mt-1">Based on current network difficulty</div>
                        </div>
                        <div className="bg-elevated p-5 rounded-xl border border-border-subtle flex flex-col justify-center items-center text-center">
                            <div className="text-xs font-bold text-text-muted uppercase mb-2">Est. Monthly USD</div>
                            {loading ? <span className="text-sm text-text-muted">Calculating...</span> :
                                <div className="text-3xl font-black text-text-primary font-mono">${estMonthlyRewardUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>}
                            <div className="text-xs text-text-muted mt-1">@ $0.042 / XAND</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

// --- SUB-COMPONENT: REDUNDANCY SIMULATOR ---

const RedundancySimulator = () => {
    // Simulator State
    const TOTAL_NODES = 12;
    const DATA_SHARDS = 4;
    const PARITY_SHARDS = 2; // Reed Solomon 4+2

    // Node Status: true = online, false = failed
    const [nodes, setNodes] = useState<boolean[]>(Array(TOTAL_NODES).fill(true));
    const [isSimulating, setIsSimulating] = useState(false);

    // Which nodes hold shards? (Simple static allocation for demo: 0-5)
    // 0,1,2,3 = Data, 4,5 = Parity
    const shardAllocation = [0, 1, 2, 3, 4, 5];

    const toggleNode = (index: number) => {
        const newNodes = [...nodes];
        newNodes[index] = !newNodes[index];
        setNodes(newNodes);
    };

    const resetNodes = () => setNodes(Array(TOTAL_NODES).fill(true));

    // Determine Health
    const activeShards = shardAllocation.filter(idx => nodes[idx]).length;
    const isRecoverable = activeShards >= DATA_SHARDS;
    const healthPercent = (activeShards / (DATA_SHARDS + PARITY_SHARDS)) * 100;

    let status = 'safe';
    if (!isRecoverable) status = 'lost';
    else if (activeShards < (DATA_SHARDS + PARITY_SHARDS)) status = 'risk';

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4">
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-lg">
                <div className="flex items-center mb-6">
                    <div className="p-2 bg-accent-soft rounded-lg mr-3">
                        <Layers className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Data Redundancy Simulator</h2>
                        <p className="text-sm text-text-muted">Visualize Reed-Solomon Erasure Coding. Configuration: <span className="font-mono text-accent">4+2 (6 Shards Total)</span>.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Visual Grid */}
                    <div className="bg-root rounded-xl p-6 border border-border-subtle relative">
                        <div className="grid grid-cols-4 gap-4">
                            {nodes.map((online, i) => {
                                const isShard = shardAllocation.includes(i);
                                const isParity = i === 4 || i === 5;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => toggleNode(i)}
                                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group ${!online
                                            ? 'bg-red-500/10 border-red-500/50 opacity-80'
                                            : isShard
                                                ? (isParity ? 'bg-accent/10 border-accent text-accent' : 'bg-secondary/10 border-secondary text-secondary')
                                                : 'bg-elevated border-border-subtle text-text-muted'
                                            }`}
                                    >
                                        {/* Icons */}
                                        <div className="z-10 transform group-hover:scale-110 transition-transform">
                                            {!online ? <AlertCircle size={24} className="text-red-500" /> : <HardDrive size={24} />}
                                        </div>

                                        {/* Label */}
                                        <span className="text-[10px] font-bold uppercase mt-2 z-10">
                                            {!online ? 'OFFLINE' : (isShard ? (isParity ? 'PARITY' : 'DATA') : 'EMPTY')}
                                        </span>

                                        {/* Status Indicator */}
                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${online ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500'}`}></div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-4 text-center text-xs text-text-muted">
                            Click nodes to simulate failure
                        </div>
                    </div>

                    {/* Status Panel */}
                    <div className="flex flex-col justify-center space-y-6">
                        <div className={`p-6 rounded-2xl border ${status === 'safe' ? 'bg-secondary-soft border-secondary/30' :
                            status === 'risk' ? 'bg-accent-soft border-accent/30' : 'bg-red-500/10 border-red-500/30'
                            }`}>
                            <div className="flex items-center mb-4">
                                {status === 'safe' ? <ShieldCheck className="w-8 h-8 text-secondary mr-3" /> :
                                    status === 'risk' ? <AlertCircle className="w-8 h-8 text-accent mr-3" /> :
                                        <ShieldAlert className="w-8 h-8 text-red-500 mr-3" />}

                                <div>
                                    <h3 className={`text-xl font-bold uppercase ${status === 'safe' ? 'text-secondary' :
                                        status === 'risk' ? 'text-accent' : 'text-red-500'
                                        }`}>
                                        {status === 'safe' ? 'DATA SECURE' : status === 'risk' ? 'RECOVERY POSSIBLE' : 'DATA LOSS DETECTED'}
                                    </h3>
                                    <p className="text-sm text-text-primary opacity-80">
                                        {status === 'safe' ? 'Redundancy optimal. Multiple nodes can fail.' :
                                            status === 'risk' ? 'Redundancy critical. Data is being reconstructed from parity.' :
                                                'Too many shards lost. Reconstruction impossible.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Shard Integrity</span>
                                    <span>{activeShards} / 6 Active</span>
                                </div>
                                <div className="w-full h-3 bg-root rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isRecoverable ? 'bg-secondary' : 'bg-red-500'}`}
                                        style={{ width: `${healthPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-text-muted">
                                    <span>Need 4 Shards to Recover</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-elevated p-6 rounded-2xl border border-border-subtle">
                            <h4 className="font-bold text-text-primary mb-2 flex items-center"><Database size={16} className="mr-2" /> How it works</h4>
                            <p className="text-sm text-text-secondary leading-relaxed mb-4">
                                Unlike simple replication (copying data 3 times), Xandeum uses erasure coding. We split data into 4 pieces and calculate 2 parity pieces. Any 4 pieces can reconstruct the original file. This uses 1.5x storage instead of 3x, saving massive costs.
                            </p>
                            <button onClick={resetNodes} className="w-full py-2 bg-surface border border-border-strong rounded-lg text-sm font-bold text-text-primary hover:bg-overlay-hover transition-colors">
                                Reset Simulation
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
