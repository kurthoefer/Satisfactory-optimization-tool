import { useMemo } from 'react';
import { initializeRecipeData } from '../utils/recipeProcessor';
import recipeData from '../data/recipedata.json';

export function useRecipeData() {
  const { recipes, recipeIndex } = useMemo(() => {
    return initializeRecipeData(recipeData);
  }, []); // Only process once on mount

  return { recipes, recipeIndex };
}
