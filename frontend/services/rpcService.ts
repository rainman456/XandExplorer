
import { PNode } from '../types/node.types';

// Configuration
let RPC_ENDPOINT = 'https://api.xandeum.network';

export const setRpcEndpoint = (endpoint: string) => {
  RPC_ENDPOINT = endpoint;
};

export const getRpcEndpoint = () => RPC_ENDPOINT;

// Helper to get random coordinate within a radius of a center point
const getRandomCoord = (center: number, spread: number) => {
  return center + (Math.random() - 0.5) * spread;
};

// Region center points (Lat, Long)
const REGION_COORDS: Record<string, { lat: number, lon: number, country: string, cities: string[] }> = {
  'US-East': { lat: 38.0, lon: -78.0, country: 'United States', cities: ['Ashburn', 'Reston', 'Virginia Beach'] },
  'US-West': { lat: 37.0, lon: -120.0, country: 'United States', cities: ['San Jose', 'Los Angeles', 'Seattle'] },
  'EU-Central': { lat: 50.0, lon: 10.0, country: 'Germany', cities: ['Frankfurt', 'Berlin', 'Munich'] },
  'EU-West': { lat: 48.0, lon: 2.0, country: 'France', cities: ['Paris', 'Marseille'] },
  'Asia-Pacific': { lat: 35.0, lon: 139.0, country: 'Japan', cities: ['Tokyo', 'Osaka'] },
  'SA-East': { lat: -23.5, lon: -46.6, country: 'Brazil', cities: ['Sao Paulo', 'Rio de Janeiro'] },
  'SG-South': { lat: 1.35, lon: 103.8, country: 'Singapore', cities: ['Singapore'] },
};

