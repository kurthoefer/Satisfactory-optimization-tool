/**
 * useTraversalRules
 *
 * Reads the URL and produces a single config object that drives
 * everything downstream: the graph builder, the sidebar display,
 * persistence computation, and the canvas rendering.
 *
 * Also enforces constraints between the selected product and filters:
 *   - If maxTier is lower than the selected product's tier,
 *     the config auto-corrects upward and emits a warning.
 *   - constraints.minTier tells the UI which tier options to disable.
 *
 * URL contract:
 *   /visualize/:productSlug?alternates=true&converter=false&maxTier=5
 *
 * This hook is the ONLY place that reads route params.
 * Everything else consumes the config object it returns.
 */

import { useParams, useSearchParams } from 'react-router-dom';
import { productsBySlug } from '@/data/indexes';
import type { Product } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface TraversalRules {
  includeAlternates: boolean;
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

export interface TraversalConstraints {
  /** Minimum selectable tier given the current product. 0 if no product selected. */
  minTier: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_INCLUDE_ALTERNATES = false;
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
  constraints: TraversalConstraints;
  warning: string | null;
  selectedProduct: Product | null;
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

  const includeConverter =
    searchParams.get('converter') === 'false'
      ? false
      : DEFAULT_INCLUDE_CONVERTER;

  const maxTierParam = searchParams.get('maxTier');
  let maxTier: number | null =
    maxTierParam !== null ? parseInt(maxTierParam, 10) : DEFAULT_MAX_TIER;

  // --- Constraint: product requires a minimum tier ---
  const minTier = product?.tier ?? 0;
  let warning: string | null = null;

  if (maxTier !== null && product?.tier != null && maxTier < product.tier) {
    warning = `Tier adjusted to ${product.tier} — ${product.name} requires at least tier ${product.tier}`;
    maxTier = product.tier;
  }

  // --- Build config (uses corrected maxTier) ---
  const config: TraversalConfig = {
    targetClassName: product?.className ?? null,
    targetName: product?.name ?? null,
    targetSlug: productSlug ?? null,
    rules: {
      includeAlternates,
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

  return {
    config,
    setRule,
    constraints: { minTier },
    warning,
    selectedProduct: product,
  };
}
