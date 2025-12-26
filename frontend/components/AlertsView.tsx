import React, { useState } from 'react';
import { Bell, Shield, Plus, Trash2, Save, Share2, Copy, Check, AlertTriangle, Zap, Search, Eye, Radio, Webhook, Globe, Loader2, RefreshCw } from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { Alert, CreateAlertRequest, AlertRuleType } from '../types/api.types';

export const AlertsView: React.FC = () => {
    const { alerts, history, loading, error, createAlert, deleteAlert, updateAlert, fetchHistory, fetchAlerts } = useAlerts();
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [importString, setImportString] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const [name, setName] = useState('New Sentinel Rule');
    const [conditionType, setConditionType] = useState<'status' | 'storage' | 'latency'>('status');
    const [conditionValue, setConditionValue] = useState('offline');
    const [targetType, setTargetType] = useState<'global' | 'specific'>('global');
    const [targetNodeId, setTargetNodeId] = useState('');
    const [channel, setChannel] = useState<'discord' | 'webhook' | 'email'>('discord');
    const [webhookUrl, setWebhookUrl] = useState('');

    const [snippetCopied, setSnippetCopied] = useState(false);

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedAlert(null);
        // Reset defaults
        setName('New Sentinel Rule');
        setConditionType('status');
        setConditionValue('offline');
        setTargetType('global');
        setTargetNodeId('');
        setChannel('discord');
        setWebhookUrl('');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Map UI state to API Alert structure
            let ruleType: AlertRuleType = 'node_status';
            if (conditionType === 'storage') ruleType = 'storage_threshold';
            if (conditionType === 'latency') ruleType = 'latency_spike';

            const conditions: Record<string, any> = {
                operator: conditionType === 'status' ? 'eq' : 'gt',
                value: conditionValue,
                target_type: targetType
            };
            if (targetType === 'specific' && targetNodeId) {
                conditions.node_id = targetNodeId;
            }

            const newAlert: CreateAlertRequest = {
                name,
                description: `Alert for ${conditionType} ${conditionValue}`,
                enabled: true,
                rule_type: ruleType,
                conditions,
                actions: [{
                    type: channel,
                    config: {
                        url: webhookUrl,
                        target: webhookUrl // Legacy support if needed
                    }
                }],
                cooldown_minutes: 15
            };

            await createAlert(newAlert);
            setIsCreating(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save alert');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (alert: Alert) => {
        try {
            await updateAlert(alert.id, {
                enabled: !alert.enabled
            });
        } catch (err) {
            console.error('Failed to toggle alert:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this alert?')) {
            await deleteAlert(id);
        }
    };

    const exportConfig = async (alertConfig: Alert) => {
        const config = JSON.stringify(alertConfig, null, 2);
        try {
            await navigator.clipboard.writeText(config);
            setSnippetCopied(true);
            setTimeout(() => setSnippetCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard write failed:', err);
            // Fallback or user notification
            window.alert('Clipboard access denied. Check console for config.');
            console.log(config);
        }
    };

    const handleImport = async () => {
        try {
            const rule = JSON.parse(importString);
            if (rule.name && rule.rule_type) {
                // If importing a full Alert object or request
                await createAlert(rule);
                setImportString('');
                setIsImporting(false);
            } else {
                alert("Invalid configuration JSON: Missing name or rule_type");
            }
        } catch (e) {
            alert("Invalid configuration JSON");
        }
    };

    return (
        <div className="h-full flex flex-col bg-root overflow-hidden animate-in fade-in duration-500">

            {/* Header */}
            <div className="p-6 md:p-8 border-b border-border-subtle bg-surface/50 backdrop-blur-sm flex justify-between items-center z-10">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center tracking-tight">
                        <Shield className="w-6 h-6 mr-3 text-primary" /> Sentinel Watchtower
                    </h1>
                    <p className="text-text-muted mt-1 text-sm">Configure automated monitoring and anomaly detection rules.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setShowHistory(!showHistory);
                            if (!showHistory) fetchHistory(50);
                        }}
                        className={`px-4 py-2 hover:bg-overlay-hover text-text-primary border border-border-subtle rounded-lg text-sm font-medium transition-colors flex items-center ${showHistory ? 'bg-surface border-primary text-primary' : 'bg-surface'}`}
                    >
                        <Bell size={16} className="mr-2" /> History
                    </button>
                    <button
                        onClick={() => setIsImporting(!isImporting)}
                        className="px-4 py-2 bg-surface hover:bg-overlay-hover text-text-primary border border-border-subtle rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                        <Share2 size={16} className="mr-2" /> Import
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="px-4 py-2 bg-gradient-primary hover:brightness-110 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center"
                    >
                        <Plus size={16} className="mr-2" /> New Sentinel
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Alert List */}
                <div className="w-full lg:w-1/3 border-r border-border-subtle bg-surface/30 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-2 mb-4">
                            <AlertTriangle size={18} />
                            <span className="text-sm font-medium">{error}</span>
                            <button onClick={fetchAlerts} className="ml-auto p-1 hover:bg-red-500/10 rounded"><RefreshCw size={14} /></button>
                        </div>
                    )}

                    {showHistory ? (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-text-muted uppercase mb-2">Recent Alert Events</h3>
                            {history.length === 0 && (
                                <div className="text-center py-8 text-text-muted text-sm">No alert history found.</div>
                            )}
                            {history.map((event, idx) => (
                                <div key={idx} className="bg-surface border border-border-subtle rounded-xl p-4 flex gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${event.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div>
                                        <div className="font-bold text-text-primary text-sm">{event.alert_name}</div>
                                        <div className="text-xs text-text-secondary mt-1">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </div>
                                        <div className="text-xs font-mono text-text-muted mt-1 bg-root/50 p-1 rounded">
                                            {JSON.stringify(event.triggered_by)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {isImporting && (
                                <div className="bg-elevated border border-border-subtle p-4 rounded-xl mb-4 animate-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Paste Configuration JSON</label>
                                    <textarea
                                        value={importString}
                                        onChange={(e) => setImportString(e.target.value)}
                                        className="w-full h-24 bg-root border border-border-subtle rounded-lg p-2 text-xs font-mono text-text-primary mb-3 focus:border-primary outline-none"
                                        placeholder="{ 'name': 'My Rule'... }"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsImporting(false)} className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5">Cancel</button>
                                        <button onClick={handleImport} className="text-xs bg-gradient-primary text-white px-3 py-1.5 rounded hover:brightness-110 transition-all">Import</button>
                                    </div>
                                </div>
                            )}

                            {loading && alerts.length === 0 ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                                </div>
                            ) : alerts.map(alert => (
                                <div key={alert.id} className="bg-surface border border-border-subtle rounded-xl p-5 hover:border-primary/50 transition-all shadow-sm group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${alert.enabled ? 'bg-secondary animate-pulse' : 'bg-text-muted'}`}></div>
                                            <h3 className="font-bold text-text-primary">{alert.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={alert.enabled}
                                                    onChange={() => toggleActive(alert)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs text-text-secondary">
                                        <div className="flex items-center">
                                            <AlertTriangle size={12} className="mr-2 opacity-70" />
                                            Condition: <span className="text-accent font-bold mx-1">{alert.rule_type}</span>
                                            {alert.conditions?.value && <span className="text-text-primary">({alert.conditions.operator || 'eq'} {alert.conditions.value})</span>}
                                        </div>
                                        <div className="flex items-center">
                                            <Zap size={12} className="mr-2 opacity-70" />
                                            Actions: <span className="text-text-primary font-bold ml-1 flex items-center gap-1">
                                                {alert.actions?.length || 0} configured
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface p-1 rounded-lg border border-border-subtle shadow-lg">
                                        <button onClick={() => exportConfig(alert)} className="p-1.5 hover:bg-overlay-hover rounded text-text-muted hover:text-primary" title="Share Config">
                                            {snippetCopied ? <Check size={14} /> : <Share2 size={14} />}
                                        </button>
                                        <button onClick={() => handleDelete(alert.id)} className="p-1.5 hover:bg-overlay-hover rounded text-text-muted hover:text-red-500" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {!loading && alerts.length === 0 && (
                                <div className="text-center py-10 text-text-muted">
                                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No sentinels active.</p>
                                    <button onClick={handleCreateNew} className="text-primary hover:underline text-sm mt-2">Create your first rule</button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right Panel: Builder */}
                <div className="w-full lg:w-2/3 bg-root p-6 lg:p-10 overflow-y-auto">
                    {isCreating ? (
                        <div className="max-w-2xl mx-auto space-y-8">

                            {/* Step 1: Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">1</div>
                                    <h2 className="text-lg font-bold text-text-primary">Sentinel Identity</h2>
                                </div>
                                <div className="pl-12">
                                    <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Rule Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary focus:border-primary outline-none transition-colors"
                                        placeholder="e.g. Production Cluster Health"
                                    />
                                </div>
                            </div>

                            {/* Step 2: Trigger */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">2</div>
                                    <h2 className="text-lg font-bold text-text-primary">Trigger Condition</h2>
                                </div>
                                <div className="pl-12 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Metric</label>
                                        <select
                                            value={conditionType}
                                            onChange={(e: any) => setConditionType(e.target.value)}
                                            className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary focus:border-primary outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="status">Node Status</option>
                                            <option value="storage">Storage Utilization</option>
                                            <option value="latency">Network Latency</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Threshold / State</label>
                                        {conditionType === 'status' ? (
                                            <select
                                                value={conditionValue}
                                                onChange={(e) => setConditionValue(e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary focus:border-primary outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="offline">Is Offline</option>
                                                <option value="delinquent">Is Delinquent</option>
                                                <option value="active">Is Active (Recovery)</option>
                                            </select>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={conditionValue}
                                                    onChange={(e) => setConditionValue(e.target.value)}
                                                    className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary focus:border-primary outline-none"
                                                />
                                                <span className="absolute right-3 top-3 text-text-muted text-sm">
                                                    {conditionType === 'latency' ? 'ms' : '%'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Scope */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">3</div>
                                    <h2 className="text-lg font-bold text-text-primary">Scope</h2>
                                </div>
                                <div className="pl-12 space-y-3">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTargetType('global')}
                                            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${targetType === 'global' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border-subtle text-text-muted hover:bg-overlay-hover'}`}
                                        >
                                            <Globe size={18} /> Any Node
                                        </button>
                                        <button
                                            onClick={() => setTargetType('specific')}
                                            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${targetType === 'specific' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border-subtle text-text-muted hover:bg-overlay-hover'}`}
                                        >
                                            <Search size={18} /> Specific Node
                                        </button>
                                    </div>

                                    {targetType === 'specific' && (
                                        <div className="relative animate-in slide-in-from-top-2">
                                            <Search className="absolute left-3 top-3 text-text-muted h-5 w-5" />
                                            <input
                                                type="text"
                                                value={targetNodeId}
                                                onChange={(e) => setTargetNodeId(e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary outline-none font-mono text-sm"
                                                placeholder="Search by Node ID / PubKey..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 4: Action */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">4</div>
                                    <h2 className="text-lg font-bold text-text-primary">Notification Action</h2>
                                </div>
                                <div className="pl-12 space-y-4">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setChannel('discord')}
                                            className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${channel === 'discord' ? 'bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2]' : 'bg-surface border-border-subtle text-text-muted opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center"><Webhook size={16} /></div>
                                            <span className="font-bold text-sm">Discord</span>
                                        </button>
                                        <button
                                            onClick={() => setChannel('webhook')}
                                            className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${channel === 'webhook' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border-subtle text-text-muted opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center"><Zap size={16} /></div>
                                            <span className="font-bold text-sm">Webhook</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-text-muted uppercase mb-2 block">
                                            {channel === 'discord' ? 'Discord Webhook URL' : 'Endpoint URL'}
                                        </label>
                                        <input
                                            type="text"
                                            value={webhookUrl}
                                            onChange={(e) => setWebhookUrl(e.target.value)}
                                            className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary focus:border-primary outline-none font-mono text-sm"
                                            placeholder="https://..."
                                        />
                                        {channel === 'discord' && (
                                            <p className="text-[10px] text-text-muted mt-2">
                                                Go to Server Settings → Integrations → Webhooks to generate a URL.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border-subtle flex justify-end gap-4">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-6 py-3 bg-transparent hover:bg-surface text-text-secondary rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!name || !webhookUrl || saving}
                                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center ${!name || !webhookUrl || saving ? 'bg-border-strong cursor-not-allowed' : 'bg-gradient-primary hover:brightness-110 shadow-primary/20'}`}
                                >
                                    {saving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} Save Sentinel
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="bg-surface p-6 rounded-full border border-border-strong mb-6">
                                <Eye size={48} className="text-text-muted" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary mb-2">Select or Create a Sentinel</h2>
                            <p className="max-w-md text-text-muted">
                                Configure automated alerts to monitor the Xandeum network 24/7. Get notified instantly via Discord when anomalies are detected.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};