import { slugify } from '../../src/utils/slugify';
import type { Product } from '../../src/types';

// Internal Schema for Raw Data
export interface GameItemSchema {
  ClassName: string;
  mDisplayName?: string;
  mDescription?: string;
  mForm?: string;
  mStackSize?: string;
  mEnergyValue?: string;
  mRadioactiveDecay?: string;
  NativeClass: string;
}

export interface GameSectionSchema {
  NativeClass: string;
  Classes?: GameItemSchema[];
}

function categorizeItem(
  item: GameItemSchema,
  nativeClass: string,
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

  return 'Other'; // Fallback
}

/**
 * Extracts and categorizes products from raw game data.
 * Returns a flat Product[] — runtime grouping is handled by indexes.ts.
 */
export function extractProducts(docsData: GameSectionSchema[]): Product[] {
  const products: Product[] = [];

  docsData.forEach((section) => {
    const nativeClass = section.NativeClass;
    if (!nativeClass || !nativeClass.includes('Descriptor')) return;

    section.Classes?.forEach((item) => {
      const category = categorizeItem(item, nativeClass);
      if (!category) return;

      const displayName = item.mDisplayName || '';

      products.push({
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
      });
    });
  });

  // Sort alphabetically
  products.sort((a, b) => a.name.localeCompare(b.name));

  return products;
}
