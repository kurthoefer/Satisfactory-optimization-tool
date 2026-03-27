/**
 * extractSchematics.ts
 *
 * Parses FGSchematic entries from _docs.json into a complete
 * registry of everything the game unlocks through progression.
 *
 * This is the authoritative source for:
 *   - Which recipes exist in the game
 *   - Which resources become scannable
 *   - Which schematics unlock other schematics
 *   - Tier/progression data for milestone schematics
 *   - Dependency relationships between schematics
 *
 * We extract EVERYTHING — production recipes, building recipes,
 * cosmetics, shop items. Downstream consumers decide what's relevant.
 */

import type { GameSectionSchema } from '../types';

// ============================================================================
// INTERNAL SCHEMA (mirrors _docs.json shape exactly)
// ============================================================================

interface GameSchematicUnlockSchema {
  Class: string;
  mRecipes?: string;
  mSchematics?: string;
  mResourcesToAddToScanner?: string;
  mResourcePairsToAddToScanner?: string;
  mItemsToGive?: string;
  mEmotes?: string;
}

interface GameSchematicDependencySchema {
  Class: string;
  mSchematics?: string;
  mRequireAllSchematicsToBePurchased?: string;
}

interface GameSchematicSchema {
  ClassName: string;
  FullName?: string;
  mType?: string;
  mDisplayName?: string;
  mDescription?: string;
  mTechTier?: string;
  mCost?: string;
  mTimeToComplete?: string;
  mUnlocks?: GameSchematicUnlockSchema[];
  mSchematicDependencies?: GameSchematicDependencySchema[];
  mDependenciesBlocksSchematicAccess?: string;
  mHiddenUntilDependenciesMet?: string;
  mSubCategories?: string;
  mMenuPriority?: string;
  mRelevantEvents?: string;
  mIncludeInBuilds?: string;
}

// export interface GameSectionSchema {
//   NativeClass: string;
//   Classes?: GameSchematicSchema[];
// }

// ============================================================================
// OUTPUT TYPES
// ============================================================================

/** Categorized unlock type */
type UnlockType =
  | 'recipe'
  | 'schematic'
  | 'resource_scan'
  | 'give_item'
  | 'emote'
  | 'info'
  | 'other';

/** A single parsed unlock entry */
export interface SchematicUnlock {
  type: UnlockType;
  classNames: string[];
}

/** A parsed cost ingredient */
export interface SchematicCost {
  className: string;
  amount: number;
}

/** Schematic type mapped from mType strings */
export type SchematicType =
  | 'milestone'
  | 'mam'
  | 'alternate'
  | 'custom'
  | 'resource_sink';

/** A fully parsed schematic */
export interface Schematic {
  className: string;
  fullName: string;
  displayName: string;
  description: string;
  type: SchematicType;
  declaredTier: number;
  cost: SchematicCost[];
  dependencies: {
    schematicClassNames: string[];
    requireAll: boolean;
  } | null;
  unlocks: SchematicUnlock[];
  blocksAccess: boolean;
  hiddenUntilMet: boolean;
}

/** The complete schematic registry */
export interface SchematicManifest {
  /** All schematics keyed by className */
  schematics: Map<string, Schematic>;

  /** Reverse lookup: recipe className → schematic classNames that unlock it */
  recipeToSchematics: Map<string, string[]>;

  /** Reverse lookup: resource className → schematic classNames that make it scannable */
  resourceToSchematics: Map<string, string[]>;

  /** Reverse lookup: schematic className → schematic classNames that unlock it */
  schematicToParents: Map<string, string[]>;

