/**
 * Builds a condensation graph from recipe data
 * Collapses strongly connected components (SCCs) into meta-nodes
 * Results in a pure DAG suitable for visualization
 */

import type { RecipesOrganized, Product, Recipe } from '@/types';
import recipesOrganizedData from '@/data/recipes-organized.json';
import productsData from '@/data/products-flat.json';

const recipesOrganized = recipesOrganizedData as RecipesOrganized;
const products = productsData as Product[];

/**
 * A node in the condensation graph
 * Can be either a single product or an SCC meta-node
 */
export interface CondensationNode {
  id: string; // Unique identifier
  type: 'product' | 'scc'; // Single product or SCC group

  // For product nodes
  name?: string; // Display name
  className?: string; // Product className

  // For SCC nodes
  products?: string[]; // ClassNames of products in this SCC
  productNames?: string[]; // Display names

  // Shared properties
  recipeCount: number; // Total recipes available
  isCircular: boolean; // Whether this contains cycles
}

/**
 * An edge in the condensation graph
 */
export interface CondensationEdge {
  source: string; // Source node ID
  target: string; // Target node ID
  recipes: string[]; // Recipe IDs that connect these nodes
  isMulti: boolean; // Multiple recipe options
}

/**
 * The complete condensation graph structure
 */
export interface CondensationGraph {
  nodes: CondensationNode[];
  edges: CondensationEdge[];

  // Metadata
  stats: {
    totalNodes: number;
    productNodes: number;
    sccNodes: number;
    totalEdges: number;
  };

  // Layout hint
  layout: {
    type: 'dag';
    condensed: boolean;
  };
}

/**
 * Build a filtered recipe graph excluding recipes that use base resources
 * This creates more granular SCCs for better visualization
 */
function buildFilteredRecipeGraph(byProduct: {
  [className: string]: Recipe[];
}): { [className: string]: Recipe[] } {
  // Create a Set of base resource classNames
  const baseResources = new Set(
    products.filter((p) => p.category === 'Resources').map((p) => p.className),
  );

  console.log(
    'Filtering out recipes using these base resources:',
    Array.from(baseResources),
  );

  const filteredByProduct: { [className: string]: Recipe[] } = {};

  Object.entries(byProduct).forEach(([productClassName, recipes]) => {
    const filteredRecipes = recipes.filter(
      (recipe) =>
        !recipe.ingredients.some((ing) => baseResources.has(ing.className)),
    );

    if (filteredRecipes.length > 0) {
      filteredByProduct[productClassName] = filteredRecipes;
    }
  });

  console.log(
    `Filtered graph: ${Object.keys(filteredByProduct).length} products with recipes (down from ${Object.keys(byProduct).length})`,
  );

  return filteredByProduct;
}

/**
 * Helper to check if an item has a self-loop (produces itself as ingredient)
 */
function hasSelfLoop(
  item: string,
  byProduct: { [className: string]: Recipe[] },
): boolean {
  const recipes = byProduct[item] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.className === item),
  );
}

/**
 * Tarjan's algorithm to find strongly connected components (circular dependencies)
 * Run on a specific byProduct graph (can be filtered or full)
 */
function findStronglyConnectedComponents(byProduct: {
  [className: string]: Recipe[];
}): {
  stronglyConnectedComponents: string[][];
  circularItems: string[];
} {
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Get all items in the recipe graph
  const allItems = new Set<string>();
  Object.keys(byProduct).forEach((item) => allItems.add(item));
  Object.values(byProduct).forEach((recipes) => {
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => allItems.add(ing.className));
    });
  });

  function strongConnect(item: string) {
    // Set the depth index for this node
    indices.set(item, index);
    lowLinks.set(item, index);
    index++;
    stack.push(item);
    onStack.add(item);

    // Get all items this item depends on (via its recipes)
    const recipes = byProduct[item] || [];
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const successor = ingredient.className;

        if (!indices.has(successor)) {
          // Successor has not yet been visited; recurse
          strongConnect(successor);
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, lowLinks.get(successor)!),
          );
        } else if (onStack.has(successor)) {
          // Successor is in stack and hence in the current SCC
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, indices.get(successor)!),
          );
        }
      }
    }

    // If this is a root node, pop the stack to create an SCC
    if (lowLinks.get(item) === indices.get(item)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== item);

      sccs.push(scc);
    }
  }

  // Run Tarjan's algorithm on all nodes
  for (const item of allItems) {
    if (!indices.has(item)) {
      strongConnect(item);
    }
  }

  // Identify circular items
  const circularItems = new Set<string>();
  sccs.forEach((scc) => {
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct));

    if (isCircular) {
      scc.forEach((item) => circularItems.add(item));
    }
  });

  console.log(
    `Found ${sccs.length} SCCs, ${sccs.filter((scc) => scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct))).length} are circular`,
  );

  return {
    stronglyConnectedComponents: sccs,
    circularItems: Array.from(circularItems),
  };
}

