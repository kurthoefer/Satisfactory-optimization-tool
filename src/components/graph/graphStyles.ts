/**
 * graphStyles.ts
 *
 * Shared visual constants for graph rendering.
 * Consumed by renderers and layouts alike.
 * Single source of truth for sizes, colors, and opacities.
 */

// ============================================================================
// NODE STYLES
// ============================================================================

export const NODE_STYLES = {
  product: {
    radius: 12,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 1.5,
  },

  recipe: {
    // Vesica piscis — bounding box roughly 20×10
    // Slightly smaller visual footprint than product circles
    width: 20,
    height: 10,
    fill: '#f59e0b',
    stroke: '#fff',
    strokeWidth: 1.5,
  },
} as const;

// ============================================================================
// LINK STYLES
// ============================================================================

export const LINK_STYLES = {
  stroke: '#94a3b8',
  Opacity: 0.6,
} as const;

// ============================================================================
// SVG PATH GENERATORS
// ============================================================================

/**
 * Vesica piscis (lens / football shape) as an SVG path string.
 *
 * Constructed from two circular arcs that intersect symmetrically.
 * The `width` is tip-to-tip, `height` is the max vertical extent.
 *
 * Centered at (0, 0) so it works directly inside a translated <g>.
 */
export function vesicaPiscisPath(width: number, height: number): string {
  const hw = width / 2; // half-width (tip x-offset)
  const hh = height / 2; // half-height (arc peak)

  // Arc radius derived from the chord (width) and sagitta (half-height).
  // r = (hw² + hh²) / (2 * hh)
  const r = (hw * hw + hh * hh) / (2 * hh);

  // M  → move to left tip
  // A  → arc to right tip (upper curve)
  // A  → arc back to left tip (lower curve)
  // Z  → close
  return [
    `M ${-hw},0`,
    `A ${r},${r} 0 0,1 ${hw},0`,
    `A ${r},${r} 0 0,1 ${-hw},0`,
    'Z',
  ].join(' ');
}

/**
 * Pre-computed path string for recipe nodes at default size.
 * Avoids recalculating on every render.
 */
export const RECIPE_PATH = vesicaPiscisPath(
  NODE_STYLES.recipe.width,
  NODE_STYLES.recipe.height,
);
