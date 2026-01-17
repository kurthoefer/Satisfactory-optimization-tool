/**
 * parseRecipes.ts
 *
 * Parses docs.json to extract all Satisfactory recipes.
 * Run with: ts-node scripts/parseRecipes.ts
 * or: npx tsx scripts/parseRecipes.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  Recipe,
  RecipeIngredient,
  RecipesOrganized,
  CircularRelationships,
} from '../src/types';

// Game data schemas (only used during parsing)
interface GameRecipeSchema {
  ClassName: string;
  mDisplayName?: string;
  mIngredients?: string;
  mProduct?: string;
  mManufactoringDuration?: string;
  mManualManufacturingMultiplier?: string;
  mProducedIn?: string;
  mVariablePowerConsumptionConstant?: string;
}

interface GameSectionSchema {
  NativeClass: string;
  Classes?: GameRecipeSchema[];
}

// Helper to extract className from blueprint path
function extractClassName(blueprintPath: string): string | null {
  const match = blueprintPath.match(/Desc_[^.]+_C/);
  return match ? match[0] : null;
}

// Parse ingredient/product strings
function parseItemList(itemString?: string): RecipeIngredient[] {
  if (!itemString || itemString === '()') return [];

  const items: RecipeIngredient[] = [];
  const regex =
    /ItemClass=BlueprintGeneratedClass'([^']+)',Amount=(\d+(?:\.\d+)?)/g;
  let match;

  while ((match = regex.exec(itemString)) !== null) {
    const className = extractClassName(match[1]);
    const amount = parseFloat(match[2]);

    if (className) {
      items.push({ className, amount });
    }
  }

  return items;
}

// Determine recipe type
function getRecipeType(className: string): Recipe['type'] {
  if (className.includes('Alternate')) return 'alternate';
  if (className.includes('Unpackage')) return 'unpackage';
  if (className.includes('Residual')) return 'residual';
  return 'standard';
}

// Determine machine type
function getMachineType(producedIn?: string): string {
  if (!producedIn) return 'Unknown';

  const lower = producedIn.toLowerCase();

  if (lower.includes('buildgun') || lower.includes('workshop')) return 'Manual';
  if (lower.includes('constructor')) return 'Constructor';
  if (lower.includes('assembler')) return 'Assembler';
  if (lower.includes('manufacturer')) return 'Manufacturer';
  if (lower.includes('smelter')) return 'Smelter';
  if (lower.includes('foundry')) return 'Foundry';
  if (lower.includes('refinery') || lower.includes('oilrefinery'))
    return 'Refinery';
  if (lower.includes('blender')) return 'Blender';
  if (lower.includes('packager')) return 'Packager';
  if (lower.includes('particle')) return 'Particle Accelerator';
  if (lower.includes('converter')) return 'Converter';
  if (lower.includes('hadroncollider')) return 'Hadron Collider';
  if (lower.includes('quantumencoder')) return 'Quantum Encoder';

  return 'Unknown';
}

// Extract all recipes
function extractRecipes(docsData: GameSectionSchema[]): Recipe[] {
  const recipes: Recipe[] = [];

  // Find recipe section
  const recipeSection = docsData.find(
    (section) => section.NativeClass === "Class'/Script/FactoryGame.FGRecipe'"
  );

  if (!recipeSection || !recipeSection.Classes) {
    throw new Error('Could not find recipe section in game data');
  }

  recipeSection.Classes.forEach((recipe) => {
    const className = recipe.ClassName;
    const displayName = recipe.mDisplayName;

    // Skip recipes without names
    if (!displayName) return;

    const ingredients = parseItemList(recipe.mIngredients);
    const products = parseItemList(recipe.mProduct);

    // Skip if couldn't parse
    if (ingredients.length === 0 || products.length === 0) return;

    const recipeData: Recipe = {
      id: className
        .toLowerCase()
        .replace(/_c$/, '')
        .replace(/^recipe_/, ''),
      className,
      displayName,
      type: getRecipeType(className),
      ingredients,
      products,
      time: parseFloat(recipe.mManufactoringDuration || '0'),
      producedIn: getMachineType(recipe.mProducedIn),
      isAlternate: className.includes('Alternate'),
      manualMultiplier: parseFloat(
        recipe.mManualManufacturingMultiplier || '1'
      ),
      isVariable: !!recipe.mVariablePowerConsumptionConstant,
    };

    recipes.push(recipeData);
  });

  return recipes;
}

// Helper to check if an item has a self-loop (produces itself as ingredient)
function hasSelfLoop(
  item: string,
  byProduct: { [className: string]: Recipe[] }
): boolean {
  const recipes = byProduct[item] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.className === item)
  );
}

// Tarjan's algorithm to find strongly connected components (circular dependencies)
function findCircularRelationships(byProduct: {
  [className: string]: Recipe[];
}): CircularRelationships {
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

  sccs.forEach((scc, sccIndex) => {
    // An SCC is circular if it has more than 1 item, OR if it has 1 item that depends on itself
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct));

    scc.forEach((item) => {
      itemToSCC.set(item, sccIndex);
      if (isCircular) {
        circularItems.add(item);
      }
    });
  });

  // Find which recipes cause circular dependencies
  const circularRecipes = new Set<string>();
  Object.entries(byProduct).forEach(([product, recipes]) => {
    if (circularItems.has(product)) {
      recipes.forEach((recipe) => {
        // Check if any ingredient is in the same SCC (creates a cycle)
        const productSCC = itemToSCC.get(product);
        const hasCircularIngredient = recipe.ingredients.some(
          (ing) => itemToSCC.get(ing.className) === productSCC
        );

        if (hasCircularIngredient) {
          circularRecipes.add(recipe.className);
        }
      });
    }
  });

  console.log(`\n🔍 Circular Dependency Analysis:`);
  console.log(`   Total SCCs: ${sccs.length}`);
  console.log(
    `   Circular SCCs: ${
      sccs.filter(
        (scc) =>
          scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct))
      ).length
    }`
  );
  console.log(`   Circular Items: ${circularItems.size}`);
  console.log(`   Circular Recipes: ${circularRecipes.size}`);

  return {
    stronglyConnectedComponents: sccs,
    circularItems: Array.from(circularItems),
    circularRecipes: Array.from(circularRecipes),
  };
}

// Organize recipes by various indices
function organizeRecipes(recipes: Recipe[]): RecipesOrganized {
  const byProduct: { [className: string]: Recipe[] } = {};
  const byIngredient: { [className: string]: Recipe[] } = {};
  const byMachine: { [machine: string]: Recipe[] } = {};
  const alternates: Recipe[] = [];

  recipes.forEach((recipe) => {
    // Index by product
    recipe.products.forEach((product) => {
      if (!byProduct[product.className]) {
        byProduct[product.className] = [];
      }
      byProduct[product.className].push(recipe);
    });

    // Index by ingredient
    recipe.ingredients.forEach((ingredient) => {
      if (!byIngredient[ingredient.className]) {
        byIngredient[ingredient.className] = [];
      }
      byIngredient[ingredient.className].push(recipe);
    });

    // Index by machine
    if (!byMachine[recipe.producedIn]) {
      byMachine[recipe.producedIn] = [];
    }
    byMachine[recipe.producedIn].push(recipe);

    // Collect alternates
    if (recipe.isAlternate) {
      alternates.push(recipe);
    }
  });

  // Analyze circular relationships
  const circularRelationships = findCircularRelationships(byProduct);

  return {
    all: recipes,
    byProduct,
    byIngredient,
    byMachine,
    alternates,
    circularRelationships,
  };
}

// Main execution
async function main() {
  console.log('Parsing Satisfactory recipes from _docs.json...\n');

  // Paths
  const docsPath = path.join(process.cwd(), '_docs.json');
  const outputDir = path.join(process.cwd(), 'src', 'data');

  // Check if docs.json exists
  if (!fs.existsSync(docsPath)) {
    console.error('❌ Error: docs.json not found in project root');
    console.error('   Please place docs.json in the root directory');
    process.exit(1);
  }

  // Load game data
  const docsData: GameSectionSchema[] = JSON.parse(
    fs.readFileSync(docsPath, 'utf-8')
  );

  // Extract recipes
  const recipes = extractRecipes(docsData);
  const organized = organizeRecipes(recipes);

  // Statistics
  console.log(`\nTotal recipes: ${recipes.length}`);
  console.log(
    `Standard recipes: ${recipes.filter((r) => !r.isAlternate).length}`
  );
  console.log(`Alternate recipes: ${organized.alternates.length}`);

  console.log('\nRecipes by machine type:');
  Object.entries(organized.byMachine)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([machine, machineRecipes]) => {
      console.log(`  ${machine}: ${machineRecipes.length} recipes`);
    });

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save recipes.json (flat array)
  const recipesPath = path.join(outputDir, 'recipes.json');
  fs.writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));
  console.log(`\n✅ Saved to ${recipesPath}`);

  // Save recipes-organized.json (with indices and circular analysis)
  const organizedPath = path.join(outputDir, 'recipes-organized.json');
  fs.writeFileSync(organizedPath, JSON.stringify(organized, null, 2));
  console.log(`✅ Saved to ${organizedPath}`);

  // Save recipes-index.json (lightweight, just IDs)
  const indexData = {
    byProduct: Object.fromEntries(
      Object.entries(organized.byProduct).map(([key, recipes]) => [
        key,
        recipes.map((r) => r.id),
      ])
    ),
    byIngredient: Object.fromEntries(
      Object.entries(organized.byIngredient).map(([key, recipes]) => [
        key,
        recipes.map((r) => r.id),
      ])
    ),
    byMachine: Object.fromEntries(
      Object.entries(organized.byMachine).map(([key, recipes]) => [
        key,
        recipes.map((r) => r.id),
      ])
    ),
  };

  const indexPath = path.join(outputDir, 'recipes-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`✅ Saved to ${indexPath}`);

  console.log('\n✨ Done! Recipes parsed successfully.');
}

// Run if executed directly
// Check if this file is being run directly (ES module way)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error parsing recipes:', error);
    process.exit(1);
  });
}

export { extractRecipes, organizeRecipes };
export type { Recipe, RecipesOrganized, CircularRelationships };