/**
 * Build a condensation graph from all recipes
 *
 * @param targetProduct - Optional: focus on subgraph containing this product
 * @param options - Optional configuration
 * @param options.decomposeMinSize - If provided, decompose SCCs with this many or more products
 * @param options.filterBaseResources - If true, exclude recipes using base resources (default: true when decomposing)
 * @returns CondensationGraph ready for D3 visualization
 */
export function buildCondensationGraph(
  targetProduct?: string,
  options?: {
    decomposeMinSize?: number;
    filterBaseResources?: boolean;
  },
): CondensationGraph {
  const { byProduct } = recipesOrganized;

  // Determine if we should filter base resources
  // Default: filter when decomposing, don't filter otherwise
  const shouldFilter =
    options?.filterBaseResources ?? options?.decomposeMinSize !== undefined;

  // Choose which recipe graph to use based on filtering
  const recipeGraph = shouldFilter
    ? buildFilteredRecipeGraph(byProduct)
    : byProduct;

  // Compute initial SCCs on the chosen graph
  const { stronglyConnectedComponents, circularItems } =
    findStronglyConnectedComponents(recipeGraph);

  console.log(
    `\n🔧 Building condensation graph (${shouldFilter ? 'FILTERED' : 'FULL'} recipes)`,
  );
  console.log(`   Found ${stronglyConnectedComponents.length} initial SCCs`);

  // Determine final SCCs: either decompose large ones, or use as-is
  let finalSCCs: string[][];

  if (options?.decomposeMinSize !== undefined) {
    // DECOMPOSITION MODE: Recursively break down large SCCs
    console.log(
      `   🔨 Decomposing SCCs with ${options.decomposeMinSize}+ products...\n`,
    );

    finalSCCs = [];

    stronglyConnectedComponents.forEach((scc, originalIndex) => {
      const isCircular =
        scc.length > 1 ||
        (scc.length === 1 && hasSelfLoop(scc[0], recipeGraph));

      if (isCircular && scc.length >= options.decomposeMinSize) {
        // This SCC is large enough to warrant decomposition attempts
        console.log(
          `📦 SCC #${originalIndex}: ${scc.length} products - attempting decomposition`,
        );

        // Recursively decompose this SCC as far as possible
        const result = decomposeRecursively(
          scc,
          recipeGraph,
          options.decomposeMinSize,
        );

        // Add all the resulting sub-SCCs to our final list
        finalSCCs.push(...result.subSCCs);

        console.log(
          `   ✅ SCC #${originalIndex} → ${result.subSCCs.length} final sub-SCCs\n`,
        );
      } else {
        // SCC is too small or not circular - keep as-is
        finalSCCs.push(scc);
      }
    });

    console.log(
      `\n📊 Decomposition complete: ${stronglyConnectedComponents.length} → ${finalSCCs.length} SCCs\n`,
    );
  } else {
    // NORMAL MODE: Use SCCs as-is without decomposition
    finalSCCs = stronglyConnectedComponents;
  }

  // Map each product to its SCC index (using final SCCs)
  const productToSCC = new Map<string, number>();
  finalSCCs.forEach((scc, index) => {
    scc.forEach((product) => {
      productToSCC.set(product, index);
    });
  });

  // If targetProduct specified, find all reachable products (BFS)
  // Otherwise include all products from the graph
  let relevantProducts: Set<string>;
  if (targetProduct) {
    relevantProducts = findReachableProducts(targetProduct, recipeGraph);
  } else {
    relevantProducts = new Set(Object.keys(recipeGraph));
  }

  // BUILD NODES from the final SCCs
  const nodes: CondensationNode[] = [];
  const processedSCCs = new Set<number>();
  const nodeIdMap = new Map<string, string>(); // product className -> node ID

  relevantProducts.forEach((className) => {
    const sccIndex = productToSCC.get(className);

    if (sccIndex !== undefined && !processedSCCs.has(sccIndex)) {
      // This product belongs to an SCC
      const scc = finalSCCs[sccIndex];
      const isActuallyCircular =
        scc.length > 1 || (scc.length === 1 && circularItems.includes(scc[0]));

      if (isActuallyCircular) {
        // Create a meta-node for this SCC
        const nodeId = `scc-${sccIndex}`;
        const sccProducts = scc.filter((p) => relevantProducts.has(p));

        const node: CondensationNode = {
          id: nodeId,
          type: 'scc',
          products: sccProducts,
          productNames: sccProducts.map((p) => getProductName(p)),
          recipeCount: sccProducts.reduce(
            (sum, p) => sum + (recipeGraph[p]?.length || 0),
            0,
          ),
          isCircular: true,
        };

        nodes.push(node);
        processedSCCs.add(sccIndex);

        // Map all products in this SCC to the meta-node
        sccProducts.forEach((p) => nodeIdMap.set(p, nodeId));
      } else {
        // Single product, non-circular - create regular node
        const nodeId = className;
        const recipes = recipeGraph[className] || [];

        nodes.push({
          id: nodeId,
          type: 'product',
          name: getProductName(className),
          className,
          recipeCount: recipes.length,
          isCircular: false,
        });

        nodeIdMap.set(className, nodeId);
        processedSCCs.add(sccIndex);
      }
    } else if (!productToSCC.has(className)) {
      // Product not in any SCC - create regular node
      const nodeId = className;
      const recipes = recipeGraph[className] || [];

      nodes.push({
        id: nodeId,
        type: 'product',
        name: getProductName(className),
        className,
        recipeCount: recipes.length,
        isCircular: false,
      });

      nodeIdMap.set(className, nodeId);
    }
  });

  // BUILD EDGES between nodes
  const edges: CondensationEdge[] = [];
  const edgeSet = new Set<string>(); // To deduplicate

  relevantProducts.forEach((productClassName) => {
    const recipes = recipeGraph[productClassName] || [];
    const sourceNodeId = nodeIdMap.get(productClassName);

    if (!sourceNodeId) return;

    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const targetNodeId = nodeIdMap.get(ingredient.className);

        if (!targetNodeId) return;
        if (sourceNodeId === targetNodeId) return; // Skip self-loops (handled by SCC structure)

        const edgeKey = `${sourceNodeId}->${targetNodeId}`;

        if (!edgeSet.has(edgeKey)) {
          // Find all recipes that connect these two nodes
          const connectingRecipes = recipes
            .filter((r) =>
              r.ingredients.some(
                (ing) => nodeIdMap.get(ing.className) === targetNodeId,
              ),
            )
            .map((r) => r.id);

          edges.push({
            source: sourceNodeId,
            target: targetNodeId,
            recipes: connectingRecipes,
            isMulti: connectingRecipes.length > 1,
          });

          edgeSet.add(edgeKey);
        }
      });
    });
  });

  // Calculate final stats
  const sccNodeCount = nodes.filter((n) => n.type === 'scc').length;

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      productNodes: nodes.length - sccNodeCount,
      sccNodes: sccNodeCount,
      totalEdges: edges.length,
    },
    layout: {
      type: 'dag',
      condensed: true,
    },
  };
}

