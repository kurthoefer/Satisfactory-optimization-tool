// ============================================================================
// Product Types
// ============================================================================

export interface ProductSchema {
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

export interface ProductsByCategorySchema {
  [category: string]: ProductSchema[];
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface RecipeIngredientSchema {
  className: string;
  amount: number;
}

export interface RecipeProductSchema {
  className: string;
  amount: number;
}

export interface RecipeSchema {
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

export interface RecipesOrganizedSchema {
  all: RecipeSchema[];
  byProduct: { [className: string]: RecipeSchema[] };
  byIngredient: { [className: string]: RecipeSchema[] };
  byMachine: { [machine: string]: RecipeSchema[] };
  alternates: RecipeSchema[];
}

// ============================================================================
// Recipe Combination Types (for production chain generation)
// ============================================================================

export interface RecipeNodeSchema {
  product: string; // className of the product
  recipe: RecipeSchema;
  ingredients: RecipeNodeSchema[];
}

export interface RecipeCombinationSchema {
  product: string;
  targetAmount: number;
  tree: RecipeNodeSchema;
  allRecipes: RecipeSchema[];
  hasCircularDependency: boolean;
  circularProducts: Set<string>;
}

// ============================================================================
// Game Data Types (raw data from _Docs.json - used in parsers)
// ============================================================================

export interface GameItemSchema {
  ClassName: string;
  mDisplayName?: string;
  mDescription?: string;
  mForm?: string;
  mStackSize?: string;
  mEnergyValue?: string;
  mRadioactiveDecay?: string;
}

export interface GameRecipeSchema {
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
  Classes?: (GameItemSchema | GameRecipeSchema)[];
}

// ============================================================================
// Future: Add your app-specific types below
// ============================================================================

// Example: User preferences
// export interface UserPreferences {
//   theme: 'light' | 'dark';
//   defaultProductionRate: number;
//   showAlternateRecipes: boolean;
// }

// Example: Production line
// export interface ProductionLine {
//   id: string;
//   product: ProductSchema;
//   targetRate: number;
//   selectedRecipe: RecipeSchema;
//   machineCount: number;
// }
