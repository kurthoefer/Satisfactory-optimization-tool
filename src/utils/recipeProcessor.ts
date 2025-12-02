import type {
  ProcessedRecipe,
  Recipe,
  RecipeIndex,
  CircularAnalysis,
} from '../types';

const VALID_MACHINES = [
  'Desc_AssemblerMk1_C',
  'Desc_Blender_C',
  'Desc_ConstructorMk1_C',
  // "Desc_Converter_C",  // Excluded: Creates circular dependencies with resource conversion
  'Desc_GeneratorNuclear_C',
  'Desc_OilRefinery_C',
  'Desc_Packager_C',
  'Desc_SmelterMk1_C',
];

// ============================================================================
// BASE_RESOURCES: True raw/extractable resources only
// These are mined, pumped, or extracted - they have NO production recipes
// ============================================================================
const BASE_RESOURCES = [
  // Solid ores
  'Desc_OreIron_C',
  'Desc_OreCopper_C',
  'Desc_Stone_C',
  'Desc_Coal_C',
  'Desc_OreGold_C', // Caterium Ore
  'Desc_RawQuartz_C',
  'Desc_Sulfur_C',
  'Desc_OreBauxite_C',
  'Desc_OreUranium_C',
  'Desc_SAM_C',
  // Fluids (extracted/pumped)
  'Desc_Water_C',
  'Desc_LiquidOil_C', // Crude Oil
  'Desc_NitrogenGas_C',
];

// ============================================================================
// CIRCULAR_RISK_ITEMS: Items that CAN create circular dependencies
// These have alternate recipes that may reference each other
// We still try to find recipes for them, but handle cycles gracefully
// ============================================================================
const CIRCULAR_RISK_ITEMS = [
  // Oil byproducts (Plastic <-> Rubber via Recycled recipes)
  'Desc_Rubber_C',
  'Desc_Plastic_C',
  'Desc_HeavyOilResidue_C',
  // Acids (can have circular alternate recipes)
  'Desc_SulfuricAcid_C',
  'Desc_NitricAcid_C',
  // Silica chain
  'Desc_Silica_C',
  'Desc_DissolvedSilica_C',
  // Concrete/Cement
  'Desc_Cement_C',
  // Fuel chain (multiple interconnected recipes)
  'Desc_LiquidFuel_C',
  'Desc_Fuel_C',
  'Desc_LiquidTurboFuel_C',
  'Desc_RocketFuel_C',
  'Desc_CompactedCoal_C',
  'Desc_LiquidBiofuel_C',
];

// Check if an item is a true base resource (mined/extracted)
export function isBaseResource(itemClassName: string): boolean {
  return BASE_RESOURCES.includes(itemClassName);
}

// Check if an item is known to cause circular dependencies
export function isCircularRisk(itemClassName: string): boolean {
  return CIRCULAR_RISK_ITEMS.includes(itemClassName);
}

// Packaged items that cause circular dependencies
const PACKAGED_ITEMS = [
  'Desc_FluidCanister_C',
  'Desc_GasTank_C',
  'Desc_PackagedOil_C',
  'Desc_PackagedWater_C',
  'Desc_PackagedNitrogenGas_C',
  'Desc_PackagedIonizedFuel_C',
  'Desc_PackagedRocketFuel_C',
];

/**
 * Check if a recipe is for packaging/unpackaging (causes circular deps)
 */
function isPackagingRecipe(recipe: any): boolean {
  // Check if any product is a packaged item
  const hasPackagedProduct = recipe.products?.some((p: any) =>
    PACKAGED_ITEMS.includes(p.item)
  );

  // Check if any ingredient is a packaged item (unpackaging)
  const hasPackagedIngredient = recipe.ingredients?.some((i: any) =>
    PACKAGED_ITEMS.includes(i.item)
  );

  return hasPackagedProduct || hasPackagedIngredient;
}

/**
 * Filter recipes to only include factory-producible items
 */
export function filterFactoryRecipes(recipeData: any): Recipe[] {
  const allRecipes: Recipe[] = [];

  // Flatten the recipe object structure
  Object.values(recipeData).forEach((recipeArray: any) => {
    if (Array.isArray(recipeArray)) {
      recipeArray.forEach((recipe) => {
        // Only include recipes produced in valid machines
        const hasValidMachine = recipe.producedIn?.some((machine: string) =>
          VALID_MACHINES.includes(machine)
        );

        // Skip packaging recipes to avoid circular dependencies
        const isPackaging = isPackagingRecipe(recipe);

        if (hasValidMachine && !isPackaging) {
          allRecipes.push(recipe);
        }
      });
    }
  });

  return allRecipes;
}

/**
 * Process recipes to calculate rates per minute
 */