/**
 * Find all products reachable from a target product (dependencies)
 * Uses BFS to traverse the recipe graph
 */
function findReachableProducts(
  targetProduct: string,
  byProduct: { [className: string]: Recipe[] },
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [targetProduct];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (reachable.has(current)) continue;
    reachable.add(current);

    const recipes = byProduct[current] || [];
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        if (!reachable.has(ingredient.className)) {
          queue.push(ingredient.className);
        }
      });
    });
  }

  return reachable;
}

/**
 * Helper to get product display name
 */
function getProductName(className: string): string {
  const product = products.find((p) => p.className === className);
  return product?.name || className;
}

/**
 * Get all recipes that produce products within an SCC
 */
function getSCCRecipes(
  sccProducts: string[],
  byProduct: { [className: string]: Recipe[] },
): Recipe[] {
  const recipes: Recipe[] = [];
  const sccProductSet = new Set(sccProducts);

  sccProducts.forEach((product) => {
    const productRecipes = byProduct[product] || [];
    // Only include recipes where ALL ingredients are also in the SCC
    // (internal recipes, not recipes that bring things INTO the SCC)
    productRecipes.forEach((recipe) => {
      const allIngredientsInternal = recipe.ingredients.every((ing) =>
        sccProductSet.has(ing.className),
      );
      if (allIngredientsInternal) {
        recipes.push(recipe);
      }
    });
  });

  return recipes;
}

