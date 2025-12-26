/**
 * Re-export PNode and related types for backward compatibility
 * This file maintains compatibility with existing imports
 */

import type { PNode } from './api.types';

export { type PNode, type GeoInfo, type NodeStatus } from './api.types';

export interface NodesResponse {
  nodes: PNode[];
  total_count: number;
}
