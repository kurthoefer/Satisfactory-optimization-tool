/**
 * parseRecipes.ts
 *
 * Parses _Docs.json to extract all Satisfactory recipes.
 * Run with: ts-node scripts/parseRecipes.ts
 * or: npx tsx scripts/parseRecipes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Schemas
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

interface RecipeIngredientSchema {
  className: string;
  amount: number;
}

interface RecipeProductSchema {
  className: string;
  amount: number;
}

interface RecipeSchema {
  id: string;
  className: string;
  displayName: string;
  type: 'standard' | 'alternate' | 'residual' | 'unpackage';
  ingredients: RecipeIngredientSchema[];
  products: RecipeProductSchema[];
  time: number;
  producedIn: string;
  isAlternate: boolean;
  manualMultiplier: number;
  isVariable: boolean;
}

interface RecipesOrganizedSchema {
  all: RecipeSchema[];
  byProduct: { [className: string]: RecipeSchema[] };
  byIngredient: { [className: string]: RecipeSchema[] };
  byMachine: { [machine: string]: RecipeSchema[] };
  alternates: RecipeSchema[];
}

// Helper to extract className from blueprint path
function extractClassName(blueprintPath: string): string | null {
  const match = blueprintPath.match(/Desc_[^.]+_C/);
  return match ? match[0] : null;
}

// Parse ingredient/product strings
function parseItemList(itemString?: string): RecipeIngredientSchema[] {
  if (!itemString || itemString === '()') return [];

  const items: RecipeIngredientSchema[] = [];
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
function getRecipeType(className: string): RecipeSchema['type'] {
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
function extractRecipes(docsData: GameSectionSchema[]): RecipeSchema[] {
  const recipes: RecipeSchema[] = [];

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

    const recipeData: RecipeSchema = {
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

// Organize recipes by various indices
function organizeRecipes(recipes: RecipeSchema[]): RecipesOrganizedSchema {
  const byProduct: { [className: string]: RecipeSchema[] } = {};
  const byIngredient: { [className: string]: RecipeSchema[] } = {};
  const byMachine: { [machine: string]: RecipeSchema[] } = {};
  const alternates: RecipeSchema[] = [];

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

  return {
    all: recipes,
    byProduct,
    byIngredient,
    byMachine,
    alternates,
  };
}

// Main execution
async function main() {
  console.log('Parsing Satisfactory recipes from _Docs.json...\n');

  // Paths
  const docsPath = path.join(process.cwd(), '_Docs.json');
  const outputDir = path.join(process.cwd(), 'src', 'data');

  // Check if _Docs.json exists
  if (!fs.existsSync(docsPath)) {
    console.error('❌ Error: _Docs.json not found in project root');
    console.error('   Please place _Docs.json in the root directory');
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
  console.log(`Total recipes: ${recipes.length}`);
  console.log(
    `Standard recipes: ${recipes.filter((r) => !r.isAlternate).length}`
  );
  console.log(`Alternate recipes: ${organized.alternates.length}\n`);

  console.log('Recipes by machine type:');
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

  // Save recipes-organized.json (with indices)
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
export type { RecipeSchema, RecipesOrganizedSchema };
