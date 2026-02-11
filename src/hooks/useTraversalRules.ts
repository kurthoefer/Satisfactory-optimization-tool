/**
 * useTraversalRules
 *
 * Reads the URL and produces a single config object that drives
 * everything downstream: the graph builder, the sidebar display,
 * and the canvas rendering mode.
 *
 * URL contract:
 *   /visualize/:productSlug?mode=focused&alternates=true&baseResources=false
 *
 * This hook is the ONLY place that reads route params.
 * Everything else consumes the config object it returns.
 */

import { useParams, useSearchParams } from 'react-router-dom';
import { productsBySlug } from '@/data/indexes';

// ============================================================================
// TYPES
// ============================================================================

export type ViewMode = 'focused' | 'bigpicture';

export interface TraversalRules {
  includeAlternates: boolean;
  includeBaseResources: boolean;
}

export interface TraversalConfig {
  /** The className used in topology edges, e.g. "Desc_IronPlate_C" */
  targetClassName: string | null;
  /** The display name for UI chrome, e.g. "Iron Plate" */
  targetName: string | null;
  /** The slug as it appears in the URL, e.g. "iron-plate" */
  targetSlug: string | null;
  /** Render everything (dimmed) or only the focused subgraph */
  viewMode: ViewMode;
  /** Constraints applied during the upstream walk */
  rules: TraversalRules;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_VIEW_MODE: ViewMode = 'focused';
const DEFAULT_INCLUDE_ALTERNATES = false;
const DEFAULT_INCLUDE_BASE_RESOURCES = true;

// ============================================================================
// HOOK
// ============================================================================

export function useTraversalRules(): {
  config: TraversalConfig;
  setViewMode: (mode: ViewMode) => void;
  setRule: (key: keyof TraversalRules, value: boolean) => void;
} {
  const { productSlug } = useParams<{ productSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Resolve target product ---
  const product = productSlug
    ? (productsBySlug.get(productSlug) ?? null)
    : null;

  // --- Read search params with defaults ---
  const viewMode: ViewMode =
    searchParams.get('mode') === 'bigpicture'
      ? 'bigpicture'
      : DEFAULT_VIEW_MODE;

  const includeAlternates =
    searchParams.get('alternates') === 'true' || DEFAULT_INCLUDE_ALTERNATES;

  const includeBaseResources =
    searchParams.get('baseResources') === 'false'
      ? false
      : DEFAULT_INCLUDE_BASE_RESOURCES;

  // --- Build config ---
  const config: TraversalConfig = {
    targetClassName: product?.className ?? null,
    targetName: product?.name ?? null,
    targetSlug: productSlug ?? null,
    viewMode,
    rules: {
      includeAlternates,
      includeBaseResources,
    },
  };

  // --- URL writers ---
  const setViewMode = (mode: ViewMode) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (mode === DEFAULT_VIEW_MODE) {
        next.delete('mode');
      } else {
        next.set('mode', mode);
      }
      return next;
    });
  };

  const setRule = (key: keyof TraversalRules, value: boolean) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      // Only put non-default values in the URL to keep it clean
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

      return next;
    });
  };

  return { config, setViewMode, setRule };
}
