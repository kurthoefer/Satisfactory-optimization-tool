import ProductionCalculator from '../components/calculator/CalculatorDemo';
import { useRecipeData } from '../hooks/useRecipeData';

export default function Calculator() {
  const { recipes, recipeIndex } = useRecipeData();

  return (
    <div className='calculator-page'>
      <ProductionCalculator
        recipeIndex={recipeIndex}
        recipes={recipes}
      />
    </div>
  );
}