/**
 * Build a recipe graph excluding specific recipes
 */
function buildGraphWithoutRecipes(
  products: string[],
  byProduct: { [className: string]: Recipe[] },
  excludedRecipeIds: Set<string>,
): { [className: string]: Recipe[] } {
  const filtered: { [className: string]: Recipe[] } = {};

  products.forEach((product) => {
    const recipes = (byProduct[product] || []).filter(
      (recipe) => !excludedRecipeIds.has(recipe.className),
    );
    if (recipes.length > 0) {
      filtered[product] = recipes;
    }
  });

  return filtered;
}

/**
 * Recursively decompose an SCC into smaller sub-SCCs by finding bridge recipes
 *
 * @param sccProducts - Products in the current SCC to decompose
 * @param byProduct - Recipe graph to analyze
 * @param minSize - Minimum size to attempt decomposition (stops when SCC is smaller)
 * @param depth - Recursion depth for logging indentation
 * @returns All final sub-SCCs and all bridge recipes found
 */
function decomposeRecursively(
  sccProducts: string[],
  byProduct: { [className: string]: Recipe[] },
  minSize: number,
  depth: number = 0,
): {
  subSCCs: string[][];
  allBridgeRecipes: Recipe[];
} {
  const indent = '  '.repeat(depth);
  console.log(
    `${indent}🔬 Attempting to decompose SCC with ${sccProducts.length} products (depth ${depth})`,
  );

  // BASE CASE: SCC is too small to bother decomposing
  if (sccProducts.length < minSize) {
    console.log(
      `${indent}   ⏹️  Too small to decompose (< ${minSize} products)`,
    );
    return { subSCCs: [sccProducts], allBridgeRecipes: [] };
  }

  // Try to split this SCC using the decomposition strategies
  const decomposition = decomposeSCC(sccProducts, byProduct);

  // BASE CASE: Couldn't split this SCC (too tightly connected)
  if (!decomposition.decomposed) {
    console.log(
      `${indent}   ⏹️  Cannot decompose further (too tightly connected)`,
    );
    return { subSCCs: [sccProducts], allBridgeRecipes: [] };
  }

  // RECURSIVE CASE: Successfully split! Now try to decompose each sub-SCC
  console.log(
    `${indent}✂️  Split into ${decomposition.subSCCs.length} sub-SCCs, recursing...`,
  );

  const finalSubSCCs: string[][] = [];
  const allBridges: Recipe[] = [...decomposition.bridgeRecipes];

  // Recursively decompose each sub-SCC
  for (let i = 0; i < decomposition.subSCCs.length; i++) {
    const subSCC = decomposition.subSCCs[i];
    console.log(
      `${indent}  ↳ Sub-SCC ${i + 1}/${decomposition.subSCCs.length}: ${subSCC.length} products`,
    );

    // RECURSE: Try to decompose this sub-SCC even further
    const result = decomposeRecursively(subSCC, byProduct, minSize, depth + 1);

    // Collect all the final sub-SCCs from this branch
    finalSubSCCs.push(...result.subSCCs);

    // Collect all bridge recipes found in this branch
    allBridges.push(...result.allBridgeRecipes);
  }

  console.log(
    `${indent}✅ Final result at depth ${depth}: ${finalSubSCCs.length} sub-SCCs`,
  );

  return { subSCCs: finalSubSCCs, allBridgeRecipes: allBridges };
}

/**
 * Decompose a large SCC into smaller sub-SCCs by finding and removing bridge recipes
 *
 * Strategy: Iteratively remove recipes and check if the SCC splits.
 * Prioritize removing alternate recipes as they're most likely to be bridges.
 *
 * NOTE: This is a single-level decomposition. Use decomposeRecursively() for deep decomposition.
 */
