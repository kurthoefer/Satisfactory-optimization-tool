import type { Recipe, RecipeIngredient } from '../../src/types';

// Internal Schema
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

export interface GameSectionSchema {
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

  // Automated machines (Priority)
  if (lower.includes('assembler')) return 'Assembler';
  if (lower.includes('constructor')) return 'Constructor';
  if (lower.includes('manufacturer')) return 'Manufacturer';
  if (lower.includes('smelter')) return 'Smelter';
  if (lower.includes('foundry')) return 'Foundry';
  if (lower.includes('oilrefinery')) return 'Refinery';
  if (lower.includes('blender')) return 'Blender';
  if (lower.includes('packager')) return 'Packager';
  if (lower.includes('particle')) return 'Particle Accelerator';
  if (lower.includes('converter')) return 'Converter';
  if (lower.includes('hadroncollider')) return 'Hadron Collider';
  if (lower.includes('quantumencoder')) return 'Quantum Encoder';

  // Manual (Fallback)
  if (lower.includes('buildgun') || lower.includes('workshop')) return 'Manual';

  return 'Unknown';
}

// *Main execution

export function extractRecipes(docsData: GameSectionSchema[]): Recipe[] {
  const recipes: Recipe[] = [];

  // Find recipe section
  const recipeSection = docsData.find(
    (section) => section.NativeClass === "Class'/Script/FactoryGame.FGRecipe'",
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
        recipe.mManualManufacturingMultiplier || '1',
      ),
      isVariable: !!recipe.mVariablePowerConsumptionConstant,
    };

    recipes.push(recipeData);
  });

  return recipes;
}
