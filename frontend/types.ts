

export interface PNode {
  id: string;
  name: string;
  pubkey: string;
  ip: string;
  version: string;
  status: 'active' | 'inactive' | 'syncing';
  storage_capacity_gb: number;
  storage_used_gb: number;
  uptime_percentage: number;
  latency_ms: number;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  location_region: string;
}

export interface RpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string | null;
}

export interface RpcRequest {
  method: string;
  params?: any;
  id?: number | string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  EXPLORER_3D = 'EXPLORER_3D',
  PLAYGROUND = 'PLAYGROUND',
  NODES_LIST = 'NODES_LIST',
  HISTORICAL_ANALYSIS = 'HISTORICAL_ANALYSIS',
  PURCHASE = 'PURCHASE',
  ALERTS = 'ALERTS',
  STORAGE_PLANNER = 'STORAGE_PLANNER',
}

export interface AppSettings {
  rpcEndpoint: string;
  autoRefresh: boolean;
  refreshInterval: number; // in ms
  show3DOnMobile: boolean;
  theme: 'dark' | 'light';
  network: 'mainnet' | 'devnet';
}