export function decomposeSCC(
  sccProducts: string[],
  byProduct: { [className: string]: Recipe[] },
): {
  subSCCs: string[][];
  bridgeRecipes: Recipe[];
  decomposed: boolean;
} {
  // Get all internal recipes (ones that only use products within the SCC)
  const internalRecipes = getSCCRecipes(sccProducts, byProduct);

  // Separate standard and alternate recipes
  const alternateRecipes = internalRecipes.filter((r) => r.isAlternate);
  const standardRecipes = internalRecipes.filter((r) => !r.isAlternate);

  console.log(
    `     Found ${internalRecipes.length} internal recipes (${standardRecipes.length} standard, ${alternateRecipes.length} alternates)`,
  );

  // STRATEGY 1: Try removing all alternates at once
  // This is often the fastest path since alternates usually create the cycles
  console.log('     📍 Strategy 1: Remove all alternate recipes');
  const withoutAlternates = buildGraphWithoutRecipes(
    sccProducts,
    byProduct,
    new Set(alternateRecipes.map((r) => r.className)),
  );

  const resultWithoutAlternates =
    findStronglyConnectedComponents(withoutAlternates);
  const subSCCsWithoutAlternates =
    resultWithoutAlternates.stronglyConnectedComponents.filter((scc) =>
      scc.some((p) => sccProducts.includes(p)),
    );

  console.log(`        Result: ${subSCCsWithoutAlternates.length} sub-SCCs`);

  if (subSCCsWithoutAlternates.length > 1) {
    console.log('        ✅ Success! Alternates were the bridges.');
    return {
      subSCCs: subSCCsWithoutAlternates,
      bridgeRecipes: alternateRecipes,
      decomposed: true,
    };
  }

  // STRATEGY 2: Try removing alternates one at a time to find minimal bridges
  // This finds the single most impactful recipe to remove
  console.log('     📍 Strategy 2: Find minimal bridge recipes');
  let bestSplit = { subSCCs: [sccProducts], bridges: [] as Recipe[] };
  let maxSplits = 1;

  for (const recipe of alternateRecipes) {
    const excluded = new Set([recipe.className]);
    const testGraph = buildGraphWithoutRecipes(
      sccProducts,
      byProduct,
      excluded,
    );
    const result = findStronglyConnectedComponents(testGraph);
    const subSCCs = result.stronglyConnectedComponents.filter((scc) =>
      scc.some((p) => sccProducts.includes(p)),
    );

    if (subSCCs.length > maxSplits) {
      maxSplits = subSCCs.length;
      bestSplit = { subSCCs, bridges: [recipe] };
      console.log(
        `        Found bridge: ${recipe.displayName} → ${subSCCs.length} sub-SCCs`,
      );
    }
  }

  if (maxSplits > 1) {
    console.log('        ✅ Found minimal bridge recipe(s)');
    return {
      subSCCs: bestSplit.subSCCs,
      bridgeRecipes: bestSplit.bridges,
      decomposed: true,
    };
  }

  // STRATEGY 3: Try combinations of alternates (expensive, limit to pairs)
  // For stubborn SCCs that need multiple bridges removed
  console.log('     📍 Strategy 3: Try pairs of alternates');
  for (let i = 0; i < alternateRecipes.length && i < 10; i++) {
    for (let j = i + 1; j < alternateRecipes.length && j < 10; j++) {
      const excluded = new Set([
        alternateRecipes[i].className,
        alternateRecipes[j].className,
      ]);
      const testGraph = buildGraphWithoutRecipes(
        sccProducts,
        byProduct,
        excluded,
      );
      const result = findStronglyConnectedComponents(testGraph);
      const subSCCs = result.stronglyConnectedComponents.filter((scc) =>
        scc.some((p) => sccProducts.includes(p)),
      );

      if (subSCCs.length > maxSplits) {
        maxSplits = subSCCs.length;
        bestSplit = {
          subSCCs,
          bridges: [alternateRecipes[i], alternateRecipes[j]],
        };
        console.log(
          `        Found bridge pair: ${alternateRecipes[i].displayName} + ${alternateRecipes[j].displayName} → ${subSCCs.length} sub-SCCs`,
        );
      }
    }
  }

  if (maxSplits > 1) {
    console.log('        ✅ Found bridge recipe pairs');
    return {
      subSCCs: bestSplit.subSCCs,
      bridgeRecipes: bestSplit.bridges,
      decomposed: true,
    };
  }

  console.log('        ❌ Could not decompose - too tightly connected');

  // STRATEGY 4: Analyze product roles and try removing bridge products
  // This strategy identifies products that connect different functional groups
  // (e.g., Empty Canister connecting fuel production to packaging)
  console.log('     📍 Strategy 4: Analyze product roles and remove bridges');

  const bridgeAnalysis = analyzeSCCStructureForBridges(sccProducts, byProduct);

  if (bridgeAnalysis.bridges.length > 0) {
    console.log(
      `        Found ${bridgeAnalysis.bridges.length} potential bridge products`,
    );

    // Try removing each bridge product's recipes
    for (const bridge of bridgeAnalysis.bridges) {
      const bridgeProductName = getProductName(bridge.product);
      console.log(
        `        Testing bridge: ${bridgeProductName} (score: ${bridge.bridgeScore})`,
      );

      const decomposition = decomposeByRemovingBridgeProduct(
        sccProducts,
        byProduct,
        bridge.product,
      );

      if (decomposition.subSCCs.length > 1) {
        console.log(
          `        ✅ Removing "${bridgeProductName}" splits into ${decomposition.subSCCs.length} sub-SCCs!`,
        );
        return {
          subSCCs: decomposition.subSCCs,
          bridgeRecipes: decomposition.removedRecipes,
          decomposed: true,
        };
      }
    }

    console.log('        ❌ Bridge removal did not split SCC');
  } else {
    console.log('        No bridge products identified');
  }

  return {
    subSCCs: [sccProducts],
    bridgeRecipes: [],
    decomposed: false,
  };
}

