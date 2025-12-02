import type { ProcessedRecipe, RecipeIndex } from '../types';

export interface ProductionNode {
  item: string;
  itemName: string;
  requiredRate: number; // units per minute needed
  recipe: ProcessedRecipe | null;
  machinesNeeded: number;
  ingredients: ProductionNode[];
}

export interface CalculationResult {
  targetProduct: string;
  targetRate: number;
  productionTree: ProductionNode;
  totalMachines: { [machineType: string]: number };
  rawMaterials: { [item: string]: number }; // Items with no recipe (ore, water, etc.)
}

/**
 * Calculate how many machines are needed to produce a target rate
 */
function calculateMachinesNeeded(
  targetRate: number,
  recipeOutputRate: number
): number {
  return Math.ceil(targetRate / recipeOutputRate);
}

/**
 * Recursively calculate production requirements
 */
function calculateProductionNode(
  itemClassName: string,
  requiredRate: number,
  recipeIndex: RecipeIndex,
  selectedRecipes: Map<string, ProcessedRecipe> = new Map(),
  visited: Set<string> = new Set()
): ProductionNode {
  // Get available recipes for this item
  const availableRecipes = recipeIndex[itemClassName] || [];

  // Use user-selected recipe, or default recipe, or null if none available
  let recipe: ProcessedRecipe | null = null;
  if (selectedRecipes.has(itemClassName)) {
    recipe = selectedRecipes.get(itemClassName)!;
  } else if (availableRecipes.length > 0) {
    recipe = availableRecipes.find((r) => !r.alternate) || availableRecipes[0];
  }

  const node: ProductionNode = {
    item: itemClassName,
    itemName: recipe?.name || itemClassName,
    requiredRate,
    recipe,
    machinesNeeded: 0,
    ingredients: [],
  };

  // If no recipe exists, this is a raw material (ore, water, etc.)
  if (!recipe) {
    return node;
  }

  // Find the output rate for this specific product
  const outputInfo = recipe.outputRates.find((o) => o.item === itemClassName);
  if (!outputInfo) {
    return node; // Shouldn't happen, but safety check
  }

  // Calculate machines needed
  node.machinesNeeded = calculateMachinesNeeded(requiredRate, outputInfo.rate);

  // Prevent infinite recursion for circular dependencies
  if (visited.has(itemClassName)) {
    return node;
  }
  visited.add(itemClassName);

  //TODO: Calculate requirements for each ingredient
  // const actualProductionRate = node.machinesNeeded * outputInfo.rate;

  recipe.inputRates.forEach((input) => {
    // Calculate how much of this ingredient we need per minute
    const ingredientRatePerMachine = input.rate;
    const totalIngredientRate = ingredientRatePerMachine * node.machinesNeeded;

    const ingredientNode = calculateProductionNode(
      input.item,
      totalIngredientRate,
      recipeIndex,
      selectedRecipes,
      new Set(visited) // Pass copy of visited set for this branch
    );

    node.ingredients.push(ingredientNode);
  });

  return node;
}

/**
 * Aggregate machine counts from production tree
 */
function aggregateMachineCounts(node: ProductionNode): {
  [machineType: string]: number;
} {
  const counts: { [machineType: string]: number } = {};

  function traverse(n: ProductionNode) {
    if (n.recipe && n.machinesNeeded > 0) {
      const machineType = n.recipe.machineType;
      counts[machineType] = (counts[machineType] || 0) + n.machinesNeeded;
    }
    n.ingredients.forEach(traverse);
  }

  traverse(node);
  return counts;
}

/**
 * Extract raw materials (items with no recipe)
 */
function extractRawMaterials(node: ProductionNode): { [item: string]: number } {
  const materials: { [item: string]: number } = {};

  function traverse(n: ProductionNode) {
    if (!n.recipe) {
      // This is a raw material
      materials[n.item] = (materials[n.item] || 0) + n.requiredRate;
    } else {
      n.ingredients.forEach(traverse);
    }
  }

  traverse(node);
  return materials;
}

/**
 * Main calculator function
 */
export function calculateProduction(
  targetProduct: string,
  targetRate: number,
  recipeIndex: RecipeIndex,
  selectedRecipes: Map<string, ProcessedRecipe> = new Map()
): CalculationResult {
  const productionTree = calculateProductionNode(
    targetProduct,
    targetRate,
    recipeIndex,
    selectedRecipes
  );

  const totalMachines = aggregateMachineCounts(productionTree);
  const rawMaterials = extractRawMaterials(productionTree);

  return {
    targetProduct,
    targetRate,
    productionTree,
    totalMachines,
    rawMaterials,
  };
}

/**
 * Get a flat list of all production steps
 */
export function flattenProductionTree(node: ProductionNode): ProductionNode[] {
  const steps: ProductionNode[] = [];

  function traverse(n: ProductionNode) {
    if (n.recipe) {
      steps.push(n);
    }
    n.ingredients.forEach(traverse);
  }

  traverse(node);
  return steps;
}
