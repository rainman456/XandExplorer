import React, { useState } from 'react';
import { Wallet, ArrowRight, TrendingUp, Shield, Zap, Check, AlertCircle, ExternalLink, HardDrive } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export const PurchaseView: React.FC = () => {
    const [walletConnected, setWalletConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [amount, setAmount] = useState('100');
    const [currency, setCurrency] = useState<'SOL' | 'USDC'>('USDC');
    const [isSwapping, setIsSwapping] = useState(false);
    const [swapSuccess, setSwapSuccess] = useState(false);

    // Mock Price Data
    const XAND_PRICE_USD = 0.042;
    const SOL_PRICE_USD = 145.50;

    const estimatedXand = currency === 'USDC'
        ? (parseFloat(amount || '0') / XAND_PRICE_USD).toFixed(2)
        : ((parseFloat(amount || '0') * SOL_PRICE_USD) / XAND_PRICE_USD).toFixed(2);

    const handleConnect = () => {
        setIsConnecting(true);
        setTimeout(() => {
            setIsConnecting(false);
            setWalletConnected(true);
        }, 1500);
    };

    const handleSwap = () => {
        setIsSwapping(true);
        setTimeout(() => {
            setIsSwapping(false);
            setSwapSuccess(true);
            setTimeout(() => {
                setSwapSuccess(false);
                setAmount('');
            }, 3000);
        }, 2000);
    };

    // Fake chart data
    const chartData = Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        value: 0.038 + Math.random() * 0.008
    }));

    return (
        <div className="h-full bg-root overflow-y-auto custom-scrollbar p-4 lg:p-8 animate-in fade-in duration-500">

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="relative rounded-3xl overflow-hidden bg-gradient-primary shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/20 to-transparent"></div>

                    <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
                                <Zap size={12} className="mr-2" /> Master pNode Economics
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                                Unlock Storage Income & Earn Rewards
                            </h1>
                            <p className="text-white/80 text-lg leading-relaxed mb-6">
                                Participate in the Xandeum network by acquiring XAND tokens. Run pNodes, provide storage, and earn high-yield rewards in a decentralized physical infrastructure network.
                            </p>
                            <div className="flex gap-4">
                                <a href="https://xandeum.network" target="_blank" rel="noreferrer" className="bg-white text-primary hover:bg-white/90 px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center">
                                    Read Whitepaper <ExternalLink size={16} className="ml-2" />
                                </a>
                            </div>
                        </div>
                        {/* 3D Coin Graphic Placeholder */}
                        <div className="hidden lg:block w-64 h-64 bg-white/10 rounded-full blur-3xl absolute right-10 top-1/2 transform -translate-y-1/2"></div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Swap Interface */}
                <div className="lg:col-span-5 space-y-6">

                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-text-primary">Buy $XAND</h2>
                            <div className="text-xs font-mono text-secondary bg-secondary-soft px-2 py-1 rounded border border-secondary/20">
                                1 XAND ≈ ${XAND_PRICE_USD.toFixed(3)}
                            </div>
                        </div>

                        {/* Wallet Connect Overlay */}
                        {!walletConnected && (
                            <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
                                <div className="bg-elevated p-4 rounded-full mb-4 shadow-lg border border-border-subtle">
                                    <Wallet size={32} className="text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary mb-2">Connect Wallet to Swap</h3>
                                <p className="text-sm text-text-muted mb-6 max-w-xs">Connect your Solana wallet to purchase XAND tokens directly via Jupiter Aggregator.</p>
                                <button
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                    className="bg-gradient-primary hover:brightness-110 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 w-full max-w-xs flex justify-center items-center"
                                >
                                    {isConnecting ? (
                                        <>Connecting...</>
                                    ) : (
                                        <>Connect Phantom / Solflare</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Swap Form */}
                        <div className={`space-y-4 transition-opacity duration-300 ${!walletConnected ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>

                            {/* Input */}
                            <div className="bg-root border border-border-subtle rounded-xl p-4">
                                <div className="flex justify-between text-xs text-text-muted mb-2">
                                    <span>You Pay</span>
                                    <span>Balance: 0.00</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="bg-transparent text-2xl font-bold text-text-primary outline-none w-full placeholder:text-text-muted/30"
                                        placeholder="0.00"
                                    />
                                    <div className="flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-2 py-1">
                                        <button
                                            onClick={() => setCurrency('USDC')}
                                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${currency === 'USDC' ? 'bg-gradient-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                                        >USDC</button>
                                        <button
                                            onClick={() => setCurrency('SOL')}
                                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${currency === 'SOL' ? 'bg-gradient-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                                        >SOL</button>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-elevated border border-border-subtle p-2 rounded-full text-text-muted">
                                    <ArrowRight size={16} className="rotate-90" />
                                </div>
                            </div>

                            {/* Output */}
                            <div className="bg-root border border-border-subtle rounded-xl p-4">
                                <div className="flex justify-between text-xs text-text-muted mb-2">
                                    <span>You Receive (Estimated)</span>
                                    <span>Balance: 0.00</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-2xl font-bold text-text-primary">
                                        {amount ? estimatedXand : '0.00'}
                                    </span>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] text-white font-bold">X</div>
                                        <span className="font-bold text-sm text-primary">XAND</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-surface border border-border-subtle rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Rate</span>
                                    <span className="text-text-primary font-mono">1 XAND ≈ {currency === 'USDC' ? '0.042 USDC' : '0.00028 SOL'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Network Fee</span>
                                    <span className="text-text-primary font-mono">~0.000005 SOL</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Route</span>
                                    <span className="text-secondary flex items-center gap-1">Jupiter Aggregator <ExternalLink size={10} /></span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleSwap}
                                disabled={isSwapping || !amount}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center ${swapSuccess
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gradient-primary hover:brightness-110 text-white shadow-primary/20'
                                    }`}
                            >
                                {isSwapping ? (
                                    <span className="flex items-center animate-pulse">Processing Transaction...</span>
                                ) : swapSuccess ? (
                                    <span className="flex items-center"><Check size={20} className="mr-2" /> Transaction Sent!</span>
                                ) : (
                                    'Swap Now'
                                )}
                            </button>

                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 h-64 flex flex-col">
                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center">
                            <TrendingUp size={16} className="mr-2 text-secondary" /> XAND/USDC Price Action
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#008E7C" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#008E7C" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#008E7C" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Right Column: Economics Content */}
                <div className="lg:col-span-7 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface border border-border-subtle rounded-2xl p-6 hover:border-primary/50 transition-colors group">
                            <div className="w-12 h-12 bg-primary-soft rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <HardDrive className="text-primary w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">Proof of Physical Storage</h3>
                            <p className="text-sm text-text-muted leading-relaxed">
                                Xandeum nodes verify storage capacity using Proof-of-Physical-Storage (PoPS). Commit drive space to the network to start earning XAND rewards immediately.
                            </p>
                        </div>

                        <div className="bg-surface border border-border-subtle rounded-2xl p-6 hover:border-secondary/50 transition-colors group">
                            <div className="w-12 h-12 bg-secondary-soft rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Shield className="text-secondary w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">Liquid Staking Integration</h3>
                            <p className="text-sm text-text-muted leading-relaxed">
                                Xandeum integrates liquid staking directly. Your staked SOL earns standard validator yields PLUS storage fee revenue share from the Xandeum L2 layer.
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8">
                        <h3 className="text-xl font-bold text-text-primary mb-6">Revenue Model Breakdown</h3>

                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs mt-0.5 mr-4 shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-text-primary">Storage Rent</h4>
                                    <p className="text-sm text-text-muted mt-1">Users pay in XAND to store data on pNodes. This rent is distributed to active nodes based on their verified capacity and uptime.</p>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-border-subtle ml-3 my-1"></div>

                            <div className="flex items-start">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs mt-0.5 mr-4 shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-text-primary">Transaction Fees</h4>
                                    <p className="text-sm text-text-muted mt-1">A portion of transaction fees on the Xandeum sidechain is burned, reducing supply, while the remainder rewards block producers (pNodes).</p>
                                </div>
                            </div>

                            <div className="w-px h-8 bg-border-subtle ml-3 my-1"></div>

                            <div className="flex items-start">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs mt-0.5 mr-4 shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-text-primary">Inflationary Rewards</h4>
                                    <p className="text-sm text-text-muted mt-1">Early adoption is incentivized through a decreasing inflation schedule, ensuring pNodes are profitable even before full storage utilization.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-accent-soft/20 to-transparent border border-accent/20 rounded-2xl p-6 flex items-start">
                        <AlertCircle className="text-accent w-6 h-6 mr-4 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-text-primary mb-1">Important Note on pNode Requirements</h4>
                            <p className="text-sm text-text-muted">
                                To qualify for full rewards, pNodes must maintain {'>'}99.5% uptime and pass random Proof-of-Physical-Storage challenges every epoch. Delinquent nodes face slashed rewards.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
