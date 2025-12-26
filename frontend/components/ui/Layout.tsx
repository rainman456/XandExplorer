import React from 'react';
import { LayoutDashboard, Globe, Terminal, Network, Settings, Menu, X, List, History, ChevronRight, Coins, Bell, Calculator, Share2 } from 'lucide-react';
import { ViewMode } from '../../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenSettings: () => void;
  network?: 'mainnet' | 'devnet';
  lastUpdated?: Date | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onOpenSettings, network = 'mainnet', lastUpdated }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (view: ViewMode) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  const isFixedView = currentView === ViewMode.EXPLORER_3D || currentView === ViewMode.PLAYGROUND;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-root text-text-primary">

      {/* Top Navbar */}
      <header className="h-18 flex-shrink-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border-subtle shadow-sm relative sticky top-0">
        <div className="h-full px-4 lg:px-8 flex items-center justify-between">

          {/* Logo Section */}
          <div className="flex items-center gap-4 min-w-max group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-soft to-surface flex items-center justify-center border border-primary/20 shadow-[0_0_20px_var(--color-primary-soft)] transition-transform group-hover:scale-105">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-text-primary block leading-none">
                XANDEUM
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                Explorer
              </span>
            </div>
          </div>

          {/* Center Navigation - Desktop */}
          <nav className="hidden lg:flex flex-1 items-center justify-center px-8 gap-1 overflow-x-auto custom-scrollbar">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" isActive={currentView === ViewMode.DASHBOARD} onClick={() => handleNavClick(ViewMode.DASHBOARD)} />
            <NavItem icon={<List size={18} />} label="Nodes" isActive={currentView === ViewMode.NODES_LIST} onClick={() => handleNavClick(ViewMode.NODES_LIST)} />
            <NavItem icon={<Globe size={18} />} label="Topology" isActive={currentView === ViewMode.EXPLORER_3D} onClick={() => handleNavClick(ViewMode.EXPLORER_3D)} />
            <NavItem icon={<Bell size={18} />} label="Alerts" isActive={currentView === ViewMode.ALERTS} onClick={() => handleNavClick(ViewMode.ALERTS)} />
            <NavItem icon={<Calculator size={18} />} label="Calculator" isActive={currentView === ViewMode.STORAGE_PLANNER} onClick={() => handleNavClick(ViewMode.STORAGE_PLANNER)} />
            <NavItem icon={<History size={18} />} label="Analytics" isActive={currentView === ViewMode.HISTORICAL_ANALYSIS} onClick={() => handleNavClick(ViewMode.HISTORICAL_ANALYSIS)} />
            <NavItem icon={<Coins size={18} />} label="$XAND" isActive={currentView === ViewMode.PURCHASE} onClick={() => handleNavClick(ViewMode.PURCHASE)} />
            <div className="w-px h-6 bg-border-subtle mx-2"></div>
            <NavItem icon={<Terminal size={18} />} label="Playground" isActive={currentView === ViewMode.PLAYGROUND} onClick={() => handleNavClick(ViewMode.PLAYGROUND)} />
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="hidden md:flex items-center space-x-4 text-xs font-mono text-text-secondary bg-surface/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border-subtle shadow-inner">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${network === 'mainnet' ? 'bg-secondary text-secondary' : 'bg-accent text-accent'} animate-pulse`}></span>
                <span className="font-bold tracking-wide">{network === 'mainnet' ? 'MAINNET' : 'DEVNET'}</span>
              </span>
              {lastUpdated && (
                <>
                  <span className="w-px h-3 bg-border-subtle"></span>
                  <span title={lastUpdated.toLocaleString()}>
                    Updated {new Date().getTime() - lastUpdated.getTime() < 60000
                      ? 'just now'
                      : `${Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)}m ago`}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={onOpenSettings}
              className="p-2 text-text-secondary hover:text-primary bg-overlay-hover hover:bg-overlay-active rounded-lg transition-all border border-transparent hover:border-overlay-active"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 bg-surface rounded-lg text-text-secondary shadow-sm border border-border-subtle"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">

        {/* Mobile Sidebar Overlay (Keeping strict type checks happy by mostly keeping original structure logic) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col border-r border-border-subtle">
              <div className="h-16 flex items-center justify-between px-6 border-b border-border-subtle">
                <div className="flex items-center">
                  <Network className="w-6 h-6 text-primary" />
                  <span className="ml-3 font-bold text-lg text-text-primary">XANDEUM</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-text-secondary">
                  <X size={20} />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                <MobileNavItem icon={<LayoutDashboard size={20} />} label="Dashboard" isActive={currentView === ViewMode.DASHBOARD} onClick={() => handleNavClick(ViewMode.DASHBOARD)} />
                <MobileNavItem icon={<List size={20} />} label="pNodes List" isActive={currentView === ViewMode.NODES_LIST} onClick={() => handleNavClick(ViewMode.NODES_LIST)} />
                <MobileNavItem icon={<Globe size={20} />} label="Earth View" isActive={currentView === ViewMode.EXPLORER_3D} onClick={() => handleNavClick(ViewMode.EXPLORER_3D)} />
                <MobileNavItem icon={<Bell size={20} />} label="Sentinel Alerts" isActive={currentView === ViewMode.ALERTS} onClick={() => handleNavClick(ViewMode.ALERTS)} />
                <MobileNavItem icon={<Calculator size={20} />} label="Storage Planner" isActive={currentView === ViewMode.STORAGE_PLANNER} onClick={() => handleNavClick(ViewMode.STORAGE_PLANNER)} />
                <MobileNavItem icon={<History size={20} />} label="Historical Analysis" isActive={currentView === ViewMode.HISTORICAL_ANALYSIS} onClick={() => handleNavClick(ViewMode.HISTORICAL_ANALYSIS)} />
                <MobileNavItem icon={<Coins size={20} />} label="Get $XAND" isActive={currentView === ViewMode.PURCHASE} onClick={() => handleNavClick(ViewMode.PURCHASE)} />
                <div className="my-2 border-t border-border-subtle"></div>
                <MobileNavItem icon={<Terminal size={20} />} label="RPC Playground" isActive={currentView === ViewMode.PLAYGROUND} onClick={() => handleNavClick(ViewMode.PLAYGROUND)} />
              </nav>
            </div>
          </div>
        )}

        <div className="w-full h-full overflow-auto custom-scrollbar bg-root relative flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};

// Top Navbar Item
const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 group relative overflow-hidden ${isActive
        ? 'text-primary bg-primary-soft/30'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
    >
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>
      )}
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`ml-2.5 font-medium text-xs tracking-wide transition-colors ${isActive ? 'font-bold' : ''}`}>{label}</span>
    </button>
  );
};

// Mobile Sidebar Item (Vertical)
const MobileNavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
        ? 'text-white bg-[image:var(--gradient-primary)] shadow-lg shadow-primary/20'
        : 'text-text-secondary hover:bg-overlay-hover hover:text-text-primary'
        }`}
    >
      <div className={`transition-transform duration-200 relative z-10 ${isActive ? 'text-white' : 'group-hover:text-primary'}`}>
        {icon}
      </div>
      <span className="ml-3 font-medium text-sm tracking-wide relative z-10">{label}</span>
    </button>
  );
};
