export interface RecipeIngredient {
  item: string;
  amount: number;
}

export interface RecipeProduct {
  item: string;
  amount: number;
}

export interface Recipe {
  className: string;
  name: string;
  duration: number;
  ingredients: RecipeIngredient[];
  products: RecipeProduct[];
  producedIn: string[];
  alternate: boolean;
}

export interface ProcessedRecipe extends Recipe {
  // Rates per minute
  inputRates: Array<{ item: string; rate: number }>;
  outputRates: Array<{ item: string; rate: number }>;
  machineType: string;
}

export interface RecipeIndex {
  [productClassName: string]: ProcessedRecipe[];
}
