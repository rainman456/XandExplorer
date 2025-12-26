import React from 'react';
import { X, Save, RefreshCw, Server, Moon, Sun, Globe } from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleOverlayClick}
    >
      <div className="bg-elevated border border-border-strong rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-text-primary">
        <div className="flex justify-between items-center p-5 border-b border-border-subtle bg-surface/50">
          <h2 className="text-lg font-bold flex items-center">
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-surface rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
             <label className="text-sm font-semibold flex items-center">
                {settings.theme === 'dark' ? <Moon className="w-4 h-4 mr-2 text-primary" /> : <Sun className="w-4 h-4 mr-2 text-primary" />}
                Appearance
             </label>
             <div className="grid grid-cols-2 gap-2 bg-root p-1 rounded-lg border border-border-subtle">
                <button
                   onClick={() => onUpdateSettings({...settings, theme: 'light'})}
                   className={`flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${settings.theme === 'light' ? 'bg-surface text-primary shadow-sm ring-1 ring-border-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-overlay-hover'}`}
                >
                   <Sun size={16} className="mr-2" /> Light
                </button>
                <button
                   onClick={() => onUpdateSettings({...settings, theme: 'dark'})}
                   className={`flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${settings.theme === 'dark' ? 'bg-surface text-primary shadow-sm ring-1 ring-border-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-overlay-hover'}`}
                >
                   <Moon size={16} className="mr-2" /> Dark
                </button>
             </div>
          </div>

          {/* Network Selection */}
          <div className="space-y-3">
             <label className="text-sm font-semibold flex items-center">
                <Globe className="w-4 h-4 mr-2 text-primary" />
                Network
             </label>
             <div className="grid grid-cols-2 gap-2 bg-root p-1 rounded-lg border border-border-subtle">
                <button
                   onClick={() => onUpdateSettings({...settings, network: 'mainnet'})}
                   className={`flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${settings.network === 'mainnet' ? 'bg-surface text-secondary shadow-sm ring-1 ring-border-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-overlay-hover'}`}
                >
                   Mainnet
                </button>
                <button
                   onClick={() => onUpdateSettings({...settings, network: 'devnet'})}
                   className={`flex items-center justify-center py-2 rounded-md text-sm font-medium transition-all ${settings.network === 'devnet' ? 'bg-surface text-accent shadow-sm ring-1 ring-border-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-overlay-hover'}`}
                >
                   Devnet
                </button>
             </div>
          </div>

          {/* RPC Endpoint */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center">
              <Server className="w-4 h-4 mr-2 text-primary" />
              RPC Endpoint
            </label>
            <input 
              type="text" 
              value={settings.rpcEndpoint}
              onChange={(e) => onUpdateSettings({ ...settings, rpcEndpoint: e.target.value })}
              className="w-full bg-root border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono placeholder:text-text-muted"
              placeholder="https://api.xandeum.network"
            />
          </div>

          {/* Auto Refresh */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center">
              <RefreshCw className="w-4 h-4 mr-2 text-primary" />
              Data Refresh
            </label>
            
            <div className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border-subtle">
              <span className="text-sm">Auto-refresh data</span>
              <button 
                onClick={() => onUpdateSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                className={`w-11 h-6 flex items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.autoRefresh ? 'bg-primary' : 'bg-border-strong'}`}
              >
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border-subtle bg-surface/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-primary/20 flex items-center"
          >
            <Save size={16} className="mr-2" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};