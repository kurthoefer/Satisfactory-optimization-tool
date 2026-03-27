/**
 * useTraversalRules
 *
 * Reads the URL and produces a single config object that drives
 * everything downstream: the graph builder, the sidebar display,
 * persistence computation, and the canvas rendering.
 *
 * URL contract:
 *   /visualize/:productSlug?alternates=true&converter=false&maxTier=5&baseResources=false
 *
 * This hook is the ONLY place that reads route params.
 * Everything else consumes the config object it returns.
 */

import { useParams, useSearchParams } from 'react-router-dom';
import { productsBySlug } from '@/data/indexes';

// ============================================================================
// TYPES
// ============================================================================

export interface TraversalRules {
  includeAlternates: boolean;
  includeBaseResources: boolean;
  includeConverter: boolean;
  maxTier: number | null; // null = unlimited
}

export interface TraversalConfig {
  /** The className used in topology edges, e.g. "Desc_IronPlate_C" */
  targetClassName: string | null;
  /** The display name for UI chrome, e.g. "Iron Plate" */
  targetName: string | null;
  /** The slug as it appears in the URL, e.g. "iron-plate" */
  targetSlug: string | null;
  /** Constraints applied during the upstream walk AND persistence computation */
  rules: TraversalRules;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_INCLUDE_ALTERNATES = false;
const DEFAULT_INCLUDE_BASE_RESOURCES = true;
const DEFAULT_INCLUDE_CONVERTER = true;
const DEFAULT_MAX_TIER: number | null = null;

// ============================================================================
// HOOK
// ============================================================================

export function useTraversalRules(): {
  config: TraversalConfig;
  setRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
} {
  const { productSlug } = useParams<{ productSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Resolve target product ---
  const product = productSlug
    ? (productsBySlug.get(productSlug) ?? null)
    : null;

  // --- Read search params with defaults ---
  const includeAlternates =
    searchParams.get('alternates') === 'true' || DEFAULT_INCLUDE_ALTERNATES;

  const includeBaseResources =
    searchParams.get('baseResources') === 'false'
      ? false
      : DEFAULT_INCLUDE_BASE_RESOURCES;

  const includeConverter =
    searchParams.get('converter') === 'false'
      ? false
      : DEFAULT_INCLUDE_CONVERTER;

  const maxTierParam = searchParams.get('maxTier');
  const maxTier: number | null =
    maxTierParam !== null ? parseInt(maxTierParam, 10) : DEFAULT_MAX_TIER;

  // --- Build config ---
  const config: TraversalConfig = {
    targetClassName: product?.className ?? null,
    targetName: product?.name ?? null,
    targetSlug: productSlug ?? null,
    rules: {
      includeAlternates,
      includeBaseResources,
      includeConverter,
      maxTier,
    },
  };

  // --- URL writer ---
  const setRule = <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (key === 'includeAlternates') {
        value !== DEFAULT_INCLUDE_ALTERNATES
          ? next.set('alternates', String(value))
          : next.delete('alternates');
      }

      if (key === 'includeBaseResources') {
        value !== DEFAULT_INCLUDE_BASE_RESOURCES
          ? next.set('baseResources', String(value))
          : next.delete('baseResources');
      }

      if (key === 'includeConverter') {
        value !== DEFAULT_INCLUDE_CONVERTER
          ? next.set('converter', String(value))
          : next.delete('converter');
      }

      if (key === 'maxTier') {
        value !== DEFAULT_MAX_TIER
          ? next.set('maxTier', String(value))
          : next.delete('maxTier');
      }

      return next;
    });
  };

  return { config, setRule };
}
