import React, { useState } from 'react';
import { Play, Trash2, Save, Clock, AlertCircle, Terminal } from 'lucide-react';
import { executeRpcCall } from '../services/rpcService';
import { RpcResponse } from '../types';

const INITIAL_PARAMS = `[]`;

const EXAMPLE_METHODS = [
  { method: 'getClusterNodes', params: '[]' },
  { method: 'getEpochInfo', params: '[]' },
  { method: 'getBalance', params: '["XND...pubkey"]' },
  { method: 'getBlockHeight', params: '[]' },
];

export const RpcPlayground: React.FC = () => {
  const [endpoint, setEndpoint] = useState('https://rpc.xandeum.network/mock');
  const [method, setMethod] = useState('getClusterNodes');
  const [params, setParams] = useState(INITIAL_PARAMS);
  const [response, setResponse] = useState<RpcResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ method: string, timestamp: Date }[]>([]);

  const handleExecute = async () => {
    setIsLoading(true);
    setResponse(null);
    try {
      const res = await executeRpcCall(endpoint, method, params);
      setResponse(res);
      setHistory(prev => [{ method, timestamp: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (m: string, p: string) => {
    setMethod(m);
    setParams(p);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-root">
      {/* Input Panel */}
      <div className="flex-1 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border-strong">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">RPC Endpoint</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-surface border border-border-strong rounded-md px-4 py-2 text-text-primary focus:outline-none focus:border-secondary font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-muted mb-2">Method</label>
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-surface border border-border-strong rounded-md px-4 py-2 text-text-primary focus:outline-none focus:border-secondary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Examples</label>
              <select
                onChange={(e) => {
                  const example = EXAMPLE_METHODS.find(m => m.method === e.target.value);
                  if (example) loadExample(example.method, example.params);
                }}
                className="w-full bg-surface border border-border-strong rounded-md px-4 py-2 text-text-secondary focus:outline-none focus:border-secondary text-sm"
                value={method}
              >
                <option disabled value="">Select method...</option>
                {EXAMPLE_METHODS.map(m => (
                  <option key={m.method} value={m.method}>{m.method}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Params (JSON Array)</label>
            <div className="relative">
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                className="w-full h-40 bg-surface border border-border-strong rounded-md p-4 text-text-primary focus:outline-none focus:border-secondary font-mono text-sm resize-none"
                spellCheck={false}
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={() => setParams('[]')}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-elevated rounded transition-colors"
                  title="Clear Params"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className={`w-full py-2 rounded-md font-bold transition-all flex items-center justify-center ${isLoading
                  ? 'bg-elevated text-text-muted cursor-not-allowed'
                  : 'bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Send Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div className="flex-1 bg-surface p-6 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Response</h3>
          {history.length > 0 && (
            <div className="flex gap-2">
              <span className="text-xs text-text-muted flex items-center">
                <Clock size={12} className="mr-1" /> {history.length} calls
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 bg-root rounded-lg border border-border-subtle overflow-hidden relative">
          {response ? (
            <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
              <pre className="font-mono text-sm text-text-primary whitespace-pre-wrap break-all">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
              <div className="text-center">
                <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                <p>Execute an RPC call to see the results here</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-sm">
                  <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center">
                    Try:
                  </h4>
                  {['get_version', 'get_network_stats', 'get_nodes'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className="text-xs bg-elevated border border-border-subtle text-text-muted px-2 py-1 rounded hover:border-secondary/50 hover:text-secondary transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Mini-Panel */}
        {history.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center">
              <Clock size={12} className="mr-1.5" />
              Recent Calls
            </h4>
            <div className="flex flex-wrap gap-2">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  className="text-xs bg-elevated border border-border-subtle text-text-muted px-2 py-1 rounded hover:border-secondary/50 hover:text-secondary transition-colors"
                  onClick={() => setMethod(item.method)}
                >
                  {item.method}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};