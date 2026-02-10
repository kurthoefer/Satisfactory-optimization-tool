// /**
//  * generateTopology.ts
//  * Post-processes the parsed recipes to build a logistical metric space.
//  */

//! Deprecated. logic now in "computeLogistics" && file writing now in buildGameData.ts (orchestration)

// import * as fs from 'fs';
// import * as path from 'path';
// import type { Recipe, TopologicalEdge } from '../src/types';

// async function main() {
//   const recipesPath = path.join(process.cwd(), 'src', 'data', 'recipes.json');
//   const outputPath = path.join(
//     process.cwd(),
//     'src',
//     'data',
//     'topological-manifest.json',
//   );

//   if (!fs.existsSync(recipesPath)) {
//     console.error(
//       '❌ Error: recipes.json not found. Run parseRecipes.ts first.',
//     );
//     process.exit(1);
//   }

//   const recipes: Recipe[] = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
//   const edges: TopologicalEdge[] = [];

//   recipes.forEach((recipe) => {
//     // 1. Inbound: Ingredients -> Recipe
//     recipe.ingredients.forEach((ing) => {
//       edges.push({
//         sourceId: ing.className,
//         targetId: recipe.className,
//         throughput: (ing.amount / recipe.time) * 60,
//         weight: recipe.time / ing.amount,
//         persistence: 0, // To be populated by the client-side TDA pass
//       });
//     });

//     // 2. Outbound: Recipe -> Products
//     recipe.products.forEach((prod) => {
//       edges.push({
//         sourceId: recipe.className,
//         targetId: prod.className,
//         throughput: (prod.amount / recipe.time) * 60,
//         weight: recipe.time / prod.amount,
//         persistence: 0,
//       });
//     });
//   });

//   const manifest = {
//     metadata: {
//       generatedAt: new Date().toISOString(),
//       edgeCount: edges.length,
//     },
//     edges,
//   };

//   fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
//   console.log(`✅ Topological Manifest generated with ${edges.length} edges.`);
// }

// main().catch(console.error);
