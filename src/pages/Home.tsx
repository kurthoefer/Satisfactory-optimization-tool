// import { getAllProductionCombinations } from '../utils/recipeCombinations';

import ProductionCalculator from '../components/calculator/CalculatorDemo';
import { useRecipeData } from '../hooks/useRecipeData';

export default function Home() {
  const { recipes, recipeIndex } = useRecipeData();

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
    <div>
      <h1>Satisfactory Factory Planner</h1>
      <ProductionCalculator
        recipeIndex={recipeIndex}
        recipes={recipes}
      />
    </div>
  );
}
/******************************
 ** version with some flavor: **
 ******************************/
// return (

// <div className='home-page'>
//   <section className='hero-section'>
//     <h1>Satisfactory Factory Planner</h1>
//     <p>Plan your production lines and optimize resource usage</p>
//   </section>

//   <section className='calculator-section'>
//     <ProductionCalculator
//       recipeIndex={recipeIndex}
//       recipes={recipes}
//     />
//   </section>

//   {/* Featured blueprints section for later */}
//   {/* <section className="featured-blueprints">
//     <h2>Featured Blueprints</h2>
//     <p>Coming soon...</p>
//   </section> */}
// </div>
//   );
// }

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