/**
 * ROLE ANALYSIS: Analyze an SCC to identify product roles
 *
 * Products can be:
 * - ENTRY: Mostly fed by ingredients from outside the SCC
 * - EXIT: Mostly consumed by recipes outside the SCC
 * - BRIDGE: Both receives external inputs AND provides to external outputs
 * - INTERNAL: Mostly stays within the SCC
 *
 * Bridge products are potential separation points between functional groups
 */
function analyzeSCCStructureForBridges(
  sccProducts: string[],
  byProduct: { [className: string]: Recipe[] },
): {
  productRoles: Map<
    string,
    {
      role: 'entry' | 'exit' | 'internal' | 'bridge';
      externalIncoming: number;
      internalIncoming: number;
      externalOutgoing: number;
      internalOutgoing: number;
    }
  >;
  bridges: Array<{
    product: string;
    bridgeScore: number;
    stats: any;
  }>;
  entryPoints: string[];
  exitPoints: string[];
} {
  const sccSet = new Set(sccProducts);

  const productRoles = new Map<
    string,
    {
      role: 'entry' | 'exit' | 'internal' | 'bridge';
      externalIncoming: number;
      internalIncoming: number;
      externalOutgoing: number;
      internalOutgoing: number;
    }
  >();

  // STEP 1: Classify each product by analyzing its connections
  sccProducts.forEach((product) => {
    const recipes = byProduct[product] || [];

    let externalIncoming = 0;
    let internalIncoming = 0;

    // Count where this product's ingredients come from
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        if (sccSet.has(ing.className)) {
          internalIncoming++;
        } else {
          externalIncoming++;
        }
      });
    });

    // Count where this product is consumed
    let externalOutgoing = 0;
    let internalOutgoing = 0;

    // Look through ALL recipes in the graph to find ones that consume this product
    Object.values(byProduct)
      .flat()
      .forEach((recipe) => {
        const usesThisProduct = recipe.ingredients.some(
          (ing) => ing.className === product,
        );

        if (usesThisProduct) {
          // Check if the recipe's output is inside or outside the SCC
          const recipeOutput = recipe.products[0].className;
          if (sccSet.has(recipeOutput)) {
            internalOutgoing++;
          } else {
            externalOutgoing++;
          }
        }
      });

    // Classify the product's role based on its connection pattern
    let role: 'entry' | 'exit' | 'internal' | 'bridge';

    if (externalIncoming > 0 && externalOutgoing > 0) {
      // This product connects external inputs to external outputs - it's a BRIDGE
      role = 'bridge';
    } else if (externalIncoming > internalIncoming) {
      // Mostly fed from outside - it's an ENTRY point
      role = 'entry';
    } else if (externalOutgoing > internalOutgoing) {
      // Mostly consumed outside - it's an EXIT point
      role = 'exit';
    } else {
      // Mostly stays within the SCC - it's INTERNAL
      role = 'internal';
    }

    productRoles.set(product, {
      role,
      externalIncoming,
      internalIncoming,
      externalOutgoing,
      internalOutgoing,
    });
  });

  // STEP 2: Identify and score bridge products
  // Higher bridge score = more connections to outside world = better candidate for splitting
  const bridges = Array.from(productRoles.entries())
    .filter(([_, stats]) => stats.role === 'bridge')
    .map(([product, stats]) => ({
      product,
      bridgeScore: stats.externalIncoming + stats.externalOutgoing,
      stats,
    }))
    .sort((a, b) => b.bridgeScore - a.bridgeScore);

  return {
    productRoles,
    bridges,
    entryPoints: Array.from(productRoles.entries())
      .filter(([_, s]) => s.role === 'entry')
      .map(([p, _]) => p),
    exitPoints: Array.from(productRoles.entries())
      .filter(([_, s]) => s.role === 'exit')
      .map(([p, _]) => p),
  };
}

