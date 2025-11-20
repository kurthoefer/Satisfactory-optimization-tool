import { useMemo } from 'react';
import { initializeRecipeData } from '../utils/recipeProcessor';
import recipeData from '../data/recipedata.json';

// Only process once on mount
export function useRecipeData() {
  const { recipes, recipeIndex } = useMemo(() => {
    return initializeRecipeData(recipeData);
  }, []);

  return { recipes, recipeIndex };
}
