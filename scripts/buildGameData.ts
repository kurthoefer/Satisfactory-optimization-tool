/**
 * scripts/buildGameData.ts
 * The Master Orchestration Script.
 * Transforms raw Satisfactory docs into runtime data files.
 *
 * Outputs (3 files):
 *   products-flat.json  — All products with tier + category
 *   recipes.json        — All recipes with tier (full registry for wiki)
 *   topology.json       — Edge manifest with SCCs + persistence
 *                         (production-chain recipes only)
 *
 * Runtime grouping/indexing is handled by src/data/indexes.ts
 *
 * Usage: npx tsx scripts/buildGameData.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import type { GameSectionSchema } from './types';

// Import Parsers
import { extractProducts } from './parsers/extractProducts';
import { extractRecipes } from './parsers/extractRecipes';
import { extractSchematics } from './parsers/extractSchematics';

// Import Analysis
import { findCircularRelationships } from './analysis/recipeAnalysis';
import { generateTopology } from './analysis/computeLogistics';
import { computePersistence } from './analysis/computePersistence';

// ============================================================================
// PRODUCTION MACHINE FILTER
// ============================================================================

/** Machines that automate production (not BuildGun/Workshop) */
const PRODUCTION_MACHINES = new Set([
  'Smelter',
  'Constructor',
  'Assembler',
  'Manufacturer',
  'Foundry',
  'Refinery',
  'Blender',
  'Packager',
  'Particle Accelerator',
  'Hadron Collider',
  'Quantum Encoder',
  'Converter',
]);

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
  const rawDocs = fs.readFileSync(docsPath, 'utf-16le'); // CHANGED: utf-8 → utf-16le "game engine friendly"
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
  // 5. EXTRACT SCHEMATICS (tier data + recipe registry)
  // --------------------------------------------------------------------------
  console.log('\n🔗 Extracting Schematics...');
  const schematicManifest = extractSchematics(docsData);

  // --------------------------------------------------------------------------
  // 6. ENRICH: Assign tiers from schematic data
  // --------------------------------------------------------------------------
  console.log('\n🏷️  Enriching with tier data...');

  // 6a. Recipe tiers — from schematic resolution
  let recipesEnriched = 0;
  for (const recipe of recipes) {
    const tier = schematicManifest.recipeTier.get(recipe.className) ?? null;
    recipe.tier = tier;
    if (tier !== null) recipesEnriched++;
  }
  console.log(
    `   - Recipes: ${recipesEnriched}/${recipes.length} assigned a tier.`,
  );

  // 6b. Product tiers — min tier across all recipes that produce each product
  const productTierMap = new Map<string, number | null>();
  for (const recipe of recipes) {
    if (recipe.tier === null) continue;
    for (const product of recipe.products) {
      const current = productTierMap.get(product.className);
      if (current === undefined || current === null || recipe.tier < current) {
        productTierMap.set(product.className, recipe.tier);
      }
    }
  }

  let productsEnriched = 0;
  for (const product of products) {
    const tier = productTierMap.get(product.className) ?? null;
    product.tier = tier;
    if (tier !== null) productsEnriched++;
  }
  console.log(
    `   - Products: ${productsEnriched}/${products.length} assigned a tier.`,
  );

  // --------------------------------------------------------------------------
  // 7. FILTER: Production-chain recipes only for topology
  // --------------------------------------------------------------------------
  console.log('\n🔧 Filtering to production-chain recipes...');
  const productionRecipes = recipes.filter((r) =>
    PRODUCTION_MACHINES.has(r.producedIn),
  );
  console.log(
    `   - ${productionRecipes.length} production recipes (of ${recipes.length} total).`,
  );

  // --------------------------------------------------------------------------
  // 8. ANALYZE GRAPH (Circular Dependencies)
  // --------------------------------------------------------------------------
  console.log('\n🕸️  Analyzing Graph Structure...');
  const circularRelationships = findCircularRelationships(productionRecipes);

  console.log(
    `   - Identified ${circularRelationships.stronglyConnectedComponents.length} SCCs (Loops).`,
  );
  console.log(
    `   - ${circularRelationships.circularItems.length} items are involved in loops.`,
  );

  // --------------------------------------------------------------------------
  // 9. GENERATE TOPOLOGY (Metrics + Structure)
  // --------------------------------------------------------------------------
  console.log('\n📐 Generating Topological Manifest...');
  const topology = generateTopology(
    productionRecipes,
    circularRelationships,
    products,
  );

  console.log(`   - Edges Generated: ${topology.edges.length}`);
  console.log(`   - Graph Metadata Embedded.`);

  // --------------------------------------------------------------------------
  // 10. COMPUTE PERSISTENCE (Weighted PageRank)
  // --------------------------------------------------------------------------
  console.log('\n🔬 Computing Persistence Metrics...');
  const { edges, nodeScores } = computePersistence(topology.edges);
  topology.edges = edges;
  topology.nodeScores = nodeScores;

  // --------------------------------------------------------------------------
  // 11. WRITE OUTPUTS
  // --------------------------------------------------------------------------
  console.log('\n💾 Writing Data Files...');

  const write = (filename: string, data: any) => {
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const size = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`   ✅ ${filename.padEnd(25)} (${size} KB)`);
  };

  write('products-flat.json', products);
  write('recipes.json', recipes); // Full registry (all 856), enriched with tiers
  write('topology.json', topology); // Production-chain only

  const end = performance.now();
  console.log(`\n✨ Build Complete in ${((end - start) / 1000).toFixed(2)}s!`);
}

main().catch((error) => {
  console.error('\n❌ Build Failed:', error);
  process.exit(1);
});
