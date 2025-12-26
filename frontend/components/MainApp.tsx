"use client";

import React, { useState, useEffect } from 'react';
import { useNodes } from '../hooks/useNodes';
import { apiService } from '../services/api';
import { EarthView } from './EarthView';
import { NodeDetailPanel } from './NodeDetailPanel';
import { NodeDetailView } from './NodeDetailView'; // Import the new View
import { PlaygroundView } from './PlaygroundView';
import { Dashboard } from './Dashboard';
import { NodesListView } from './NodesListView';
import { HistoricalAnalysis } from './HistoricalAnalysis';
import { PurchaseView } from './PurchaseView'; // Import PurchaseView
import { AlertsView } from './AlertsView'; // Import AlertsView
import { StoragePlannerView } from './StoragePlannerView'; // Import StoragePlannerView
import { Layout } from './ui/Layout';
import { SettingsModal } from './ui/SettingsModal';
import { Network, RefreshCw, Loader2 } from 'lucide-react';
import { PNode } from '../types/node.types';
import { ViewMode, AppSettings } from '../types';

function App() {
  // Global Settings
  const [settings, setSettings] = useState<AppSettings>({
    rpcEndpoint: 'https://api.xandeum.network',
    autoRefresh: true,
    refreshInterval: 30000,
    show3DOnMobile: false,
    theme: 'light', // Default theme
    network: 'mainnet' // Default network
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Data Fetching - Paginated for list view
  const { nodes, loading, error, refetch, lastUpdated, pagination, setPage, page } = useNodes(settings);

  // Fetch ALL nodes for Dashboard and EarthView (not paginated)
  const [allNodes, setAllNodes] = React.useState<PNode[]>([]);
  const [allNodesLoading, setAllNodesLoading] = React.useState(true);

  const fetchAllNodes = React.useCallback(async () => {
    try {
      setAllNodesLoading(true);
      const response = await apiService.getNodes({ page: 1, limit: 1000 }); // Fetch all nodes
      setAllNodes(response.nodes);
    } catch (err) {
      console.error('Error fetching all nodes:', err);
    } finally {
      setAllNodesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAllNodes();
    let intervalId: any;
    if (settings?.autoRefresh) {
      intervalId = setInterval(fetchAllNodes, settings.refreshInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchAllNodes, settings?.autoRefresh, settings?.refreshInterval]);

  // UI State
  const [selectedNode, setSelectedNode] = useState<PNode | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.EXPLORER_3D);
  const [isRefetching, setIsRefetching] = useState(false);

  // Handle Manual Refresh with animation state
  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setTimeout(() => setIsRefetching(false), 500);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'Escape':
          setSelectedNode(null);
          setIsSettingsOpen(false);
          break;
        case 'r':
        case 'R':
          handleRefresh();
          break;
        case '1':
          setCurrentView(ViewMode.DASHBOARD);
          break;
        case '2':
          setCurrentView(ViewMode.NODES_LIST);
          break;
        case '3':
          setCurrentView(ViewMode.EXPLORER_3D);
          break;
        case '4':
          setCurrentView(ViewMode.ALERTS);
          break;
        case '5':
          setCurrentView(ViewMode.HISTORICAL_ANALYSIS);
          break;
        case '6':
          setCurrentView(ViewMode.PLAYGROUND);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  const handleNodeClick = (node: PNode) => {
    setSelectedNode(node);
  };

  const renderContent = () => {
    // If a node is selected, show the Detail Page immediately (acting as a sub-route)
    if (selectedNode) {
      // Exception: If in Earth View, we might want to keep context.
      if (currentView !== ViewMode.EXPLORER_3D) {
        return <NodeDetailView node={selectedNode} onBack={() => setSelectedNode(null)} />;
      }
    }

    if (currentView === ViewMode.PLAYGROUND) {
      return <PlaygroundView />;
    }

    if (currentView === ViewMode.DASHBOARD) {
      return <Dashboard nodes={allNodes} onNodeClick={handleNodeClick} onNavigateToNodes={() => setCurrentView(ViewMode.NODES_LIST)} />;
    }

    if (currentView === ViewMode.NODES_LIST) {
      return (
        <NodesListView
          nodes={nodes}
          onNodeClick={handleNodeClick}
          pagination={pagination}
          currentPage={page}
          onPageChange={setPage}
        />
      );
    }

    if (currentView === ViewMode.HISTORICAL_ANALYSIS) {
      return <HistoricalAnalysis nodes={nodes} />;
    }

    if (currentView === ViewMode.PURCHASE) {
      return <PurchaseView />;
    }

    if (currentView === ViewMode.ALERTS) {
      return <AlertsView />;
    }

    if (currentView === ViewMode.STORAGE_PLANNER) {
      return <StoragePlannerView />;
    }

    // EARTH VIEW LOGIC 

    // Loading State (only on initial load)
    if (loading && nodes.length === 0) {
      return (
        <div className="h-full w-full bg-root flex flex-col items-center justify-center text-text-primary transition-colors duration-500">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-primary font-mono text-sm tracking-widest animate-pulse">INITIALIZING EARTH VIEW...</p>
        </div>
      );
    }

    // Error State
    if (error) {
      return (
        <div className="h-full w-full bg-root flex flex-col items-center justify-center text-text-primary p-6 transition-colors duration-500">
          <div className="max-w-md w-full bg-surface backdrop-blur border border-red-500/30 rounded-xl p-8 text-center shadow-2xl">
            <div className="inline-flex p-3 rounded-full bg-red-500/10 mb-4 text-red-500">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Connection Failed</h3>
            <p className="text-red-600 dark:text-red-400/80 text-sm mb-6">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-red-500/20 flex items-center justify-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full overflow-hidden bg-root relative transition-colors duration-500">
        <EarthView
          nodes={allNodes}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.pubkey}
          lastUpdated={lastUpdated}
          refetch={fetchAllNodes}
          isRefetching={allNodesLoading}
        />

        {/* We keep the Sidebar Panel ONLY for Earth View context preservation */}
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          allNodes={nodes} // Pass all nodes to calculate gossip peers
        />
      </div>
    );

  };

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      onOpenSettings={() => setIsSettingsOpen(true)}
      network={settings.network}
      lastUpdated={lastUpdated}
    >
      {renderContent()}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </Layout>
  );
}

export default App;
