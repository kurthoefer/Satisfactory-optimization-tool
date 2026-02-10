/**
 * SCC Decomposition Module
 *
 * Breaks down large SCCs into smaller components by removing bridge products/recipes.
 * Uses 4 strategies to find the best way to split an SCC.
 *
 * Pure logic - no colors, no visualization concerns.
 */

import type { Recipe } from '@/types';
import { findSCCs } from './sccDetection';

/**
 * Options for decomposition
 */
export interface DecompositionOptions {
  minSize: number; // Don't decompose SCCs smaller than this
  maxDepth?: number; // Optional recursion limit
}

/**
 * Information about a bridge used to split an SCC
 */
export interface BridgeInfo {
  product: string; // className of bridge product
  productName: string; // Display name
  bridgeScore: number; // How connected it was (higher = more connections)
  depth: number; // Recursion depth where this bridge was used
}

/**
 * Result of decomposing a single SCC
 */
export interface DecompositionResult {
  subSCCs: string[][]; // Resulting sub-SCCs (array of product arrays)
  allBridgeRecipes: Recipe[]; // All recipes that were removed as bridges
  success: boolean; // Whether decomposition succeeded
}

/**
 * Recursively decompose an SCC into smaller components
 *
 * @param scc - Array of product classNames in the SCC
 * @param recipeGraph - Map of product to its recipes
 * @param minSize - Don't decompose SCCs smaller than this
 * @param depth - Current recursion depth (internal)
 * @returns Decomposition result with sub-SCCs and bridge info
 */
export function decomposeRecursively(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
  minSize: number,
  depth: number = 0,
): DecompositionResult {
  const indent = '  '.repeat(depth);
  console.log(
    `${indent}🔬 Attempting to decompose SCC with ${scc.length} products (depth ${depth})`,
  );

  // Base case: SCC too small to decompose
  if (scc.length < minSize) {
    console.log(
      `${indent}   ⏹️  Too small to decompose (< ${minSize} products)`,
    );
    return {
      subSCCs: [scc],
      allBridgeRecipes: [],
      success: false,
    };
  }

  // Get all internal recipes (recipes that connect products within this SCC)
  const internalRecipes = getInternalRecipes(scc, recipeGraph);
  const standardRecipes = internalRecipes.filter((r) => !r.isAlternate);
  const alternateRecipes = internalRecipes.filter((r) => r.isAlternate);

  console.log(
    `${indent}   Found ${internalRecipes.length} internal recipes (${standardRecipes.length} standard, ${alternateRecipes.length} alternates)`,
  );

  // Try 4 strategies in order
  let result: DecompositionResult | null = null;

  // Strategy 1: Remove all alternate recipes
  result = tryRemoveAlternates(
    scc,
    recipeGraph,
    standardRecipes,
    alternateRecipes,
    indent,
  );
  if (result) return recurseSplit(result, recipeGraph, minSize, depth, indent);

  // Strategy 2: Find minimal bridge recipes
  result = tryMinimalBridges(scc, recipeGraph, internalRecipes, indent);
  if (result) return recurseSplit(result, recipeGraph, minSize, depth, indent);

  // Strategy 3: Try pairs of alternates
  result = tryAlternatePairs(
    scc,
    recipeGraph,
    standardRecipes,
    alternateRecipes,
    indent,
  );
  if (result) return recurseSplit(result, recipeGraph, minSize, depth, indent);

  // Strategy 4: Analyze product roles and remove bridge products
  result = tryBridgeProducts(scc, recipeGraph, internalRecipes, indent);
  if (result) return recurseSplit(result, recipeGraph, minSize, depth, indent);

  // Failed to decompose
  console.log(`${indent}   ❌ Could not decompose - too tightly connected`);
  return {
    subSCCs: [scc],
    allBridgeRecipes: [],
    success: false,
  };
}

/**
 * Get all recipes internal to an SCC (both inputs and outputs in the SCC)
 */
function getInternalRecipes(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
): Recipe[] {
  const sccSet = new Set(scc);
  const internal: Recipe[] = [];

  for (const product of scc) {
    const recipes = recipeGraph[product] || [];
    for (const recipe of recipes) {
      // Recipe is internal if all ingredients are in the SCC
      const allIngredientsInternal = recipe.ingredients.every((ing) =>
        sccSet.has(ing.className),
      );
      if (allIngredientsInternal) {
        internal.push(recipe);
      }
    }
  }

  return internal;
}

/**
 * Strategy 1: Remove all alternate recipes
 */
function tryRemoveAlternates(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
  standardRecipes: Recipe[],
  alternateRecipes: Recipe[],
  indent: string,
): DecompositionResult | null {
  console.log(`${indent}   📍 Strategy 1: Remove all alternate recipes`);

  if (alternateRecipes.length === 0) {
    return null; // No alternates to remove
  }

  // Build graph with only standard recipes
  const tempGraph = buildGraphWithoutRecipes(
    recipeGraph,
    new Set(alternateRecipes.map((r) => r.className)),
  );
  const { sccs } = findSCCs(tempGraph);

  // Filter to only SCCs that contain products from our original SCC
  const sccSet = new Set(scc);
  const relevantSCCs = sccs.filter((s) => s.some((p) => sccSet.has(p)));

  console.log(`${indent}      Result: ${relevantSCCs.length} sub-SCCs`);

  if (relevantSCCs.length > 1) {
    console.log(`${indent}      ✅ Success! Alternates were the bridges.`);
    return {
      subSCCs: relevantSCCs,
      allBridgeRecipes: alternateRecipes,
      success: true,
    };
  }

  return null;
}

