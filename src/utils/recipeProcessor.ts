import type { ProcessedRecipe, Recipe, RecipeIndex } from '../types';

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

// Base resources that should be treated as raw materials (stop recursion)
// Even if they appear as byproducts in recipes
const BASE_RESOURCES = [
  'Desc_Water_C',
  'Desc_OreIron_C',
  'Desc_OreCopper_C',
  'Desc_Stone_C',
  'Desc_Coal_C',
  'Desc_OreGold_C', // Caterium
  'Desc_RawQuartz_C',
  'Desc_Sulfur_C',
  'Desc_OreBauxite_C',
  'Desc_OreUranium_C',
  'Desc_LiquidOil_C', // Crude Oil
  'Desc_NitrogenGas_C',
  'Desc_SAM_C',
  // Items that create circular dependencies due to alternate recipes
  'Desc_Rubber_C',
  'Desc_Plastic_C',
  'Desc_SulfuricAcid_C',
  'Desc_Silica_C',
  'Desc_DissolvedSilica_C',
  'Desc_NitricAcid_C',
  'Desc_Cement_C',
  // Fuel chain items (create circular dependencies)
  'Desc_CompactedCoal_C',
  'Desc_LiquidTurboFuel_C',
  'Desc_RocketFuel_C',
  'Desc_LiquidFuel_C',
  'Desc_Fuel_C',
];

// Check if an item is a base resource
export function isBaseResource(itemClassName: string): boolean {
  return BASE_RESOURCES.includes(itemClassName);
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
 * Main initialization function - call this once on app load
 */
export function initializeRecipeData(rawRecipeData: any) {
  const filteredRecipes = filterFactoryRecipes(rawRecipeData);
  const processedRecipes = processRecipes(filteredRecipes);
  const recipeIndex = indexRecipesByProduct(processedRecipes);

  return {
    recipes: processedRecipes,
    recipeIndex,
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
