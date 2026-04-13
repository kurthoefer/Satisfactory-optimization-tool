/**
 * Inspect SCCs and converter recipe involvement
 * Run: npx tsx scripts/debugSCCs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TopologicalManifest } from '../src/types';

const topologyPath = path.join(process.cwd(), 'src', 'data', 'topology.json');
const topology = JSON.parse(
  fs.readFileSync(topologyPath, 'utf-8'),
) as TopologicalManifest;

console.log(`Total SCCs: ${topology.sccs.length}\n`);

for (let i = 0; i < topology.sccs.length; i++) {
  const scc = topology.sccs[i];
  console.log(`═══ SCC ${i} (${scc.length} members) ═══`);

  // Separate products and recipes
  const recipes = scc.filter((id) => id.startsWith('Recipe_'));
  const products = scc.filter((id) => !id.startsWith('Recipe_'));

  // Check for converter recipes
  const converterRecipes = recipes.filter((id) =>
    id.includes('Limestone_Sulfur') ||
    id.includes('Iron_Limestone') ||
    id.includes('Coal_Iron') ||
    id.includes('Coal_Limestone') ||
    id.includes('Sulfur_Coal') ||
    id.includes('Sulfur_Iron') ||
    id.includes('Quartz_Bauxite') ||
    id.includes('Quartz_Coal') ||
    id.includes('Copper_Quartz') ||
    id.includes('Copper_Sulfur') ||
    id.includes('Caterium_Copper') ||
    id.includes('Caterium_Quartz') ||
    id.includes('Bauxite_Caterium') ||
    id.includes('Bauxite_Copper') ||
    id.includes('Nitrogen_Bauxite') ||
    id.includes('Nitrogen_Caterium') ||
    id.includes('Uranium_Bauxite'),
  );

  console.log(`  Products: ${products.length}`);
  console.log(`  Recipes: ${recipes.length}`);
  console.log(`  Converter recipes: ${converterRecipes.length}`);

  if (converterRecipes.length > 0) {
    console.log(`  Converter recipes found:`);
    for (const r of converterRecipes) {
      console.log(`    ${r}`);
    }
  }

  // Show a sample of non-converter members
  const nonConverter = scc.filter(
    (id) => !converterRecipes.includes(id),
  );
  console.log(`  Sample non-converter members (first 10):`);
  for (const id of nonConverter.slice(0, 10)) {
    const depth = topology.nodeDepths[id];
    console.log(`    ${id} (depth ${depth})`);
  }

  console.log('');
}
