/**
 * scripts/buildGameData.ts
 * * The Master Orchestration Script.
 * Transforms raw Satisfactory docs
 * * Usage: npx tsx scripts/buildGameData.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import Parsers
import {
  extractProducts,
  type GameSectionSchema,
} from './parsers/extractProducts';
import { extractRecipes } from './parsers/extractRecipes';

// Import Analysis
import { organizeRecipes } from './analysis/recipeAnalysis';
import { generateTopology } from './analysis/computeLogistics';

async function main() {
  const start = performance.now();
  console.log('🚀 Starting Build Pipeline...\n');

  // --------------------------------------------------------------------------
  // 1. SETUP & PATHS
  // --------------------------------------------------------------------------
  const rootDir = process.cwd();
  const docsPath = path.join(rootDir, '_docs.json');
  const outputDir = path.join(rootDir, 'src', 'data');

  if (!fs.existsSync(docsPath)) {
    console.error('❌ FATAL: _docs.json not found in root directory.');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // --------------------------------------------------------------------------
  // 2. LOAD RAW DATA
  // --------------------------------------------------------------------------
  console.log('📖 Loading _docs.json...');
  const rawDocs = fs.readFileSync(docsPath, 'utf-8');
  // Helper to remove BOM if present (common in UE4 exports)
  const cleanDocs = rawDocs.replace(/^\uFEFF/, '');
  const docsData: GameSectionSchema[] = JSON.parse(cleanDocs);
  console.log(
    `   - Loaded ${(cleanDocs.length / 1024 / 1024).toFixed(2)} MB of data.`,
  );

  // --------------------------------------------------------------------------
  // 3. EXTRACT PRODUCTS
  // --------------------------------------------------------------------------
  console.log('\n📦 Extracting Products...');
  const productsByCategory = extractProducts(docsData);

  // Create a flat list for easy ID lookup later
  const productsFlat = Object.values(productsByCategory).flat();
  console.log(
    `   - Found ${productsFlat.length} products in ${Object.keys(productsByCategory).length} categories.`,
  );

  // --------------------------------------------------------------------------
  // 4. EXTRACT RECIPES
  // --------------------------------------------------------------------------
  console.log('\n📜 Extracting Recipes...');
  const recipesFlat = extractRecipes(docsData);
  console.log(`   - Found ${recipesFlat.length} valid recipes.`);

  // --------------------------------------------------------------------------
  // 5. ANALYZE GRAPH (Structure)
  // --------------------------------------------------------------------------
  console.log('\n🕸️  Analyzing Graph Structure...');
  // This builds the indices (byProduct, byIngredient) and runs Tarjan's Algo
  const recipesOrganized = organizeRecipes(recipesFlat);

  console.log(
    `   - Identified ${recipesOrganized.circularRelationships.stronglyConnectedComponents.length} SCCs (Loops).`,
  );
  console.log(
    `   - ${recipesOrganized.circularRelationships.circularRecipes.length} recipes are involved in loops.`,
  );

  // --------------------------------------------------------------------------
  // 6. GENERATE TOPOLOGY (Metrics + Structure)
  // --------------------------------------------------------------------------
  console.log('\n📐 Generating Topological Manifest...');
  // Calculates throughput and weight (friction) for every edge
  const topology = generateTopology(
    recipesFlat,
    recipesOrganized.circularRelationships,
    productsFlat,
  );

  console.log(`   - Edges Generated: ${topology.edges.length}`);
  console.log(`   - Graph Metadata Embedded.`);

  // --------------------------------------------------------------------------
  // 7. WRITE OUTPUTS
  // --------------------------------------------------------------------------
  console.log('\n💾 Writing Data Files...');

  const write = (filename: string, data: any) => {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const size = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`   ✅ ${filename.padEnd(25)} (${size} KB)`);
  };

  // Product Data
  write('products.json', productsByCategory);
  write('products-flat.json', productsFlat);

  // Recipe Data
  write('recipes.json', recipesFlat);
  write('recipes-organized.json', recipesOrganized);

  // Build the lightweight index for quick lookups
  const recipesIndex = {
    byProduct: Object.fromEntries(
      Object.entries(recipesOrganized.byProduct).map(([k, v]) => [
        k,
        v.map((r) => r.id),
      ]),
    ),
    byIngredient: Object.fromEntries(
      Object.entries(recipesOrganized.byIngredient).map(([k, v]) => [
        k,
        v.map((r) => r.id),
      ]),
    ),
    byMachine: Object.fromEntries(
      Object.entries(recipesOrganized.byMachine).map(([k, v]) => [
        k,
        v.map((r) => r.id),
      ]),
    ),
  };
  write('recipes-index.json', recipesIndex);

  // The Topological Manifest
  write('topology.json', topology);

  const end = performance.now();
  console.log(`\n✨ Build Complete in ${((end - start) / 1000).toFixed(2)}s!`);
}

main().catch((error) => {
  console.error('\n❌ Build Failed:', error);
  process.exit(1);
});
