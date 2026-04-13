// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: string;
  slug: string;
  name: string;
  className: string;
  description: string;
  form: string;
  stackSize: string;
  energyValue: number;
  radioactive: number;
  category: string;
  tier: number | null;
}

// ============================================================================
// RECIPE TYPES
// ============================================================================

export interface RecipeIngredient {
  className: string;
  amount: number;
}

export interface RecipeProduct {
  className: string;
  amount: number;
}

export interface Recipe {
  id: string;
  className: string;
  displayName: string;
  type: 'standard' | 'alternate' | 'residual' | 'unpackage';
  ingredients: RecipeIngredient[];
  products: RecipeProduct[];
  time: number;
  producedIn: string;
  isAlternate: boolean;
  manualMultiplier: number;
  isVariable: boolean;
  tier: number | null;
}

// ============================================================================
// TOPOLOGY & GRAPH TYPES
// ============================================================================

export interface TopologicalEdge {
  sourceId: string;
  targetId: string;
  throughput: number;
  weight: number;
  persistence: number; // Full-graph default (precomputed at build time)
}

export interface TopologicalManifest {
  metadata: {
    generatedAt: string;
    edgeCount: number;
    sccCount: number;
  };
  edges: TopologicalEdge[];
  nodeScores: Record<string, number>;
  nodeDepths: Record<string, number>;
  sccs: string[][];
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Three persistence contexts, each answering a different question:
 *
 *   full      — "In the complete production network, how important is this?"
 *               Precomputed at build time. The absolute reference frame.
 *
 *   filtered  — "Across all production at my current filter settings,
 *               how important is this?" Recomputed when filters change.
 *
 *   subgraph  — "Within this specific product's dependency tree,
 *               how critical is this?" Recomputed when target changes.
 */
export interface PersistenceScores {
  full: number;
  filtered: number;
  subgraph: number;
}

// ============================================================================
// D3 INTERFACE
// ============================================================================

interface D3GraphNode {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * The node consumed by GraphCanvas.
 * Built by useGraphBuilder from domain data.
 * Canvas doesn't need to know about products, recipes, or filters —
 * everything it needs to render is on this struct.
 */
export interface GraphNode extends D3GraphNode {
  id: string;

  payload: {
    type: 'product' | 'recipe';
    data: Product | Recipe | null;
  };

  persistence: PersistenceScores;
  degree: number;
  sccGroupId: number | null;

  /** Visual filter: node participates in computation but is hidden from render */
  visuallyHidden: boolean;
}

/**
 * The link consumed by GraphCanvas.
 * D3 replaces string IDs with node object references after initialization.
 */
export interface GraphEdge extends Omit<
  TopologicalEdge,
  'sourceId' | 'targetId' | 'persistence'
> {
  source: string | GraphNode;
  target: string | GraphNode;
  throughput: number;
  weight: number;
  persistence: PersistenceScores;
}
