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

export interface ProductsByCategory {
  [category: string]: Product[];
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
}

// ============================================================================
// CIRCULAR DEPENDENCY ANALYSIS
// ============================================================================

export interface CircularRelationships {
  stronglyConnectedComponents: string[][];
  circularItems: string[];
  circularRecipes: string[];
}

// ============================================================================
// ORGANIZED RECIPE DATA STRUCTURE
// ============================================================================

export interface RecipesOrganized {
  all: Recipe[];
  byProduct: { [className: string]: Recipe[] };
  byIngredient: { [className: string]: Recipe[] };
  byMachine: { [machine: string]: Recipe[] };
  alternates: Recipe[];
  circularRelationships: CircularRelationships;
}

// ============================================================================
// TREE VISUALIZATION TYPES
// ============================================================================

export interface TreeNode {
  name: string; // Display name (e.g., "Iron Ingot")
  className: string; // Product className (e.g., "Desc_IronIngot_C")
  children?: TreeNode[]; // Child nodes (ingredients)
  recipes?: string[]; // Recipe IDs that produce this product
  isCircular?: boolean; // Whether this item is part of circular dependency
  depth: number; // Depth in the tree (0 = root)
}
