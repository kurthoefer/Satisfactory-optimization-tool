/**
 * scripts/buildGameData.ts
 * The Master Orchestration Script.
 * Transforms raw Satisfactory docs into runtime data files.
 *
 * Outputs (3 files):
 *   products-flat.json  — All products with category field
 *   recipes.json        — All recipes
 *   topology.json       — Edge manifest with SCCs
 *
 * Runtime grouping/indexing is handled by src/data/indexes.ts
 *
 * Usage: npx tsx scripts/buildGameData.ts
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

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // --------------------------------------------------------------------------
  // 2. LOAD RAW DATA
  // --------------------------------------------------------------------------
  console.log('📖 Loading _docs.json...');
  const rawDocs = fs.readFileSync(docsPath, 'utf-8');
  const cleanDocs = rawDocs.replace(/^\uFEFF/, '');
  const docsData: GameSectionSchema[] = JSON.parse(cleanDocs);
  console.log(
    `   - Loaded ${(cleanDocs.length / 1024 / 1024).toFixed(2)} MB of data.`,
  );

  // --------------------------------------------------------------------------
  // 3. EXTRACT PRODUCTS
  // --------------------------------------------------------------------------
  console.log('\n📦 Extracting Products...');
  const products = extractProducts(docsData);

  // Count categories for logging
  const categoryCount = new Set(products.map((p) => p.category)).size;
  console.log(
    `   - Found ${products.length} products in ${categoryCount} categories.`,
  );

  // --------------------------------------------------------------------------
  // 4. EXTRACT RECIPES
  // --------------------------------------------------------------------------
  console.log('\n📜 Extracting Recipes...');
  const recipes = extractRecipes(docsData);
  console.log(`   - Found ${recipes.length} valid recipes.`);

  // --------------------------------------------------------------------------
  // 5. ANALYZE GRAPH (Structure)
  // --------------------------------------------------------------------------
  console.log('\n🕸️  Analyzing Graph Structure...');
  const recipesOrganized = organizeRecipes(recipes);

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
  const topology = generateTopology(
    recipes,
    recipesOrganized.circularRelationships,
    products,
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

  write('products-flat.json', products);
  write('recipes.json', recipes);
  write('topology.json', topology);

  const end = performance.now();
  console.log(`\n✨ Build Complete in ${((end - start) / 1000).toFixed(2)}s!`);
}

main().catch((error) => {
  console.error('\n❌ Build Failed:', error);
  process.exit(1);
});
