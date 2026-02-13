/**
 * Shared TypeScript types for Satisfactory Optimization Tool
 * Single source of truth for all data structures
 */

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
}

// export interface ProductsByCategory {
//   [category: string]: Product[];
// }

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
}

// ============================================================================
// ORGANIZED RECIPE DATA STRUCTURE
// ============================================================================

// export interface CircularRelationships {
//   stronglyConnectedComponents: string[][];
//   circularItems: string[];
//   circularRecipes: string[];
// }

// export interface RecipesOrganized {
//   all: Recipe[];
//   byProduct: { [className: string]: Recipe[] };
//   byIngredient: { [className: string]: Recipe[] };
//   byMachine: { [machine: string]: Recipe[] };
//   alternates: Recipe[];
//   circularRelationships: CircularRelationships;
// }

// ============================================================================
// TOPOLOGY & GRAPH TYPES
// ============================================================================

export interface TopologicalEdge {
  sourceId: string; // "iron-ingot"
  targetId: string; // "recipe-iron-plate"
  throughput: number; // (Amount / Recipe.Time) * 60 (Visual Thickness)
  weight: number; // (Recipe.Time / Amount)  [Normalized] (Spring Length)
  persistence: number; // Stability metric (Visibility / LOD)
}

export interface TopologicalManifest {
  metadata: {
    generatedAt: string;
    edgeCount: number;
    sccCount: number;
  };
  edges: TopologicalEdge[]; // The metric space
  sccs: string[][]; // The loops
  circularItems: string[]; // Fast lookup for loop participants
}

// ============================================================================
// D3 INTERFACE
// ============================================================================

// 1. The Standard D3 Node Interface (Mutable struct, no nesting)
interface D3GraphNode {
  index?: number;
  x?: number; // Current X position
  y?: number; // Current Y position
  vx?: number; // X Velocity
  vy?: number; // Y Velocity
  fx?: number | null; // Fixed X (User drag state)
  fy?: number | null; // Fixed Y (User drag state)
}

/**
 * The Actual Node used in the React Component.
 */
export interface GraphNode extends D3GraphNode {
  id: string; // Required for D3 linkage

  // COMPOSITION: The Static Fact
  // Wrapped in 'payload' so D3 never touches the original data.
  payload: {
    type: 'product' | 'recipe' | 'scc';
    data: Product | Recipe | null;
  };

  // KINETIC STATE: The "Heat"
  // Calculated at runtime based on the specific neighbors in this view.
  stressScore: number; // 0.0 to 1.0 (Color Heatmap)
  degree: number; // Number of active connections (Size)

  // what production chain is the user asking for?
  focus: boolean;

  sccGroupId: number | null; // maybe just temporary
}

/**
 * The Actual Link used in the D3 Force Graph.
 * It extends the static edge with D3's object references.
 */
export interface GraphEdge extends Omit<
  TopologicalEdge,
  'sourceId' | 'targetId'
> {
  // D3 replaces string IDs with actual Node object references after initialization
  source: string | GraphNode;
  target: string | GraphNode;

  // We keep the static physics values for the simulation forces
  throughput: number;
  weight: number;
  persistence: number;
  focus: boolean;
}
