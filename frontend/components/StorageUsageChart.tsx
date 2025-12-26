import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { HardDrive, AlertTriangle } from 'lucide-react';

interface StorageUsageChartProps {
    totalStoragePB: number;
    usedStoragePB: number;
}

export const StorageUsageChart: React.FC<StorageUsageChartProps> = ({ totalStoragePB, usedStoragePB }) => {
    // Helper function to format storage with smart unit scaling
    const formatStorage = (pb: number) => {
        const bytes = pb * 1e15; // Convert PB to bytes

        if (bytes >= 1e15) return { value: (bytes / 1e15).toFixed(2), unit: 'PB' };
        if (bytes >= 1e12) return { value: (bytes / 1e12).toFixed(2), unit: 'TB' };
        if (bytes >= 1e9) return { value: (bytes / 1e9).toFixed(2), unit: 'GB' };
        return { value: (bytes / 1e6).toFixed(2), unit: 'MB' };
    };

    const availablePB = totalStoragePB - usedStoragePB;
    const usedPercent = totalStoragePB > 0 ? (usedStoragePB / totalStoragePB) * 100 : 0;
    const availablePercent = 100 - usedPercent;

    const usedFormatted = formatStorage(usedStoragePB);
    const availableFormatted = formatStorage(availablePB);
    const totalFormatted = formatStorage(totalStoragePB);

    // Warning state for high utilization
    const isHighUtilization = usedPercent > 80;

    const pieData = [
        { name: 'Used', value: usedStoragePB, color: '#933481' }, // Primary brand color
        { name: 'Available', value: availablePB, color: '#6E6E7E' } // Neutral gray
    ];

    return (
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center">
                    <HardDrive className="w-5 h-5 mr-2 text-primary" />
                    Storage Usage
                </h3>
                <p className="text-xs text-text-muted mt-1">Used vs available network storage capacity</p>
            </div>

            {/* Chart + Summary Layout */}
            <div className="flex-1 flex items-center gap-6">
                {/* Donut Chart - Left Side */}
                <div className="flex-shrink-0 w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Numeric Summary - Right Side */}
                <div className="flex-1 space-y-3">
                    {/* Used Storage */}
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-text-primary font-mono">
                                {usedFormatted.value}
                            </span>
                            <span className="text-sm font-medium text-text-muted">{usedFormatted.unit}</span>
                            <span className="text-sm font-bold text-primary ml-auto">
                                {usedPercent.toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-[#933481]"></div>
                            <span className="text-xs text-text-muted uppercase tracking-wide">Used</span>
                        </div>
                    </div>

                    {/* Available Storage */}
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-text-primary font-mono">
                                {availableFormatted.value}
                            </span>
                            <span className="text-sm font-medium text-text-muted">{availableFormatted.unit}</span>
                            <span className="text-sm font-bold text-text-muted ml-auto">
                                {availablePercent.toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-[#6E6E7E]"></div>
                            <span className="text-xs text-text-muted uppercase tracking-wide">Available</span>
                        </div>
                    </div>

                    {/* Total Capacity */}
                    <div className="pt-2 border-t border-border-subtle">
                        <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                Total Capacity
                            </span>
                            <span className="text-sm font-bold text-text-primary font-mono">
                                {totalFormatted.value} {totalFormatted.unit}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contextual Insight */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
                {isHighUtilization ? (
                    <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle size={14} className="text-accent flex-shrink-0" />
                        <span className="text-accent font-medium">
                            High utilization: {usedPercent.toFixed(1)}% — Consider deploying additional storage
                        </span>
                    </div>
                ) : (
                    <div className="text-xs text-text-muted">
                        <span className="font-medium text-text-primary">Capacity headroom:</span>{' '}
                        {availablePercent.toFixed(1)}% remaining ({availableFormatted.value} {availableFormatted.unit})
                    </div>
                )}
            </div>
        </div>
    );
};