  /** Resolved tiers: recipe className → effective tier (null if unresolvable) */
  recipeTier: Map<string, number | null>;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract classNames from blueprint path strings.
 * Handles Desc_, Recipe_, Schematic_, Research_, and other patterns.
 * ClassNames can contain letters, numbers, underscores, and hyphens.
 *
 * Input:  "(\"/Script/Engine.BlueprintGeneratedClass'/Game/.../Schematic_7-5.Schematic_7-5_C'\",...)"
 * Output: ["Schematic_7-5_C", ...]
 */
function extractClassNames(rawString: string): string[] {
  if (!rawString || rawString === '()' || rawString === '') return [];

  const classNames: string[] = [];
  // Match the final ClassName pattern before a quote:
  // Starts with a letter, then letters/numbers/underscores/hyphens, ends with _C
  const regex = /([A-Za-z][A-Za-z0-9_-]+_C)(?='|")/g;
  let match;

  while ((match = regex.exec(rawString)) !== null) {
    classNames.push(match[1]);
  }

  return classNames;
}

/**
 * Parse mCost string into SchematicCost array.
 *
 * Format: ((ItemClass="...BlueprintGeneratedClass'.../Desc_X.Desc_X_C'",Amount=400),(ItemClass=...))
 *
 * Strategy: split into individual item groups, then extract className
 * and amount from each group independently.
 */
function parseCost(costString?: string): SchematicCost[] {
  if (!costString || costString === '' || costString === '()') return [];

  const costs: SchematicCost[] = [];

  // Split on ),(  to get individual item entries
  const entries = costString.split('),(');

  for (const entry of entries) {
    const classNames = extractClassNames(entry);
    const amountMatch = entry.match(/Amount=(\d+(?:\.\d+)?)/);

    if (classNames.length > 0 && amountMatch) {
      costs.push({
        className: classNames[0],
        amount: parseFloat(amountMatch[1]),
      });
    }
  }

  return costs;
}

/**
 * Map mType string to our SchematicType.
 */
function parseSchematicType(mType?: string): SchematicType {
  switch (mType) {
    case 'EST_Milestone':
      return 'milestone';
    case 'EST_MAM':
      return 'mam';
    case 'EST_Alternate':
      return 'alternate';
    case 'EST_ResourceSink':
      return 'resource_sink';
    case 'EST_Custom':
    default:
      return 'custom';
  }
}

/**
 * Parse a single unlock entry into our UnlockType.
 */
function parseUnlock(raw: GameSchematicUnlockSchema): SchematicUnlock {
  switch (raw.Class) {
    case 'BP_UnlockRecipe_C':
      return {
        type: 'recipe',
        classNames: extractClassNames(raw.mRecipes ?? ''),
      };

    case 'BP_UnlockSchematic_C':
      return {
        type: 'schematic',
        classNames: extractClassNames(raw.mSchematics ?? ''),
      };

    case 'BP_UnlockScannableResource_C': {
      // mResourcePairsToAddToScanner is the consistently populated field
      return {
        type: 'resource_scan',
        classNames: extractClassNames(raw.mResourcePairsToAddToScanner ?? ''),
      };
    }

    case 'BP_UnlockGiveItem_C':
      return {
        type: 'give_item',
        classNames: extractClassNames(raw.mItemsToGive ?? ''),
      };

    case 'BP_UnlockEmote_C':
      return {
        type: 'emote',
        classNames: extractClassNames(raw.mEmotes ?? ''),
      };

    case 'BP_UnlockInfoOnly_C':
      return {
        type: 'info',
        classNames: [],
      };

    default:
      return {
        type: 'other',
        classNames: [],
      };
  }
}

/**
 * Parse the dependency group from mSchematicDependencies.
 */
function parseDependencies(
  raw?: GameSchematicDependencySchema[],
): Schematic['dependencies'] {
  if (!raw || raw.length === 0) return null;

  // Data confirms: always 0 or 1 dependency groups
  const group = raw[0];
  if (!group.mSchematics) return null;

  return {
    schematicClassNames: extractClassNames(group.mSchematics),
    requireAll: group.mRequireAllSchematicsToBePurchased === 'True',
  };
}

// ============================================================================
// TIER RESOLUTION
// ============================================================================

/**
 * Resolve effective tiers for all schematics by walking from
 * milestone anchors through the dependency graph.
 *
 * Resolution strategy (in priority order):
 *   1. Milestones — trust their declared mTechTier (anchors)
 *   2. Dependencies — inherit from mSchematicDependencies (AND = max, OR = min)
 *   3. Parent unlocks — if a milestone/tiered schematic unlocks this one
 *      via BP_UnlockSchematic_C, inherit the parent's tier
 *   4. Orphans with no connections — trust declaredTier as fallback
 *      (catches "Starting Blueprints" at tier 0)
 *
 * Schematics connected only to other untiered schematics remain null.
 */
function resolveTiers(
  schematics: Map<string, Schematic>,
  schematicToParents: Map<string, string[]>,
): Map<string, number | null> {
  const resolved = new Map<string, number | null>();
  const resolving = new Set<string>(); // Cycle detection

  function resolve(className: string): number | null {
    // Already resolved
    if (resolved.has(className)) return resolved.get(className)!;

    // Cycle detection
    if (resolving.has(className)) return null;
    resolving.add(className);

    const schematic = schematics.get(className);
    if (!schematic) {
      resolved.set(className, null);
      resolving.delete(className);
      return null;
    }

    // 1. Milestones are anchors — trust their declared tier
    if (schematic.type === 'milestone') {
      resolved.set(className, schematic.declaredTier);
      resolving.delete(className);
      return schematic.declaredTier;
    }

    // Collect tiers from all available sources
    const candidateTiers: number[] = [];

    // 2. Resolve from mSchematicDependencies
    if (
      schematic.dependencies &&
      schematic.dependencies.schematicClassNames.length > 0
    ) {
      const depTiers: number[] = [];
      for (const depClassName of schematic.dependencies.schematicClassNames) {
        const depTier = resolve(depClassName);
        if (depTier !== null) {
          depTiers.push(depTier);
        }
      }

      if (depTiers.length > 0) {
        const depTier = schematic.dependencies.requireAll
          ? Math.max(...depTiers)
          : Math.min(...depTiers);
        candidateTiers.push(depTier);
      }
    }

    // 3. Resolve from parent schematics (who unlock this via BP_UnlockSchematic_C)
    const parents = schematicToParents.get(className) ?? [];
    for (const parentClassName of parents) {
      const parentTier = resolve(parentClassName);
      if (parentTier !== null) {
        candidateTiers.push(parentTier);
      }
    }

    // If we found any tier from dependencies or parents, use the minimum
    // (earliest path to unlocking this schematic)
    if (candidateTiers.length > 0) {
      const effectiveTier = Math.min(...candidateTiers);
      resolved.set(className, effectiveTier);
      resolving.delete(className);
      return effectiveTier;
    }

    // 4. Orphan fallback — no dependencies, no parents with tiers.
    //    Trust declaredTier if it looks intentional (catches Starting Blueprints etc.)
    //    Only for schematics that truly have no graph connections to milestones.
    const hasDependencies =
      schematic.dependencies &&
      schematic.dependencies.schematicClassNames.length > 0;
    const hasParents = parents.length > 0;

    if (!hasDependencies && !hasParents) {
      // Truly orphaned — use declaredTier as the game designer's intent
      resolved.set(className, schematic.declaredTier);
      resolving.delete(className);
      return schematic.declaredTier;
    }

    // Has connections but none resolved to a tier — untiered
    resolved.set(className, null);
    resolving.delete(className);
    return null;
  }

  // Resolve all schematics
  for (const className of schematics.keys()) {
    resolve(className);
  }

  return resolved;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function extractSchematics(
  docsData: GameSectionSchema[],
): SchematicManifest {
  const schematics = new Map<string, Schematic>();

  // --------------------------------------------------------------------------
  // PHASE 1: Parse all schematic entries
  // --------------------------------------------------------------------------
  const schematicSection = docsData.find((section) =>
    section.NativeClass?.includes('FGSchematic'),
  );

  if (!schematicSection || !schematicSection.Classes) {
    throw new Error('Could not find FGSchematic section in game data');
  }

  // Cast to the internal schema for type-safe field access
  const schematicEntries =
    schematicSection.Classes as unknown as GameSchematicSchema[];

  for (const raw of schematicEntries) {
    if (!raw.ClassName) continue;

    if (raw.mUnlocks && !Array.isArray(raw.mUnlocks)) {
      console.log(
        `⚠️  Non-array mUnlocks on ${raw.ClassName}:`,
        typeof raw.mUnlocks,
        raw.mUnlocks,
      );
    }

    const unlocks = Array.isArray(raw.mUnlocks)
      ? raw.mUnlocks.map(parseUnlock)
      : [];

    const schematic: Schematic = {
      className: raw.ClassName,
      fullName: raw.FullName ?? '',
      displayName: raw.mDisplayName ?? '',
      description: raw.mDescription ?? '',
      type: parseSchematicType(raw.mType),
      declaredTier: parseInt(raw.mTechTier ?? '0', 10),
      cost: parseCost(raw.mCost),
      dependencies: parseDependencies(raw.mSchematicDependencies),
      unlocks: unlocks,
      blocksAccess: raw.mDependenciesBlocksSchematicAccess === 'True',
      hiddenUntilMet: raw.mHiddenUntilDependenciesMet === 'True',
    };

    schematics.set(raw.ClassName, schematic);
  }

  // --------------------------------------------------------------------------
  // PHASE 2: Build reverse lookup maps
  // --------------------------------------------------------------------------
  const recipeToSchematics = new Map<string, string[]>();
  const resourceToSchematics = new Map<string, string[]>();
  const schematicToParents = new Map<string, string[]>();

  for (const [schematicId, schematic] of schematics) {
    for (const unlock of schematic.unlocks) {
      if (unlock.type === 'recipe') {
        for (const recipeClassName of unlock.classNames) {
          const existing = recipeToSchematics.get(recipeClassName);
          if (existing) {
            existing.push(schematicId);
          } else {
            recipeToSchematics.set(recipeClassName, [schematicId]);
          }
        }
      }

      if (unlock.type === 'resource_scan') {
        for (const resourceClassName of unlock.classNames) {
          const existing = resourceToSchematics.get(resourceClassName);
          if (existing) {
            existing.push(schematicId);
          } else {
            resourceToSchematics.set(resourceClassName, [schematicId]);
          }
        }
      }

      if (unlock.type === 'schematic') {
        for (const childClassName of unlock.classNames) {
          const existing = schematicToParents.get(childClassName);
          if (existing) {
            existing.push(schematicId);
          } else {
            schematicToParents.set(childClassName, [schematicId]);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 3: Resolve tiers
  // --------------------------------------------------------------------------
  const schematicTiers = resolveTiers(schematics, schematicToParents);

  // Map recipe classNames to their effective tier:
  // tier = min effective tier across all schematics that unlock the recipe
  const recipeTier = new Map<string, number | null>();

  for (const [recipeClassName, schematicIds] of recipeToSchematics) {
    let minTier: number | null = null;

    for (const schematicId of schematicIds) {
      const tier = schematicTiers.get(schematicId) ?? null;
      if (tier !== null) {
        minTier = minTier === null ? tier : Math.min(minTier, tier);
      }
    }

    recipeTier.set(recipeClassName, minTier);
  }

  // --------------------------------------------------------------------------
  // LOGGING
  // --------------------------------------------------------------------------
  const totalSchematics = schematics.size;
  const typeCounts = new Map<SchematicType, number>();
  for (const s of schematics.values()) {
    typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);
  }

  const tieredRecipes = [...recipeTier.values()].filter(
    (t) => t !== null,
  ).length;
  const untieredRecipes = [...recipeTier.values()].filter(
    (t) => t === null,
  ).length;

  console.log(`   - Parsed ${totalSchematics} schematics:`);
  for (const [type, count] of typeCounts) {
    console.log(`       ${type}: ${count}`);
  }
  console.log(
    `   - Registered ${recipeToSchematics.size} recipes (${tieredRecipes} tiered, ${untieredRecipes} untiered)`,
  );
  console.log(
    `   - Registered ${resourceToSchematics.size} scannable resources`,
  );

  return {
    schematics,
    recipeToSchematics,
    resourceToSchematics,
    schematicToParents,
    recipeTier,
  };
}