// Helper to generate mock data for Step 1
const generateMockNodes = (count: number, network: 'mainnet' | 'devnet' = 'mainnet'): PNode[] => {
  const regions = Object.keys(REGION_COORDS);
  const isDev = network === 'devnet';

  return Array.from({ length: count }).map((_, i) => {
    const regionKey = regions[Math.floor(Math.random() * regions.length)];
    const regionData = REGION_COORDS[regionKey];
    const city = regionData.cities[Math.floor(Math.random() * regionData.cities.length)];

    // Devnet has smaller storage and slightly different characteristics
    const storageOptions = isDev ? [1, 2, 5, 10] : [10, 20, 50, 100, 250, 500];
    const totalStorage = storageOptions[Math.floor(Math.random() * storageOptions.length)];
    const usedStorage = totalStorage * (isDev ? 0.1 + Math.random() * 0.3 : 0.3 + Math.random() * 0.5);

    const prefix = isDev ? 'DEV' : 'XND';
    const version = isDev ? '1.5.0-beta' : '1.4.18';

    // Generate realistic looking resource usage
    const cpuUsage = 15 + Math.random() * 60; // 15% to 75%
    const ramUsage = 30 + Math.random() * 50; // 30% to 80%

    // 80% chance of being registered on mainnet, 50% on devnet
    const isRegistered = Math.random() < (isDev ? 0.5 : 0.8);

    const pubkey = `${prefix}${Math.random().toString(36).substring(2, 10).toUpperCase()}...${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ip = `10.0.${Math.floor(i / 256)}.${i % 256}`;

    return {
      // Required PNode fields
      id: pubkey, // Using pubkey as ID for mock
      pubkey: pubkey,
      ip: ip,
      port: 8899,
      address: ip, // Using IP as address for mock
      version: version,
      is_online: true,
      is_public: true,
      last_seen: new Date().toISOString(),
      first_seen: new Date(Date.now() - 10000000).toISOString(),
      status: Math.random() > 0.95 ? 'offline' : (Math.random() > 0.85 ? 'delinquent' : 'active'),
      country: regionData.country,
      city: city,
      lat: getRandomCoord(regionData.lat, 10),
      lon: getRandomCoord(regionData.lon, 10),
      cpu_percent: parseFloat(cpuUsage.toFixed(1)),
      ram_used: parseFloat((totalStorage * 0.1).toFixed(2)), // Mock RAM usage
      ram_total: 128, // Mock RAM total
      storage_capacity: totalStorage * 1024 * 1024 * 1024 * 1024, // Converter TB to bytes
      storage_used: parseFloat(usedStorage.toFixed(2)) * 1024 * 1024 * 1024 * 1024, // Convert TB to bytes
      storage_usage_percent: (usedStorage / totalStorage) * 100,
      uptime_seconds: 100000 + Math.random() * 50000,
      packets_received: Math.floor(Math.random() * 1000000),
      packets_sent: Math.floor(Math.random() * 1000000),
      uptime_score: 98 + Math.random() * 2,
      performance_score: 80 + Math.random() * 20,
      response_time: Math.floor(Math.random() * (isDev ? 300 : 150)) + 5,
      credits: Math.floor(Math.random() * 1000),
      credits_rank: i + 1,
      credits_change: Math.floor(Math.random() * 10),
      total_stake: Math.floor(Math.random() * 100000),
      commission: 5,
      apy: 7.5,
      boost_factor: 1.0,
      version_status: 'current',
      is_upgrade_needed: false,
      upgrade_severity: 'none',
      upgrade_message: '',

      // Legacy/Optional fields
      ip_address: ip,
      gossip_port: 8000 + (i % 100),
      rpc_port: 8899,
      is_registered: isRegistered,
      total_storage_tb: totalStorage,
      used_storage_tb: parseFloat(usedStorage.toFixed(2)),
      uptime_percent: 98 + Math.random() * 2,
      cpu_usage_percent: parseFloat(cpuUsage.toFixed(1)),
      ram_usage_percent: parseFloat(ramUsage.toFixed(1)),
      last_seen_ts: Date.now(),
      latency_ms: Math.floor(Math.random() * (isDev ? 300 : 150)) + 5,
      geo_info: {
        region: regionKey,
        country: regionData.country,
        city: city,
        latitude: getRandomCoord(regionData.lat, 10),
        longitude: getRandomCoord(regionData.lon, 10)
      },
      addresses: [{
        address: ip,
        ip: ip,
        port: 8899,
        type: 'p2p',
        is_public: true,
        last_seen: new Date().toISOString(),
        is_working: true
      }]
    };
  });
};

// Function to make JSON-RPC calls
export async function makeRPCCall(method: string, params: any[] = []): Promise<any> {
  // Mock Implementation for development
  // In a real scenario, this would fetch(RPC_ENDPOINT, { ... })

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 600));

  console.log(`[RPC] Calling method: ${method} on ${RPC_ENDPOINT}`, params);

  // Extract network from params if passed as a special last argument (internal hack for mock service)
  let network: 'mainnet' | 'devnet' = 'mainnet';
  const cleanParams = [...params];
  if (cleanParams.length > 0 && typeof cleanParams[cleanParams.length - 1] === 'object' && cleanParams[cleanParams.length - 1]._network) {
    network = cleanParams.pop()._network;
  }

  // Mock responses based on method
  if (method === 'getClusterNodes') {
    return generateMockNodes(network === 'devnet' ? 24 : 64, network);
  }

  if (method === 'getNodeInfo') {
    const nodes = generateMockNodes(1, network);
    nodes[0].pubkey = params[0] || nodes[0].pubkey;
    return nodes[0];
  }

  return { result: 'ok' };
}

// Function to get all nodes
export async function getAllNodes(network: 'mainnet' | 'devnet' = 'mainnet'): Promise<PNode[]> {
  // Pass network as a hidden param for the mock service
  const result = await makeRPCCall('getClusterNodes', [{ _network: network }]);
  return result as PNode[];
}

// Function to get specific node info
export async function getNodeInfo(nodeId: string): Promise<PNode | undefined> {
  const result = await makeRPCCall('getNodeInfo', [nodeId]);
  return result as PNode;
}

// Legacy exports to prevent crashes in unused components (will be refactored in future steps)
export const fetchNodesMock = async (): Promise<any[]> => { return []; }

// Updated to support RpcPlayground usage
export const executeRpcCall = async (endpoint: string, method: string, params: string): Promise<any> => {
  let parsedParams: any[] = [];
  try {
    parsedParams = JSON.parse(params);
  } catch (e) {
    console.warn("Invalid JSON params in executeRpcCall");
  }

  const result = await makeRPCCall(method, parsedParams);

  return {
    jsonrpc: "2.0",
    result: result,
    id: Date.now()
  };
}
