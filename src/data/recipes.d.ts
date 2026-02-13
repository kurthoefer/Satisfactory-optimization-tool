import type { Recipe } from '@/types';

declare module '@/data/recipes.json' {
  const recipes: Recipe[];
  export default recipes;
}
