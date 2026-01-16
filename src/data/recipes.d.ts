// Type declarations for recipe JSON imports (necessary for ts to interact with JSON correctly)

import type { Recipe, RecipesOrganized } from '@/types';

declare module '@/data/recipes.json' {
  const recipes: Recipe[];
  export default recipes;
}

declare module '@/data/recipes-organized.json' {
  const organized: RecipesOrganized;
  export default organized;
}

declare module '@/data/recipes-index.json' {
  const index: {
    byProduct: { [className: string]: string[] };
    byIngredient: { [className: string]: string[] };
    byMachine: { [machine: string]: string[] };
  };
  export default index;
}
