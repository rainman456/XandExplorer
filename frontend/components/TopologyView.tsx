import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Instance, Instances, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PNode } from '../types/node.types';
import * as d3 from 'd3-force';
import { Share2, Zap, Activity, Info, RefreshCw, Layers } from 'lucide-react';
import { useTopology } from '../hooks/useTopology';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      color: any;
      group: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      lineSegments: any;
      bufferGeometry: any;
      lineBasicMaterial: any;
    }
  }
}

interface TopologyViewProps {
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  selectedNodeId?: string | null;
}

// --- Constants & Utils ---

const COLOR_ACTIVE = '#008E7C'; // Secondary
const COLOR_WARN = '#FE8300';   // Accent
const COLOR_ERROR = '#ef4444';  // Red
const COLOR_LINE = '#933481';   // Primary

const getNodeColor = (status: string) => {
  switch (status) {
    case 'active': return COLOR_ACTIVE;
    case 'delinquent': return COLOR_WARN;
    case 'offline': return COLOR_ERROR;
    default: return '#6E6E7E';
  }
};

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  pNode: PNode;
  color: string;
  size: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string | number;
  target: GraphNode | string | number;
  strength: number; // 0 to 1, visual thickness
}

// --- Components ---

const GraphScene: React.FC<{ nodes?: PNode[]; onNodeClick?: (n: PNode) => void }> = ({ nodes: propNodes, onNodeClick }) => { // propNodes unused if we rely solely on topology API, but maybe good to keep as fallback or if passed from outside
  const { topology, loading } = useTopology();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Hover state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Initialize Graph Data
  useEffect(() => {
    if (!topology) return;

    // 1. Prepare Nodes from Topology API
    // Topology API returns nodes with ID, region, etc. We map them to visuals.
    const simNodes: GraphNode[] = topology.nodes.map(n => ({
      id: n.id,
      pNode: { // Mock PNode structure from TopologyNode since PNode is the main frontend type
        id: n.id,
        pubkey: n.id,
        status: n.status === 'active' ? 'active' : 'offline', // Simplified mapping
        address: n.address, // Corrected from n.ip
        city: n.city, // Corrected from n.region
        country: n.country, // Corrected from n.region
        lat: n.lat,
        lon: n.lon,
        latitude: n.lat,
        longitude: n.lon,
        version: n.version,
        total_storage_tb: 0, // Not in TopologyNode
        storage_capacity: 0,
        uptime_percentage: 100,
        last_seen: new Date().toISOString(),
        // Default values for required PNode fields missing in TopologyNode
        ip: n.address,
        port: 0,
        is_online: n.status === 'active',
        is_public: true,
        first_seen: new Date().toISOString(),
        cpu_percent: 0,
        ram_used: 0,
        ram_total: 0,
        storage_used: 0,
        storage_usage_percent: 0,
        uptime_seconds: 0,
        packets_received: 0,
        packets_sent: 0,
        uptime_score: 0,
        performance_score: 0,
        response_time: 0,
        credits: 0,
        credits_rank: 0,
        credits_change: 0,
        total_stake: 0,
        commission: 0,
        apy: 0,
        boost_factor: 1,
        version_status: 'unknown',
        is_upgrade_needed: false,
        upgrade_severity: 'none',
        upgrade_message: '',
        addresses: [{ address: n.address, ip: n.address, port: 0, type: 'p2p', is_public: true, last_seen: new Date().toISOString(), is_working: true }]
      } as PNode,
      color: getNodeColor(n.status),
      size: 0.5 + (Math.random() * 0.5), // Random size since storage info missing in topology node
      x: (Math.random() - 0.5) * 50,
      y: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 50,
    }));

    // 2. Prepare Links from Topology API
    const simLinks: GraphLink[] = topology.edges.map(e => ({
      source: e.source,
      target: e.target,
      strength: 0.5 // Uniform strength for now
    }));

    setGraphData({ nodes: simNodes, links: simLinks });

    // 3. Setup Simulation
    simulationRef.current = d3.forceSimulation<GraphNode, GraphLink>(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(simLinks).id((d: any) => d.id).distance(15)) // Increased distance for clarity
      .force('charge', d3.forceManyBody().strength(-30))
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius((d: any) => (d as GraphNode).size * 2))
      .stop();

    for (let i = 0; i < 300; i++) simulationRef.current.tick(); // Pre-warm

  }, [topology]);

  useFrame(() => {
    if (simulationRef.current) {
      simulationRef.current.tick();
    }
  });

  if (loading) return null; // Or visual loader

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      <Instances range={graphData.nodes.length}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial toneMapped={false} />
        {graphData.nodes.map((node, i) => (
          <NodeInstance
            key={node.id}
            node={node}
            onClick={() => onNodeClick?.(node.pNode)}
            onHover={setHoveredNode}
          />
        ))}
      </Instances>

      {/* Edges */}
      <LinesInstance links={graphData.links} />

      {/* Hover Label */}
      {hoveredNode && (
        <Html position={[hoveredNode.x || 0, (hoveredNode.y || 0) + 2, hoveredNode.z || 0]} center zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none min-w-[120px]">
            <div className="bg-elevated/90 backdrop-blur-md border border-border-strong p-2 rounded-lg text-left shadow-2xl animate-in zoom-in-95 duration-100">
              <p className="text-xs font-bold text-primary mb-1 flex justify-between items-center">
                {hoveredNode.pNode.pubkey.substring(0, 6)}...
              </p>
              <div className="text-[10px] text-text-secondary capitalize">
                Status: <span style={{ color: hoveredNode.color }}>{hoveredNode.pNode.status}</span>
              </div>
              <div className="text-[10px] text-text-muted">
                Region: {hoveredNode.pNode.city}
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Optimized Node Instance
const NodeInstance: React.FC<{ node: GraphNode, onClick: () => void, onHover: (n: GraphNode | null) => void }> = ({ node, onClick, onHover }) => {
  const ref = useRef<any>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(node.x || 0, node.y || 0, node.z || 0);
    }
  });

  return (
    <Instance
      ref={ref}
      color={node.color}
      scale={node.size}
      onClick={(e: any) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e: any) => { e.stopPropagation(); onHover(node); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
    />
  );
};

