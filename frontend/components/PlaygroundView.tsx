import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, Copy, Wifi, ChevronDown, CheckCircle, AlertCircle, Clock, FileJson, AlignLeft, List, Code, Check } from 'lucide-react';
import { apiService } from '../services/api';

interface MethodConfig {
  name: string;
  defaultParams: string;
}

const AVAILABLE_METHODS: MethodConfig[] = [
  { name: 'getClusterNodes', defaultParams: '[]' },
  { name: 'getNodeInfo', defaultParams: '[\n  "7xK2...nP9q"\n]' },
  { name: 'getHealth', defaultParams: '[]' },
  { name: 'getVersion', defaultParams: '[]' },
  { name: 'getBlockHeight', defaultParams: '[]' },
  { name: 'getEpochInfo', defaultParams: '[]' },
];

type ResponseTab = 'pretty' | 'raw' | 'headers';
type CodeLang = 'js-fetch' | 'js-axios' | 'python' | 'curl';

interface ApiResponse {
  data: any;
  error?: any;
  status: 'success' | 'error' | 'idle';
  statusCode?: number;
  duration?: number;
  headers?: Record<string, string>;
  size?: number;
}

export const PlaygroundView: React.FC = () => {
  const [endpoint, setEndpoint] = useState('https://api.xandeum.network');
  const [method, setMethod] = useState(AVAILABLE_METHODS[0].name);
  const [params, setParams] = useState(AVAILABLE_METHODS[0].defaultParams);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse>({ status: 'idle', data: null });
  const [activeTab, setActiveTab] = useState<ResponseTab>('pretty');

  const [snippetLang, setSnippetLang] = useState<CodeLang>('js-fetch');
  const [snippetCopied, setSnippetCopied] = useState(false);

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    const config = AVAILABLE_METHODS.find(m => m.name === newMethod);
    if (config) {
      setParams(config.defaultParams);
    }
  };

  const getRequestPreview = () => {
    try {
      const parsedParams = JSON.parse(params);
      return JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: parsedParams
      }, null, 2);
    } catch (e) {
      return JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: "Invalid JSON"
      }, null, 2);
    }
  };

  const generateSnippet = (lang: CodeLang) => {
    return "// Code generation logic...";
  };

  const handleCopySnippet = () => {
    const code = generateSnippet(snippetLang);
    navigator.clipboard.writeText(code);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };


  const sendRequest = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      let parsedParams: any[] = [];
      try {
        parsedParams = JSON.parse(params);
      } catch (e) {
        setResponse({
          status: 'error',
          data: { error: { code: -32700, message: "Parse error: Invalid JSON params" } },
          duration: 0,
          statusCode: 400
        });
        setLoading(false);
        return;
      }

      const res = await apiService.proxyRPC({
        method: method,
        params: parsedParams,
        id: 1 // Default ID
      });

      // Check for RPC error in 200 OK response
      if (res.error) {
        setResponse({
          status: 'error',
          data: res, // Show full JSON-RPC response including error
          duration: Date.now() - startTime,
          statusCode: 200
        });
      } else {
        setResponse({
          status: 'success',
          data: res,
          duration: Date.now() - startTime,
          statusCode: 200
        });
      }

    } catch (err: any) {
      setResponse({
        status: 'error',
        data: { error: err.message || "Network Error" },
        duration: Date.now() - startTime,
        statusCode: 500
      });
    } finally {
      setLoading(false);
    }
  };

  const renderJson = (json: any) => {
    if (!json) return null;
    const jsonStr = JSON.stringify(json, null, 2);
    return (
      <pre className="font-mono text-xs md:text-sm text-text-primary whitespace-pre-wrap break-all">
        {jsonStr}
      </pre>
    );
  };

  return (
    <div className="flex h-full text-text-primary font-sans flex-col md:flex-row bg-root">
      {/* LEFT PANEL - Request Builder */}
      <div className="w-full md:w-[40%] flex flex-col border-r border-border-subtle bg-surface">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">RPC Endpoint</label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wifi className="h-4 w-4 text-text-muted" />
                </div>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full bg-root border border-border-subtle rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Method</label>
            <div className="relative">
              <select
                value={method}
                onChange={(e) => handleMethodChange(e.target.value)}
                className="w-full bg-root border border-border-subtle rounded-lg pl-4 pr-10 py-2.5 text-sm text-text-primary appearance-none focus:border-primary outline-none cursor-pointer hover:bg-elevated transition-colors shadow-sm"
              >
                {AVAILABLE_METHODS.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex justify-between">
              <span>Parameters</span>
              <span className="text-text-muted font-mono lowercase">application/json</span>
            </label>
            <div className="flex-1 bg-root border border-border-subtle rounded-lg overflow-hidden flex flex-col focus-within:border-primary/50 transition-colors shadow-sm">
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                className="flex-1 w-full bg-transparent p-4 text-sm font-mono text-text-primary outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={sendRequest}
              disabled={loading}
              className={`w-full py-3 rounded-lg shadow-lg font-medium flex items-center justify-center space-x-2 transition-all ${loading
                ? 'bg-surface text-text-muted cursor-not-allowed'
                : 'bg-gradient-primary hover:brightness-110 text-white shadow-primary/20'
                }`}
            >
              <Play size={18} className="fill-current" />
              <span>Send Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Response Display */}
      <div className="w-full md:w-[60%] flex flex-col bg-elevated relative border-t md:border-t-0 md:border-l border-border-subtle h-[50vh] md:h-full transition-colors duration-300">
        <div className="h-14 border-b border-border-subtle flex items-center justify-between px-4 bg-surface/50 flex-shrink-0">
          <div className="flex space-x-1">
            <button className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'pretty' ? 'bg-surface text-primary border border-border-subtle' : 'text-text-muted hover:text-text-primary'}`}>Pretty</button>
          </div>
          {response.status !== 'idle' && (
            <div className="text-xs text-secondary flex items-center"><CheckCircle size={12} className="mr-1" /> Success</div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 bg-root custom-scrollbar">
          {response.status === 'idle' ? (
            <div className="text-center text-text-muted mt-20">Ready to send request</div>
          ) : (
            renderJson(response.data)
          )}
        </div>
      </div>
    </div>
  );
};