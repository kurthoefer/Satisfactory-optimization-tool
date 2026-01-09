/**
 * Parses _Docs.json to extract all Satisfactory products organized by category.
 * Run with: ts-node scripts/parseProducts.ts
 * or: npx tsx scripts/parseProducts.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { slugify } from '../src/utils/slugify.js';

// Schemas
interface GameItemSchema {
  ClassName: string;
  mDisplayName?: string;
  mDescription?: string;
  mForm?: string;
  mStackSize?: string;
  mEnergyValue?: string;
  mRadioactiveDecay?: string;
}

interface GameSectionSchema {
  NativeClass: string;
  Classes?: GameItemSchema[];
}

interface ProductSchema {
  id: string;
  slug: string;
  name: string;
  className: string;
  description: string;
  form: string;
  stackSize: string;
  energyValue: number;
  radioactive: number;
  category: string;
}

interface ProductsByCategorySchema {
  [category: string]: ProductSchema[];
}

// Category determination based on ClassName patterns and NativeClass
function categorizeItem(
  item: GameItemSchema,
  nativeClass: string
): string | null {
  const className = item.ClassName;
  const displayName = item.mDisplayName || '';
  const description = item.mDescription || '';
  const form = item.mForm || '';

  // Skip items without display names
  if (!displayName) return null;

  // Resources (mined directly)
  if (nativeClass === "Class'/Script/FactoryGame.FGResourceDescriptor'") {
    if (form === 'RF_LIQUID') return 'Liquids';
    return 'Resources';
  }

  // Equipment
  if (
    nativeClass === "Class'/Script/FactoryGame.FGEquipmentDescriptor'" ||
    nativeClass === "Class'/Script/FactoryGame.FGConsumableDescriptor'"
  ) {
    return 'Equipment';
  }

  // Ammo
  if (
    className.includes('Cartridge') ||
    className.includes('Nobelisk') ||
    className.includes('Rebar') ||
    description.toLowerCase().includes('ammo for')
  ) {
    return 'Ammo';
  }

  // FICSMAS items
  if (
    className.includes('Xmas') ||
    className.includes('CandyCane') ||
    className.includes('Snowball') ||
    className.includes('Wreath') ||
    className.includes('XmasBall') ||
    className.includes('Gift')
  ) {
    return 'FICSMAS';
  }

  // Liquids
  if (form === 'RF_LIQUID' || className.includes('Liquid')) {
    return 'Liquids';
  }

  // Packaged items
  if (className.includes('Packaged')) {
    return 'Packaged';
  }

  // Ingots
  if (className.includes('Ingot')) {
    return 'Ingots';
  }

  // Ores
  if (className.startsWith('Desc_Ore')) {
    return 'Ores';
  }

  // Nuclear
  if (
    className.includes('Uranium') ||
    className.includes('Plutonium') ||
    className.includes('Nuclear') ||
    description.toLowerCase().includes('radioactive')
  ) {
    return 'Nuclear';
  }

  // Space Elevator Parts
  if (className.includes('SpaceElevatorPart')) {
    return 'Space Elevator Parts';
  }

  // Power/Energy
  if (
    className.includes('Battery') ||
    className.includes('CrystalShard') ||
    className.includes('Power')
  ) {
    return 'Power';
  }

  // Advanced Electronics
  if (
    className.includes('Computer') ||
    className.includes('Circuit') ||
    (className.includes('Crystal') && className.includes('Oscillator')) ||
    className.includes('RadioControl') ||
    className.includes('HighSpeed')
  ) {
    return 'Electronics';
  }

  // Motors and Frames
  if (
    className.includes('Motor') ||
    className.includes('ModularFrame') ||
    className.includes('HeavyModularFrame')
  ) {
    return 'Industrial Parts';
  }

  // Basic Parts
  if (
    className.includes('Plate') ||
    className.includes('Rod') ||
    className.includes('Screw') ||
    className.includes('Wire') ||
    className.includes('Cable') ||
    className.includes('Sheet') ||
    className.includes('Beam') ||
    className.includes('Pipe') ||
    className.includes('Rotor') ||
    className.includes('Stator')
  ) {
    return 'Standard Parts';
  }

  // Materials
  if (
    className.includes('Concrete') ||
    className.includes('Silica') ||
    className.includes('Quartz') ||
    className.includes('Rubber') ||
    className.includes('Plastic') ||
    className.includes('Fabric') ||
    className.includes('Biomass')
  ) {
    return 'Materials';
  }

  // Alien/Special items
  if (
    className.includes('Alien') ||
    className.includes('SAM') ||
    className.includes('Mycelia') ||
    className.includes('Hog') ||
    className.includes('Hatcher') ||
    className.includes('Spitter') ||
    className.includes('Stinger')
  ) {
    return 'Alien';
  }

  return 'Other';
}

// Extract products from game data
function extractProducts(
  docsData: GameSectionSchema[]
): ProductsByCategorySchema {
  const productsByCategory: ProductsByCategorySchema = {};

  docsData.forEach((section) => {
    const nativeClass = section.NativeClass;

    // Only care about descriptors (actual items)
    if (!nativeClass || !nativeClass.includes('Descriptor')) return;

    section.Classes?.forEach((item) => {
      const category = categorizeItem(item, nativeClass);

      if (!category) return;

      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }

      const displayName = item.mDisplayName || '';

      const product: ProductSchema = {
        id: item.ClassName.toLowerCase()
          .replace(/_c$/, '')
          .replace(/^desc_/, ''),
        slug: slugify(displayName),
        name: displayName,
        className: item.ClassName,
        description: item.mDescription || '',
        form: item.mForm || 'RF_SOLID',
        stackSize: item.mStackSize || 'SS_MEDIUM',
        energyValue: parseFloat(item.mEnergyValue || '0'),
        radioactive: parseFloat(item.mRadioactiveDecay || '0'),
        category,
      };

      productsByCategory[category].push(product);
    });
  });

  // Sort each category alphabetically
  Object.keys(productsByCategory).forEach((category) => {
    productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  return productsByCategory;
}

// Main execution
async function main() {
  console.log('Parsing Satisfactory products from _Docs.json...\n');

  // Paths
  const docsPath = path.join(process.cwd(), '_Docs.json');
  const outputDir = path.join(process.cwd(), 'src', 'data');

  // Check if _Docs.json exists
  if (!fs.existsSync(docsPath)) {
    console.error('❌ Error: _Docs.json not found in project root');
    console.error('   Please place _Docs.json in the root directory');
    process.exit(1);
  }

  // Load game data
  const docsData: GameSectionSchema[] = JSON.parse(
    fs.readFileSync(docsPath, 'utf-8')
  );

  // Extract products
  const products = extractProducts(docsData);

  // Statistics
  console.log('Extracted products by category:');
  Object.keys(products)
    .sort()
    .forEach((category) => {
      console.log(`  ${category}: ${products[category].length} items`);
    });

  const totalItems = Object.values(products).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  console.log(
    `\nTotal: ${totalItems} items across ${
      Object.keys(products).length
    } categories\n`
  );

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save products.json (organized by category)
  const productsPath = path.join(outputDir, 'products.json');
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  console.log(`✅ Saved to ${productsPath}`);

  // Save products-flat.json (flat array)
  const flatProducts: ProductSchema[] = [];
  Object.values(products).forEach((categoryProducts) => {
    flatProducts.push(...categoryProducts);
  });

  const flatPath = path.join(outputDir, 'products-flat.json');
  fs.writeFileSync(flatPath, JSON.stringify(flatProducts, null, 2));
  console.log(`✅ Saved to ${flatPath}`);

  console.log('\n✨ Done! Products parsed successfully.');
}

// Run if executed directly
// Check if this file is being run directly (ES module way)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error parsing products:', error);
    process.exit(1);
  });
}

export { extractProducts };
export type { ProductSchema, ProductsByCategorySchema };