/**
 * Strategy 2: Find minimal set of bridge recipes
 */
function tryMinimalBridges(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
  internalRecipes: Recipe[],
  indent: string,
): DecompositionResult | null {
  console.log(`${indent}   📍 Strategy 2: Find minimal bridge recipes`);

  // Try removing single recipes to see which are bridges
  // (Implementation simplified for now - would do more sophisticated bridge finding)

  return null; // Not implemented in this extraction
}

/**
 * Strategy 3: Try pairs of alternate recipes
 */
function tryAlternatePairs(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
  standardRecipes: Recipe[],
  alternateRecipes: Recipe[],
  indent: string,
): DecompositionResult | null {
  console.log(`${indent}   📍 Strategy 3: Try pairs of alternates`);

  // Try removing combinations of alternates
  // (Implementation simplified for now)

  return null;
}

/**
 * Strategy 4: Analyze product roles and remove bridge products
 */
function tryBridgeProducts(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
  internalRecipes: Recipe[],
  indent: string,
): DecompositionResult | null {
  console.log(
    `${indent}   📍 Strategy 4: Analyze product roles and remove bridges`,
  );

  // Analyze which products act as bridges
  const bridgeScores = analyzeBridgeProducts(scc, recipeGraph);
  const sortedBridges = Array.from(bridgeScores.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  console.log(
    `${indent}      Found ${sortedBridges.length} potential bridge products`,
  );

  // Try removing each bridge product
  for (const [bridgeProduct, score] of sortedBridges) {
    const productName = bridgeProduct; // Would get display name in real implementation
    console.log(
      `${indent}      Testing bridge: ${productName} (score: ${score})`,
    );

    // Remove all recipes that produce this bridge product
    const recipesToRemove = recipeGraph[bridgeProduct] || [];
    const tempGraph = buildGraphWithoutRecipes(
      recipeGraph,
      new Set(recipesToRemove.map((r) => r.className)),
    );

    const { sccs } = findSCCs(tempGraph);
    const sccSet = new Set(scc);
    const relevantSCCs = sccs.filter((s) => s.some((p) => sccSet.has(p)));

    if (relevantSCCs.length > 1) {
      console.log(
        `${indent}      ✅ Removing "${productName}" splits into ${relevantSCCs.length} sub-SCCs!`,
      );
      return {
        subSCCs: relevantSCCs,
        allBridgeRecipes: recipesToRemove,
        success: true,
      };
    }
  }

  return null;
}

/**
 * Analyze which products act as bridges (high connectivity)
 */
function analyzeBridgeProducts(
  scc: string[],
  recipeGraph: { [className: string]: Recipe[] },
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const product of scc) {
    const recipes = recipeGraph[product] || [];
    let score = 0;

    // Score based on how many recipes use this product
    for (const recipe of recipes) {
      score += recipe.ingredients.length; // More ingredients = higher connectivity
    }

    if (score > 0) {
      scores.set(product, score);
    }
  }

  return scores;
}

/**
 * Build a new recipe graph excluding certain recipes
 */
function buildGraphWithoutRecipes(
  recipeGraph: { [className: string]: Recipe[] },
  recipesToExclude: Set<string>,
): { [className: string]: Recipe[] } {
  const newGraph: { [className: string]: Recipe[] } = {};

  for (const [product, recipes] of Object.entries(recipeGraph)) {
    const filteredRecipes = recipes.filter(
      (r) => !recipesToExclude.has(r.className),
    );
    if (filteredRecipes.length > 0) {
      newGraph[product] = filteredRecipes;
    }
  }

  return newGraph;
}

/**
 * After a successful split, recursively decompose the sub-SCCs
 */
function recurseSplit(
  result: DecompositionResult,
  recipeGraph: { [className: string]: Recipe[] },
  minSize: number,
  depth: number,
  indent: string,
): DecompositionResult {
  console.log(
    `${indent}✂️  Split into ${result.subSCCs.length} sub-SCCs, recursing...`,
  );

  const finalSubSCCs: string[][] = [];
  const allBridges: Recipe[] = [...result.allBridgeRecipes];

  result.subSCCs.forEach((subSCC, index) => {
    console.log(
      `${indent}  ↳ Sub-SCC ${index + 1}/${result.subSCCs.length}: ${subSCC.length} products`,
    );

    const subResult = decomposeRecursively(
      subSCC,
      recipeGraph,
      minSize,
      depth + 1,
    );
    finalSubSCCs.push(...subResult.subSCCs);
    allBridges.push(...subResult.allBridgeRecipes);
  });

  console.log(
    `${indent}✅ Final result at depth ${depth}: ${finalSubSCCs.length} sub-SCCs`,
  );

  return {
    subSCCs: finalSubSCCs,
    allBridgeRecipes: allBridges,
    success: true,
  };
}