/**
 * BRIDGE REMOVAL: Attempt to split an SCC by removing a bridge product
 *
 * Strategy: Remove all recipes that either produce or consume the bridge product.
 * This simulates "cutting the bridge" between functional groups.
 *
 * For example, removing Empty Canister might separate fuel production from packaging.
 */
function decomposeByRemovingBridgeProduct(
  sccProducts: string[],
  byProduct: { [className: string]: Recipe[] },
  bridgeProduct: string,
): {
  subSCCs: string[][];
  removedRecipes: Recipe[];
} {
  const recipesToRemove = new Set<string>();
  const removedRecipeObjects: Recipe[] = [];

  // Collect all recipes that involve the bridge product
  Object.entries(byProduct).forEach(([product, recipes]) => {
    recipes.forEach((recipe) => {
      // Does this recipe produce the bridge product?
      const producesBridge = recipe.products.some(
        (p) => p.className === bridgeProduct,
      );

      // Does this recipe consume the bridge product?
      const consumesBridge = recipe.ingredients.some(
        (ing) => ing.className === bridgeProduct,
      );

      if (producesBridge || consumesBridge) {
        recipesToRemove.add(recipe.className);
        removedRecipeObjects.push(recipe);
      }
    });
  });

  // Build graph without these recipes and test if SCC splits
  const testGraph = buildGraphWithoutRecipes(
    sccProducts,
    byProduct,
    recipesToRemove,
  );
  const result = findStronglyConnectedComponents(testGraph);

  // Filter to only include sub-SCCs that contain products from the original SCC
  const subSCCs = result.stronglyConnectedComponents.filter((scc) =>
    scc.some((p) => sccProducts.includes(p)),
  );

  return {
    subSCCs,
    removedRecipes: removedRecipeObjects,
  };
}

/**
 * Expand an SCC node to see individual products and their relationships
 */
export function expandSCC(
  graph: CondensationGraph,
  sccNodeId: string,
): CondensationGraph {
  const sccNode = graph.nodes.find((n) => n.id === sccNodeId);

  if (!sccNode || sccNode.type !== 'scc' || !sccNode.products) {
    return graph; // Not an SCC or already expanded
  }

  // Replace SCC meta-node with individual product nodes
  const newNodes = graph.nodes.filter((n) => n.id !== sccNodeId);

  sccNode.products.forEach((className) => {
    const recipes = recipesOrganized.byProduct[className] || [];
    newNodes.push({
      id: className,
      type: 'product',
      name: getProductName(className),
      className,
      recipeCount: recipes.length,
      isCircular: true, // Part of expanded SCC
    });
  });

  // Rebuild edges for expanded products
  // This would add internal SCC edges - implementation depends on desired behavior

  return {
    ...graph,
    nodes: newNodes,
    layout: {
      type: 'dag',
      condensed: false, // Now expanded
    },
  };
}
