import ProductionCalculator from '../components/calculator/ProductionCalculator';
import { useRecipeData } from '../hooks/useRecipeData';

export default function Home() {
  const { recipes, recipeIndex, circularAnalysis } = useRecipeData();

  /***********************
   ** DEBUG EARLY LOGING**
   **********************/
  // const bauxiteRecipes = recipeIndex['Desc_OreBauxite_C'];
  // console.log('Bauxite recipes:', bauxiteRecipes);
  // const ironOreRecipes = recipeIndex['Desc_OreIron_C'];
  // console.log('Iron ore recipes:', ironOreRecipes);
  // const waterRecipes = recipeIndex['Desc_Water_C'];
  // console.log('Water recipes', waterRecipes);
  // console.log('recipes:', recipes);

  // console.log('Total recipes:', recipes.length);
  // console.log('Products with recipes:', Object.keys(recipeIndex).length);
  console.log('recipeIndex:', recipeIndex);

  /***********************/

  return (
    <div className='p-8'>
      <div className='text-center mb-8'>
        <h1 className='text-4xl mb-4 text-orange-500'>
          Satisfactory Factory Planner
        </h1>
        <p className='text-gray-400'>
          Plan your production lines and optimize resource usage
        </p>
      </div>

      <ProductionCalculator
        recipeIndex={recipeIndex}
        recipes={recipes}
        circularAnalysis={circularAnalysis}
      />
    </div>
  );
}

/**************************
 ** DEBUG SUBSTITUTE PAGE **
 **************************/

// <div>
//   <h1>Debug Mode</h1>
//   <button
//     onClick={() => {
//       const testProduct = 'Desc_IronPlate_C'; // Try a simple product
//       console.log('Testing:', testProduct);
//       const combos = getAllProductionCombinations(testProduct, recipeIndex);
//       console.log('Combinations found:', combos.length);
//     }}
//   >
//     Test Simple Product
//   </button>
// </div>