// Optimized Lines Renderer using BufferGeometry
const LinesInstance = ({ links }: { links: GraphLink[], nodes?: GraphNode[] }) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // Prepare indices or positions
  useFrame(() => {
    if (geometryRef.current) {
      const positions = new Float32Array(links.length * 6); // 2 points * 3 coords

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        // d3-force replaces source/target string ids with actual object references after initialization
        const source = link.source as GraphNode;
        const target = link.target as GraphNode;

        if (source.x !== undefined && source.y !== undefined && target.x !== undefined && target.y !== undefined) {
          const i6 = i * 6;
          positions[i6] = source.x;
          positions[i6 + 1] = source.y;
          positions[i6 + 2] = (source.z || 0);

          positions[i6 + 3] = target.x;
          positions[i6 + 4] = target.y;
          positions[i6 + 5] = (target.z || 0);
        }
      }
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial color={COLOR_LINE} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
};


export const TopologyView: React.FC<TopologyViewProps> = ({ nodes, onNodeClick }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full bg-root relative overflow-hidden transition-colors duration-300">
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={[isDark ? '#050507' : '#FAFAFC']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[20, 20, 20]} intensity={1} />

        <OrbitControls enableDamping dampingFactor={0.1} rotateSpeed={0.5} />

        <GraphScene nodes={nodes} onNodeClick={onNodeClick} />

        {/* Effects */}
        {isDark && <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />}
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-elevated/80 backdrop-blur-md border border-border-subtle rounded-xl p-4 shadow-xl w-72 animate-in slide-in-from-left">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center">
            <Share2 className="w-3 h-3 mr-2 text-primary" /> Gossip Topology
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-4">
            Visualizing real-time P2P gossip propagation. Nodes cluster by geographic latency zones. Lines indicate active gossip channels.
          </p>

          <div className="space-y-2">
            <div className="flex items-center text-[10px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#008E7C] mr-2"></span>
              <span>Healthy Node</span>
              <span className="ml-auto font-mono">{nodes.filter(n => n.status === 'active').length}</span>
            </div>
            <div className="flex items-center text-[10px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#FE8300] mr-2"></span>
              <span>High Latency / Warn</span>
              <span className="ml-auto font-mono">{nodes.filter(n => n.status === 'delinquent').length}</span>
            </div>
            <div className="flex items-center text-[10px] text-text-muted">
              <div className="w-8 h-[1px] bg-primary/50 mr-2"></div>
              <span>Gossip Link</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-elevated/80 backdrop-blur border border-border-subtle rounded-lg px-4 py-2 flex items-center gap-2">
          <Activity size={14} className="text-primary animate-pulse" />
          <span className="text-xs font-mono text-primary">SIMULATION_ACTIVE</span>
        </div>
      </div>

    </div>
  );
};