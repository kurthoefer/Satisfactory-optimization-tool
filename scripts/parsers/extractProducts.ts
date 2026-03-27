/**
 * extractProducts.ts
 *
 * Discovers products by collecting every className referenced by recipes,
 * then looks up each one in a universal index of all _docs.json entries.
 *
 * This ensures the product list is exactly "everything recipes reference" —
 * no more, no less. No NativeClass guessing or hardcoded section filters.
 *
 * Items not found in _docs.json (28 legacy building classNames) are
 * logged as warnings and skipped.
 */

import { slugify } from '../../src/utils/slugify';
import type { Product } from '../../src/types';
import type { GameSectionSchema } from '../types';

// ============================================================================
// UNIVERSAL INDEX
// ============================================================================

interface IndexEntry {
  raw: Record<string, any>;
  nativeClass: string;
}

/**
 * Build a flat lookup of every className in _docs.json.
 * Scans all sections regardless of NativeClass.
 */
function buildUniversalIndex(
  docsData: GameSectionSchema[],
): Map<string, IndexEntry> {
  const index = new Map<string, IndexEntry>();

  for (const section of docsData) {
    if (!section.Classes) continue;
    for (const item of section.Classes) {
      if (item.ClassName) {
        index.set(item.ClassName, {
          raw: item,
          nativeClass: section.NativeClass,
        });
      }
    }
  }

  return index;
}

// ============================================================================
// COLLECT RECIPE-REFERENCED PRODUCTS
// ============================================================================

/**
 * Scan FGRecipe section for every Desc_*_C className
 * appearing in ingredients or products.
 */
function collectReferencedProducts(docsData: GameSectionSchema[]): Set<string> {
  const recipeSection = docsData.find((s) =>
    s.NativeClass?.includes('FGRecipe'),
  );

  if (!recipeSection?.Classes) return new Set();

  const referenced = new Set<string>();
  const regex = /Desc_[A-Za-z0-9_-]+_C/g;

  for (const recipe of recipeSection.Classes) {
    for (const m of (recipe.mIngredients || '').matchAll(regex)) {
      referenced.add(m[0]);
    }
    for (const m of (recipe.mProduct || '').matchAll(regex)) {
      referenced.add(m[0]);
    }
  }

  return referenced;
}

// ============================================================================
// CATEGORIZATION
// ============================================================================

/**
 * Assign a category based on the item's NativeClass.
 * NativeClass is the game engine's authoritative type declaration.
 * Falls back to className pattern matching for FGItemDescriptor
 * and FGBuildingDescriptor which contain mixed item types.
 */
function categorize(nativeClass: string, raw: Record<string, any>): string {
  // Specific NativeClasses → direct category
  if (nativeClass.includes('FGResourceDescriptor')) return 'Resources';
  if (nativeClass.includes('FGAmmoType')) return 'Ammo';
  if (nativeClass.includes('FGEquipmentDescriptor')) return 'Equipment';
  if (nativeClass.includes('FGConsumableDescriptor')) return 'Consumables';
  if (nativeClass.includes('FGVehicleDescriptor')) return 'Vehicles';
  if (nativeClass.includes('FGItemDescriptorBiomass')) return 'Biomass';
  if (nativeClass.includes('FGItemDescriptorNuclearFuel')) return 'Nuclear';
  if (nativeClass.includes('FGPowerShardDescriptor')) return 'Power';
  if (nativeClass.includes('FGItemDescriptorPowerBoosterFuel')) return 'Power';
  if (nativeClass.includes('FGBuildingDescriptor')) return 'Buildings';

  // FGItemDescriptor is the catch-all — subcategorize by className
  const className = raw.ClassName || '';
  const form = raw.mForm || '';

  if (form === 'RF_LIQUID' || form === 'RF_GAS') return 'Fluids';
  if (className.includes('Ingot')) return 'Ingots';
  if (className.includes('Ore')) return 'Ores';
  if (className.includes('Packaged')) return 'Packaged';
  if (className.includes('SpaceElevatorPart')) return 'Space Elevator';
  if (
    className.includes('Nuclear') ||
    className.includes('Uranium') ||
    className.includes('Plutonium')
  )
    return 'Nuclear';
  if (
    className.includes('Computer') ||
    className.includes('Circuit') ||
    className.includes('HighSpeed')
  )
    return 'Electronics';
  if (className.includes('Motor') || className.includes('ModularFrame'))
    return 'Industrial';
  if (
    className.includes('Plate') ||
    className.includes('Rod') ||
    className.includes('Screw') ||
    className.includes('Wire') ||
    className.includes('Cable')
  )
    return 'Standard Parts';

  return 'Other';
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function extractProducts(docsData: GameSectionSchema[]): Product[] {
  // Step 1: Index everything in _docs.json
  const universalIndex = buildUniversalIndex(docsData);

  // Step 2: Collect every product className that recipes reference
  const referenced = collectReferencedProducts(docsData);

  // Step 3: Look up each referenced product and build Product entries
  const products: Product[] = [];
  let found = 0;
  let missing = 0;

  for (const className of referenced) {
    const entry = universalIndex.get(className);

    if (!entry) {
      missing++;
      continue;
    }

    found++;
    const { raw, nativeClass } = entry;
    const displayName = raw.mDisplayName || '';

    // Skip items with no display name (some building descriptors)
    if (!displayName) {
      continue;
    }

    products.push({
      id: className
        .toLowerCase()
        .replace(/_c$/, '')
        .replace(/^desc_/, ''),
      slug: slugify(displayName),
      name: displayName,
      className,
      description: raw.mDescription || '',
      form: raw.mForm || 'RF_SOLID',
      stackSize: raw.mStackSize || 'SS_MEDIUM',
      energyValue: parseFloat(raw.mEnergyValue || '0'),
      radioactive: parseFloat(raw.mRadioactiveDecay || '0'),
      category: categorize(nativeClass, raw),
      tier: null, // Enriched later by buildGameData from schematic data
    });
  }

  // Sort alphabetically
  products.sort((a, b) => a.name.localeCompare(b.name));

  console.log(
    `   - Resolved ${found}/${referenced.size} referenced products (${missing} orphaned).`,
  );

  return products;
}