export function processRecipes(recipes: Recipe[]): ProcessedRecipe[] {
  return recipes.map((recipe) => {
    const inputRates = recipe.ingredients.map((ingredient) => ({
      item: ingredient.item,
      rate: (ingredient.amount / recipe.duration) * 60,
    }));

    const outputRates = recipe.products.map((product) => ({
      item: product.item,
      rate: (product.amount / recipe.duration) * 60,
    }));

    return {
      ...recipe,
      inputRates,
      outputRates,
      machineType: recipe.producedIn[0], // Use first machine type
    };
  });
}

/**
 * Index recipes by their output products for fast lookup
 */
export function indexRecipesByProduct(recipes: ProcessedRecipe[]): RecipeIndex {
  const index: RecipeIndex = {};

  recipes.forEach((recipe) => {
    recipe.products.forEach((product) => {
      if (!index[product.item]) {
        index[product.item] = [];
      }
      index[product.item].push(recipe);
    });
  });

  return index;
}

/**
 * Find strongly connected components using Tarjan's algorithm
 * Returns groups of items that form circular dependency loops
 */
export function findStronglyConnectedComponents(
  recipeIndex: RecipeIndex
): CircularAnalysis {
  // Tarjan's algorithm state
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Get all items in the graph
  const allItems = new Set<string>();
  Object.keys(recipeIndex).forEach((item) => allItems.add(item));
  Object.values(recipeIndex).forEach((recipes) => {
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => allItems.add(ing.item));
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
    const recipes = recipeIndex[item] || [];
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const successor = ingredient.item;

        if (!indices.has(successor)) {
          // Successor has not yet been visited; recurse
          strongConnect(successor);
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, lowLinks.get(successor)!)
          );
        } else if (onStack.has(successor)) {
          // Successor is in stack and hence in the current SCC
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, indices.get(successor)!)
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

  // Process results
  const itemToSCC = new Map<string, number>();
  const circularItems = new Set<string>();

  sccs.forEach((scc, index) => {
    // An SCC is circular if it has more than 1 item, OR if it has 1 item that depends on itself
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], recipeIndex));

    scc.forEach((item) => {
      itemToSCC.set(item, index);
      if (isCircular) {
        circularItems.add(item);
      }
    });
  });

  // Find which recipes cause circular dependencies
  const circularRecipes = new Set<string>();
  Object.entries(recipeIndex).forEach(([product, recipes]) => {
    if (circularItems.has(product)) {
      recipes.forEach((recipe) => {
        // Check if any ingredient is in the same SCC (creates a cycle)
        const productSCC = itemToSCC.get(product);
        const hasCircularIngredient = recipe.ingredients.some(
          (ing) => itemToSCC.get(ing.item) === productSCC
        );

        if (hasCircularIngredient) {
          circularRecipes.add(recipe.className);
        }
      });
    }
  });

  console.log(`🔍 Tarjan's Algorithm Results:`);
  console.log(`   Total SCCs: ${sccs.length}`);
  console.log(
    `   Circular SCCs: ${
      sccs.filter(
        (scc) =>
          scc.length > 1 ||
          (scc.length === 1 && hasSelfLoop(scc[0], recipeIndex))
      ).length
    }`
  );
  console.log(`   Circular Items: ${circularItems.size}`);
  console.log(`   Circular Recipes: ${circularRecipes.size}`);

  return {
    stronglyConnectedComponents: sccs,
    itemToSCC,
    circularItems,
    circularRecipes,
  };
}

/**
 * Check if an item has a recipe that uses itself as an ingredient
 */
function hasSelfLoop(item: string, recipeIndex: RecipeIndex): boolean {
  const recipes = recipeIndex[item] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.item === item)
  );
}
/**
 * Main initialization function - call this once on app load
 */
export function initializeRecipeData(rawRecipeData: any) {
  console.log('🏭 Initializing recipe data...');

  const filteredRecipes = filterFactoryRecipes(rawRecipeData);
  console.log(`   Filtered recipes: ${filteredRecipes.length}`);

  const processedRecipes = processRecipes(filteredRecipes);
  const recipeIndex = indexRecipesByProduct(processedRecipes);
  console.log(`   Indexed products: ${Object.keys(recipeIndex).length}`);

  // Run Tarjan's algorithm to find circular dependencies
  const circularAnalysis = findStronglyConnectedComponents(recipeIndex);

  return {
    recipes: processedRecipes,
    recipeIndex,
    circularAnalysis,
  };
}

/**
 * Get all recipes that produce a specific item
 */
export function getRecipesForProduct(
  productClassName: string,
  recipeIndex: RecipeIndex
): ProcessedRecipe[] {
  return recipeIndex[productClassName] || [];
}

/**
 * Get the default (non-alternate) recipe for a product
 */
export function getDefaultRecipe(
  productClassName: string,
  recipeIndex: RecipeIndex
): ProcessedRecipe | null {
  const recipes = getRecipesForProduct(productClassName, recipeIndex);
  return recipes.find((r) => !r.alternate) || recipes[0] || null;
}
