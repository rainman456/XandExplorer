import React, { useEffect, useState, useMemo } from 'react';
import { X, Copy, Check, Server, Activity, Database, Clock, Radio, Globe, Share2 } from 'lucide-react';
import { PNode } from '../types/node.types';

interface NodeDetailPanelProps {
   node: PNode | null;
   onClose: () => void;
   allNodes?: PNode[];
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, onClose, allNodes = [] }) => {
   const [copied, setCopied] = useState(false);

   useEffect(() => {
      setCopied(false);
   }, [node]);

   const handleCopy = () => {
      if (node) {
         navigator.clipboard.writeText(node.pubkey);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      }
   };

   // Derive Gossip Peers (simulated logic matching EarthView)
   const gossipPeers = useMemo(() => {
      if (!node || !allNodes.length) return [];

      const peers: PNode[] = [];

      // 1. Add local cluster peers (nodes in same region)
      // Limit to 3 for UI purposes
      // 1. Add local cluster peers (nodes in same region)
      // Limit to 3 for UI purposes
      const regionPeers = allNodes
         .filter(n => n.pubkey !== node.pubkey && n.country === node.country)
         .slice(0, 3);

      peers.push(...regionPeers);

      // 2. Add 1 random bridge peer if available
      const otherRegions = allNodes.filter(n => n.country !== node.country);
      if (otherRegions.length > 0) {
         // Deterministic pseudo-random based on pubkey char code
         const idx = node.pubkey.charCodeAt(0) % otherRegions.length;
         peers.push(otherRegions[idx]);
      }

      return peers;
   }, [node, allNodes]);

   const translateClass = node ? 'translate-x-0' : 'translate-x-full';

   return (
      <div className={`fixed top-0 right-0 h-full w-full md:w-[380px] bg-elevated/95 backdrop-blur-xl border-l border-border-strong shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${translateClass}`}>
         {node && (
            <div className="p-6 space-y-8">
               {/* Header */}
               <div className="flex justify-between items-start">
                  <div>
                     <h2 className="text-xl font-bold text-text-primary tracking-tight">Node Details</h2>
                     <p className="text-text-muted text-xs mt-1">Detailed metrics & connectivity</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-text-primary transition-colors">
                     <X size={20} />
                  </button>
               </div>

               {/* Status Badge */}
               <div className="flex items-center space-x-3 bg-surface p-4 rounded-xl border border-border-subtle">
                  <div className={`relative flex items-center justify-center w-12 h-12 rounded-full ${node.status === 'active' ? 'bg-secondary-soft' :
                     node.status === 'delinquent' ? 'bg-accent/10' : 'bg-red-500/10'
                     }`}>
                     <Activity className={`w-6 h-6 ${node.status === 'active' ? 'text-secondary' :
                        node.status === 'delinquent' ? 'text-accent' : 'text-red-500'
                        }`} />
                     <span className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-elevated ${node.status === 'active' ? 'bg-secondary' :
                        node.status === 'delinquent' ? 'bg-accent' : 'bg-red-500'
                        }`}></span>
                  </div>
                  <div>
                     <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Current Status</p>
                     <p className={`text-lg font-semibold capitalize ${node.status === 'active' ? 'text-secondary' :
                        node.status === 'delinquent' ? 'text-accent' : 'text-red-400'
                        }`}>
                        {node.status}
                     </p>
                  </div>
               </div>

               {/* Identity */}
               <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center">
                     <Server className="w-4 h-4 mr-2 text-primary" /> Identity
                  </h3>
                  <div className="bg-root rounded-lg p-3 border border-border-subtle group relative">
                     <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Pubkey</p>
                     <p className="font-mono text-xs text-text-primary break-all pr-8">{node.pubkey}</p>
                     <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all"
                     >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                     </button>
                  </div>
               </div>

               {/* Connection Info */}
               <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center">
                     <Globe className="w-4 h-4 mr-2 text-primary" /> Connectivity
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-surface p-3 rounded-lg border border-border-subtle">
                        <p className="text-[10px] text-text-muted mb-1">IP Address</p>
                        <p className="font-mono text-sm text-text-primary">{node.ip}</p>
                     </div>
                     <div className="bg-surface p-3 rounded-lg border border-border-subtle">
                        <p className="text-[10px] text-text-muted mb-1">Port</p>
                        <p className="font-mono text-sm text-text-primary">{node.port}</p>
                     </div>
                  </div>
                  <div className="bg-surface p-3 rounded-lg border border-border-subtle">
                     <p className="text-[10px] text-text-muted mb-1">Location</p>
                     <p className="font-mono text-xs text-text-primary">
                        {node.city}, {node.country}
                     </p>
                  </div>
                  <div className="bg-surface p-3 rounded-lg border border-border-subtle flex justify-between items-center">
                     <div>
                        <p className="text-[10px] text-text-muted mb-1">Version</p>
                        <p className="font-mono text-sm text-text-primary">{node.version}</p>
                     </div>
                     <div className="text-xs text-secondary bg-secondary-soft px-2 py-1 rounded border border-secondary/20">
                        Latest
                     </div>
                  </div>
               </div>

               {/* Gossip Peers */}
               <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center">
                     <Share2 className="w-4 h-4 mr-2 text-primary" /> Gossip Cluster
                  </h3>
                  <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
                     {gossipPeers.length > 0 ? (
                        <div className="divide-y divide-border-subtle">
                           {gossipPeers.map(peer => (
                              <div key={peer.pubkey} className="p-3 flex items-center justify-between hover:bg-overlay-hover transition-colors">
                                 <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${peer.status === 'active' ? 'bg-secondary' : 'bg-accent'
                                       }`}></div>
                                    <div>
                                       <p className="text-xs font-mono text-text-primary">{peer.pubkey.substring(0, 8)}...</p>
                                       <p className="text-[9px] text-text-muted uppercase">
                                          {peer.country === node.country ? 'Local Peer' : 'Bridge Peer'}
                                       </p>
                                    </div>
                                 </div>
                                 <span className="text-[10px] font-mono text-text-secondary">{peer.response_time}ms</span>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="p-4 text-center text-xs text-text-muted">No peers detected</div>
                     )}
                  </div>
               </div>

               {/* Performance */}
               <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center">
                     <Database className="w-4 h-4 mr-2 text-primary" /> Performance
                  </h3>
                  <div className="bg-surface rounded-lg border border-border-subtle divide-y divide-border-subtle">
                     <div className="p-3 flex justify-between items-center">
                        <div className="flex items-center text-text-secondary text-sm">
                           <Database className="w-4 h-4 mr-3 opacity-50" /> Total Storage
                        </div>
                        <span className="font-mono text-text-primary">{((node.storage_capacity ?? 0) / 1e12).toFixed(2)} TB</span>
                     </div>
                     <div className="p-3 flex justify-between items-center">
                        <div className="flex items-center text-text-secondary text-sm">
                           <Database className="w-4 h-4 mr-3 opacity-50" /> Used Storage
                        </div>
                        <span className="font-mono text-text-primary">{((node.storage_used ?? 0) / 1e12).toFixed(2)} TB</span>
                     </div>
                     <div className="p-3 flex justify-between items-center">
                        <div className="flex items-center text-text-secondary text-sm">
                           <Clock className="w-4 h-4 mr-3 opacity-50" /> Uptime
                        </div>
                        <span className="font-mono text-secondary">{(node.uptime_score ?? 0)}% (score)</span>
                     </div>
                     <div className="p-3 flex justify-between items-center">
                        <div className="flex items-center text-text-secondary text-sm">
                           <Radio className="w-4 h-4 mr-3 opacity-50" /> Last Seen
                        </div>
                        <span className="font-mono text-text-primary text-xs">{node.last_seen ? new Date(node.last_seen).toLocaleString() : 'N/A'}</span>
                     </div>
                  </div>
               </div>

               {/* Footer Actions */}
               <div className="pt-4 flex space-x-3">
                  <button onClick={onClose} className="flex-1 py-3 bg-surface hover:bg-root text-text-primary rounded-lg transition-colors text-sm font-medium border border-border-subtle">
                     Close Panel
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};
