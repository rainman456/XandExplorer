import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PNode } from '../types/node.types';
import { RefreshCw, Globe, Plus, Minus, Share2 } from 'lucide-react';

interface EarthViewProps {
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  selectedNodeId?: string | null;
  lastUpdated?: Date | null;
  refetch?: () => void;
  isRefetching?: boolean;
}

const GEOJSON_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';

// --- SHARED UTILS ---

const getNodeColor = (status: string) => {
  switch (status) {
    case 'active': return '#008E7C'; // Secondary (Success)
    case 'delinquent': return '#FE8300'; // Accent (Warning)
    case 'offline': return '#f87171'; // Red
    default: return '#6E6E7E';
  }
};

// --- 2D MAP COMPONENTS ---

const FlatMap: React.FC<{
  nodes: PNode[];
  onNodeClick?: (node: PNode) => void;
  selectedNodeId?: string | null;
}> = ({ nodes, onNodeClick, selectedNodeId }) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<PNode | null>(null);

  // Zoom & Pan State
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Distinguish click vs drag

  // Fetch GeoJSON for the 2D map
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Failed to load map data", err));
  }, []);

  // Simple Equirectangular Projection
  const project = (lat: number, lon: number) => {
    const x = (lon + 180) * (100 / 360);
    const y = (90 - lat) * (100 / 180);
    return { x, y };
  };

  const generatePath = (coordinates: any[], type: string): string => {
    const coordToPoint = (lon: number, lat: number) => {
      const x = (lon + 180) * (1000 / 360);
      const y = (90 - lat) * (500 / 180);
      return `${x},${y}`;
    };

    if (type === 'Polygon') {
      return coordinates.map((ring: any[]) => {
        return 'M' + ring.map(([lon, lat]: [number, number]) => coordToPoint(lon, lat)).join('L') + 'Z';
      }).join(' ');
    } else if (type === 'MultiPolygon') {
      return coordinates.map((polygon: any[]) => {
        return polygon.map((ring: any[]) => {
          return 'M' + ring.map(([lon, lat]: [number, number]) => coordToPoint(lon, lat)).join('L') + 'Z';
        }).join(' ');
      }).join(' ');
    }
    return '';
  };

  // Generate Gossip Links (Memoized)
  const gossipLinks = useMemo(() => {
    const links: { source: PNode, target: PNode, type: 'local' | 'global' }[] = [];
    const regionMap = new Map<string, PNode[]>();

    nodes.forEach(n => {
      // Use new fields with fallback for robustness
      const region = n.city || n.country || n.geo_info?.region || 'unknown';
      // Grouping by city/region as proxy for now
      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)?.push(n);
    });

    // Local Cluster connections
    regionMap.forEach((regionNodes) => {
      for (let i = 0; i < regionNodes.length; i++) {
        // Connect to next 2 nodes in the list for a ring-like cluster
        for (let j = 1; j <= 2; j++) {
          const target = regionNodes[(i + j) % regionNodes.length];
          // Use id or pubkey
          const sId = regionNodes[i].pubkey;
          const tId = target.pubkey;

          if (tId !== sId) {
            links.push({ source: regionNodes[i], target: target, type: 'local' });
          }
        }
      }
    });

    // Global Bridge connections
    nodes.forEach((n) => {
      // 5% chance to connect to a random node in a different region
      if (Math.random() < 0.05) {
        const randomTarget = nodes[Math.floor(Math.random() * nodes.length)];
        const nRegion = n.city || n.country;
        const tRegion = randomTarget.city || randomTarget.country;

        if (nRegion !== tRegion) {
          links.push({ source: n, target: randomTarget, type: 'global' });
        }
      }
    });

    return links;
  }, [nodes]);


  // --- Zoom Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    const ZOOM_SPEED = 0.001;
    const newScale = Math.min(Math.max(1, scale - e.deltaY * ZOOM_SPEED * scale * 2), 8);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Mouse relative to container top-left
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // The point in the content (unscaled) under the mouse
      const contentX = (mouseX - position.x) / scale;
      const contentY = (mouseY - position.y) / scale;

      // Calculate new position to keep that content point under the mouse
      let newX = mouseX - contentX * newScale;
      let newY = mouseY - contentY * newScale;

      // Simple Bounds Check
      if (newScale === 1) {
        newX = 0;
        newY = 0;
      }

      setScale(newScale);
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setHasDragged(true);
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.5, 8);
    // Zoom to center logic simplified for buttons
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const contentX = (centerX - position.x) / scale;
      const contentY = (centerY - position.y) / scale;
      const newX = centerX - contentX * newScale;
      const newY = centerY - contentY * newScale;
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    } else {
      setScale(newScale);
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.5, 1);
    if (newScale === 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const contentX = (centerX - position.x) / scale;
      const contentY = (centerY - position.y) / scale;
      const newX = centerX - contentX * newScale;
      const newY = centerY - contentY * newScale;
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    } else {
      setScale(newScale);
    }
  };

  return (
    <div className="w-full h-full bg-root relative overflow-hidden flex items-center justify-center">

      {/* Viewport Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-move relative flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformable Content */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative"
        >
          <div className="relative w-[1000px] h-[500px] max-w-none select-none p-4">

            {/* World Map SVG */}
            <svg viewBox="0 0 1000 500" className="w-full h-full filter drop-shadow-2xl">
              {/* Background Ocean */}
              <rect width="1000" height="500" rx="12" className="fill-surface" />

              {/* Grid Lines */}
              <path d="M0,250 L1000,250" className="stroke-border-subtle" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d="M500,0 L500,500" className="stroke-border-subtle" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

              {/* Countries */}
              {geoData && geoData.features.map((feature: any, i: number) => (
                <path
                  key={i}
                  d={generatePath(feature.geometry.coordinates, feature.geometry.type)}
                  strokeWidth="0.5"
                  className="fill-elevated stroke-border-strong hover:fill-overlay-active transition-colors duration-300"
                />
              ))}
            </svg>

            {/* Gossip Links Layer (SVG Overlay) */}
            <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible m-4">
              {gossipLinks.map((link, i) => {
                const sourcePos = project(link.source.lat || 0, link.source.lon || 0);
                const targetPos = project(link.target.lat || 0, link.target.lon || 0);

                // Convert percentages to SVG units (1000x500 viewBox)
                // x% of 1000 is x*10
                const x1 = sourcePos.x * 10;
                const y1 = sourcePos.y * 5;
                const x2 = targetPos.x * 10;
                const y2 = targetPos.y * 5;

                const isGlobal = link.type === 'global';

                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isGlobal ? "#933481" : "var(--color-secondary)"}
                    strokeWidth={isGlobal ? 1 : 0.5}
                    strokeOpacity={isGlobal ? 0.3 : 0.15}
                    strokeDasharray={isGlobal ? "4 4" : "none"}
                    className={isGlobal ? "animate-pulse" : ""}
                  />
                );
              })}
            </svg>

            {/* Nodes Layer */}
            <div className="absolute inset-0 m-4 pointer-events-none">
              {nodes.map(node => {
                const { x, y } = project(node.lat || 0, node.lon || 0);
                const isSelected = selectedNodeId === node.pubkey;
                const color = getNodeColor(node.status);

                return (
                  <div
                    key={node.pubkey}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!hasDragged) {
                        onNodeClick?.(node);
                      }
                    }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className={`relative transition-all duration-300 ${isSelected ? 'scale-150 z-20' : 'hover:scale-150 hover:z-10'}`}>
                      {(isSelected || hoveredNode === node) && (
                        <div className="absolute -inset-2 border border-white/40 rounded-full animate-ping"></div>
                      )}

                      {/* Capacity-weighted node size */}
                      {(() => {
                        const capacityTB = (node.storage_capacity ?? 0) / 1e12;
                        // Scale: 10TB = small (1.5), 50TB = medium (2.5), 100TB+ = large (3.5)
                        const nodeSize = Math.min(3.5, Math.max(1.5, 1.5 + (capacityTB / 50)));
                        return (
                          <div
                            className="rounded-full shadow-lg"
                            style={{
                              width: `${nodeSize * 4}px`,
                              height: `${nodeSize * 4}px`,
                              backgroundColor: color,
                              boxShadow: `0 0 ${nodeSize * 3}px ${color}`
                            }}
                          ></div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tooltip Overlay */}
            {hoveredNode && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{
                  left: `${project(hoveredNode.lat || 0, hoveredNode.lon || 0).x}%`,
                  top: `${project(hoveredNode.lat || 0, hoveredNode.lon || 0).y}%`,
                  transform: `translate(-50%, -150%) scale(${1 / scale})`,
                  transformOrigin: 'bottom center'
                }}
              >
                <div className="bg-elevated/95 backdrop-blur-md border border-border-strong p-3 rounded-xl text-left shadow-2xl min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-primary font-mono">NODE ID</span>
                    <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: getNodeColor(hoveredNode.status) }}></div>
                  </div>
                  <p className="text-xs font-bold text-text-primary mb-2 font-mono">{hoveredNode.pubkey.substring(0, 10)}...</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-text-secondary">
                      <span>Region</span>
                      <span className="text-text-primary">{hoveredNode.city || hoveredNode.country}</span>
                    </div>
                    {(hoveredNode.response_time !== undefined) && (
                      <div className="flex justify-between text-[10px] text-text-secondary">
                        <span>Latency</span>
                        <span className="text-secondary">{hoveredNode.response_time} ms</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-elevated absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 pointer-events-none">
        <div className="bg-elevated/50 backdrop-blur px-4 py-2 rounded-full border border-border-subtle text-xs font-mono text-text-secondary pointer-events-auto flex items-center gap-3">
          <span className="mr-2 border-r border-border-subtle pr-3">2D MAP + GOSSIP</span>
          <button onClick={handleZoomOut} className="hover:text-text-primary transition-colors"><Minus size={14} /></button>
          <span className="text-[10px] w-8 text-center text-text-primary">{(scale * 100).toFixed(0)}%</span>
          <button onClick={handleZoomIn} className="hover:text-text-primary transition-colors"><Plus size={14} /></button>
        </div>
      </div>

      {/* Legend Override for Gossip */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none hidden md:block">
        <div className="bg-elevated/80 backdrop-blur-md border border-border-subtle rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-[10px] text-text-muted uppercase font-bold">
            <Share2 size={10} className="text-primary" /> Network Topology
          </div>
          <div className="space-y-1">
            <div className="flex items-center text-[10px] text-text-secondary">
              <div className="w-4 h-0.5 bg-secondary/50 mr-2"></div> Local Peer
            </div>
            <div className="flex items-center text-[10px] text-text-secondary">
              <div className="w-4 h-0.5 border-t border-primary/50 border-dashed mr-2"></div> Bridge Link
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


// --- MAIN COMPONENT ---

export const EarthView: React.FC<EarthViewProps> = ({ nodes, onNodeClick, selectedNodeId, lastUpdated, refetch, isRefetching }) => {
  // Theme Detection if needed, but for now 2D map handles its own looks based on CSS vars
  // Keeping only the wrapper and Stats

  const activeNodes = nodes?.filter(n => n.status === 'active').length || 0;
  // Handle undefined nodes gracefully
  const totalStorage = (nodes || []).reduce((acc, n) => acc + ((n.storage_capacity ?? 0) / 1e12), 0);

  const timeAgo = useMemo(() => {
    if (!lastUpdated) return 'Never';
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdated, isRefetching]);

  return (
    <div className="w-full h-full bg-root relative overflow-hidden transition-colors duration-300">

      {/* 2D View Render - FORCED */}
      <FlatMap nodes={nodes || []} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />

      {/* UI: Geo Summary Panel */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-elevated/80 backdrop-blur-md border border-border-subtle rounded-xl p-4 shadow-xl text-text-primary w-72 animate-in slide-in-from-left">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center">
            <Globe className="w-3 h-3 mr-2 text-primary" /> Geo Summary
          </h3>

          {(() => {
            // Calculate regional insights
            const regionMap = new Map<string, { count: number; capacity: number }>();
            (nodes || []).forEach(n => {
              const region = n.country || 'Unknown';
              const current = regionMap.get(region) || { count: 0, capacity: 0 };
              regionMap.set(region, {
                count: current.count + 1,
                capacity: current.capacity + ((n.storage_capacity ?? 0) / 1e12)
              });
            });

            const regions = Array.from(regionMap.entries())
              .map(([name, data]) => ({ name, ...data }))
              .sort((a, b) => b.capacity - a.capacity);

            const topRegion = regions[0];
            const totalCapacity = regions.reduce((sum, r) => sum + r.capacity, 0);
            const topRegionPercent = topRegion ? (topRegion.capacity / totalCapacity * 100) : 0;
            const isConcentrated = topRegionPercent > 40;

            return (
              <>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">pNodes</span>
                    <span className="font-bold font-mono">{nodes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Regions</span>
                    <span className="font-bold font-mono">{regions.length}</span>
                  </div>
                  {topRegion && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-secondary">Top Region</span>
                        <span className="font-bold text-xs">{topRegion.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-secondary">Concentration</span>
                        <span className={`font-bold font-mono ${isConcentrated ? 'text-accent' : 'text-secondary'}`}>
                          {topRegionPercent.toFixed(0)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className={`text-[10px] px-2 py-1.5 rounded ${isConcentrated ? 'bg-accent/10 text-accent' : 'bg-secondary/10 text-secondary'}`}>
                  {isConcentrated ? '⚠️ High concentration' : '✓ Balanced distribution'}
                </div>
              </>
            );
          })()}

          <div className="flex justify-between items-center pt-3 mt-3 border-t border-border-subtle pointer-events-auto">
            <span className="text-[9px] text-text-muted">Updated: {timeAgo}</span>
            <button
              onClick={() => refetch?.()}
              className={`p-1.5 hover:bg-surface rounded transition-colors ${isRefetching ? 'animate-spin text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
        <div className="bg-elevated/80 backdrop-blur-sm border border-border-subtle rounded-lg px-3 py-2.5 shadow-lg">
          <div className="text-[9px] text-text-muted uppercase font-bold mb-2 flex items-center">
            <Globe size={10} className="mr-1 text-primary" /> Node Status
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center text-[10px] text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-[#008E7C] mr-2 shadow-[0_0_5px_#008E7C]"></span> Active
            </div>
            <div className="flex items-center text-[10px] text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-[#FE8300] mr-2"></span> Delinquent
            </div>
            <div className="flex items-center text-[10px] text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-[#f87171] mr-2"></span> Offline
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border-subtle text-[9px] text-text-muted">
            Size = Storage capacity
          </div>
        </div>
      </div>

    </div>
  );
};