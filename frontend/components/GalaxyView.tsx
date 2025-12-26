import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Billboard, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { PNode } from '../types/node.types';
import { RefreshCw, Activity, Database, Clock, List, Globe } from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      color: any;
      group: any;
      mesh: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      ringGeometry: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhongMaterial: any;
    }
  }
}

interface GalaxyViewProps {
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  selectedNodeId?: string | null;
  lastUpdated?: Date | null;
  refetch?: () => void;
  isRefetching?: boolean;
}

// Constants
const EARTH_RADIUS = 15;

// Helper to determine node color based on status
const getNodeColor = (status: string) => {
  switch (status) {
    case 'active': return '#A3E635'; // Lime (Brand)
    case 'delinquent': return '#fbbf24'; // Amber
    case 'offline': return '#f87171'; // Red
    default: return '#94a3b8';
  }
};

// Convert Lat/Lon to 3D Position
const getVectorFromLatLon = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return [x, y, z] as [number, number, number];
};

interface NodeMarkerProps {
  node: PNode;
  onClick?: (node: PNode) => void;
  selected: boolean;
  isDark: boolean;
}

const NodeMarker: React.FC<NodeMarkerProps> = ({ node, onClick, selected, isDark }) => {
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const position = useMemo(() => {
    return getVectorFromLatLon(node.geo_info?.latitude || 0, node.geo_info?.longitude || 0, EARTH_RADIUS);
  }, [node.geo_info?.latitude, node.geo_info?.longitude]);

  const color = getNodeColor(node.status);

  // Calculate marker size based on storage capacity (mock logic)
  const size = 0.3 + ((node.total_storage_tb || 10) / 100) * 0.4;

  return (
    <group position={position}>
      {/* Stick connecting to surface */}
      <mesh position={[0, 0, 0]} lookAt={() => new THREE.Vector3(0, 0, 0)}>
        <cylinderGeometry args={[0.05, 0.05, size * 2, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* The Node Dot */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[selected ? size * 1.5 : size, 16, 16]} />
        <meshStandardMaterial
          color={selected ? '#ffffff' : color}
          emissive={color}
          emissiveIntensity={selected || hovered ? 2 : 1}
          toneMapped={false}
        />
      </mesh>

      {/* Selection Ring */}
      {selected && (
        <Billboard>
          <mesh>
            <ringGeometry args={[size * 2, size * 2.2, 32]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        </Billboard>
      )}

      {/* Label */}
      {(hovered || selected) && (
        <Html position={[0, size + 1, 0]} center distanceFactor={20} zIndexRange={[100, 0]}>
          <div className={`pointer-events-none select-none transition-opacity duration-200`}>
            {hovered && !selected && (
              <div className="bg-surface/90 border-border-subtle backdrop-blur-md border p-2 rounded text-left shadow-2xl min-w-[120px]">
                <p className="text-xs font-bold text-primary mb-1">ID: {node.pubkey.substring(0, 8)}...</p>
                <p className="text-[10px] text-text-secondary">Region: {node.geo_info?.region}</p>
                <p className="text-[10px] text-text-secondary">Latency: {node.latency_ms}ms</p>
              </div>
            )}

            {(!hovered || selected) && (
              <div className={`bg-surface/80 border-border-subtle/50 text-text-muted backdrop-blur-md border px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap shadow-xl ${selected ? 'border-primary text-primary font-bold' : ''}`}>
                {node.pubkey.substring(0, 8)}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// The Planet Mesh
const Earth: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <group>
      {/* Base Sphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS - 0.1, 64, 64]} />
        <meshPhongMaterial
          color={isDark ? "#111111" : "#e0f2fe"}
          emissive={isDark ? "#0A0A0A" : "#ffffff"}
          emissiveIntensity={0.1}
          specular={isDark ? "#111" : "#fff"}
          shininess={10}
        />
      </mesh>

      {/* Wireframe / Grid Overlay for "Tech" look */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color={isDark ? "#2A2A2A" : "#bfdbfe"}
          wireframe
          transparent
          opacity={isDark ? 0.3 : 0.4}
        />
      </mesh>

      {/* Atmosphere Glow */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[EARTH_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color={isDark ? "#A3E635" : "#60a5fa"}
          transparent
          opacity={isDark ? 0.05 : 0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Camera Controller
const CameraController = ({ selectedNodeId, nodes, controlsRef }: { selectedNodeId: string | null, nodes: PNode[], controlsRef: any }) => {
  useFrame((state, delta) => {
    if (!selectedNodeId || !controlsRef.current) return;

    const node = nodes.find(n => n.pubkey === selectedNodeId);
    if (!node) return;

    const pos = getVectorFromLatLon(node.geo_info?.latitude || 0, node.geo_info?.longitude || 0, EARTH_RADIUS);
    const nodePos = new THREE.Vector3(...pos);

    // Smoothly move controls target to the node
    controlsRef.current.target.lerp(nodePos, 0.1);

    // Calculate desired camera position (Zoomed in, slightly offset)
    const direction = nodePos.clone().normalize();
    const camPos = nodePos.clone().add(direction.multiplyScalar(20)); // Distance from surface

    state.camera.position.lerp(camPos, 0.05);
    controlsRef.current.update();
  });
  return null;
}

// Simple Table View for Mobile
const MobileNodeList: React.FC<{ nodes: PNode[], onNodeClick?: (node: PNode) => void }> = ({ nodes, onNodeClick }) => {
  return (
    <div className="h-full overflow-y-auto bg-root p-4 pb-20">
      <div className="flex items-center mb-4 text-text-primary">
        <List className="mr-2 text-primary" />
        <h2 className="text-lg font-bold">Node List</h2>
      </div>
      <div className="space-y-3">
        {nodes.map(node => (
          <div
            key={node.pubkey}
            onClick={() => onNodeClick?.(node)}
            className="bg-surface/50 border border-border-subtle rounded-lg p-4 active:bg-elevated transition-colors cursor-pointer shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-primary text-sm">{node.pubkey.substring(0, 12)}...</span>
              <span className={`text-xs px-2 py-0.5 rounded capitalize ${node.status === 'active' ? 'bg-secondary-soft text-secondary' : 'bg-red-500/20 text-red-500'
                }`}>
                {node.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>Region: {node.geo_info?.region}</div>
              <div>Latency: {node.latency_ms}ms</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GalaxyView: React.FC<GalaxyViewProps> = ({ nodes, onNodeClick, selectedNodeId, lastUpdated, refetch, isRefetching }) => {
  const controlsRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDark, setIsDark] = useState(true);

  // Check dark mode state from HTML class
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for Reset (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !selectedNodeId && controlsRef.current && !isMobile) {
        e.preventDefault();
        controlsRef.current.reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, isMobile]);

  // Stats for the floating panel
  const activeNodes = nodes.filter(n => n.status === 'active').length;
  const warningNodes = nodes.filter(n => n.status === 'delinquent').length;
  const offlineNodes = nodes.filter(n => n.status === 'offline').length;
  const totalStorage = nodes.reduce((acc, n) => acc + (n.total_storage_tb || 0), 0);

  const timeAgo = useMemo(() => {
    if (!lastUpdated) return 'Never';
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdated, isRefetching]);

  if (isMobile) {
    return <MobileNodeList nodes={nodes} onNodeClick={onNodeClick} />;
  }

  return (
    <div className="w-full h-full bg-root relative transition-colors duration-500">
      <Canvas camera={{ position: [0, 20, 45], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={[isDark ? '#0A0A0A' : '#f8fafc']} />

        {/* Lights */}
        <ambientLight intensity={isDark ? 0.4 : 0.8} />
        <pointLight position={[50, 20, 30]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-20, -10, -20]} intensity={0.5} color={isDark ? "#A3E635" : "#60a5fa"} />

        {/* Environment */}
        <Stars radius={150} depth={50} count={isDark ? 3000 : 200} factor={4} saturation={0} fade speed={0.5} />

        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.8}
          rotateSpeed={0.4}
          minDistance={EARTH_RADIUS + 5}
          maxDistance={EARTH_RADIUS + 80}
          autoRotate={!selectedNodeId}
          autoRotateSpeed={0.5}
        />

        <CameraController selectedNodeId={selectedNodeId || null} nodes={nodes} controlsRef={controlsRef} />

        {/* Planet */}
        <Earth isDark={isDark} />

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeMarker
            key={node.pubkey}
            node={node}
            onClick={onNodeClick}
            selected={selectedNodeId === node.pubkey}
            isDark={isDark}
          />
        ))}
      </Canvas>

      {/* Floating Network Stats */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl p-4 shadow-2xl text-text-primary w-64 animate-in slide-in-from-left duration-500">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center">
            <Globe className="w-3 h-3 mr-1.5 text-primary" /> Global Network
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center bg-elevated rounded py-2">
              <div className="text-lg font-bold text-text-primary">{activeNodes}</div>
              <div className="text-[10px] text-secondary">Active</div>
            </div>
            <div className="text-center bg-elevated rounded py-2">
              <div className="text-lg font-bold text-text-primary">{warningNodes}</div>
              <div className="text-[10px] text-accent">Delinq</div>
            </div>
            <div className="text-center bg-elevated rounded py-2">
              <div className="text-lg font-bold text-text-primary">{offlineNodes}</div>
              <div className="text-[10px] text-red-500">Offline</div>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-border-subtle pt-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary flex items-center"><Database size={10} className="mr-1.5" /> Total Storage</span>
              <span className="font-mono text-primary">{totalStorage.toFixed(0)} TB</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border-subtle pointer-events-auto">
            <span className="text-[10px] text-text-muted">
              Updated: {timeAgo}
            </span>
            <button
              onClick={() => refetch?.()}
              className={`p-1.5 hover:bg-elevated rounded transition-colors text-text-muted hover:text-primary ${isRefetching ? 'animate-spin text-primary' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Reset View Button */}
      <div className="absolute top-6 right-6 pointer-events-auto">
        <button
          onClick={() => {
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
          }}
          className="bg-surface/80 hover:bg-elevated text-text-muted hover:text-text-primary p-2.5 rounded-lg backdrop-blur border border-border-subtle shadow-lg transition-all group"
          title="Reset View (Space)"
        >
          <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>
    </div>
  );
};