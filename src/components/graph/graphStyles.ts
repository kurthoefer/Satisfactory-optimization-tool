/** Shared visual constants for graph rendering. */

export const NODE_STYLES = {
  product: { radius: 12, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 },
  // Rounded square — keeps recipes visually distinct from product circles.
  recipe: {
    size: 18,
    rx: 3,
    fill: '#f59e0b',
    stroke: '#fff',
    strokeWidth: 1.5,
  },
} as const;

// Muted + low opacity so links recede behind nodes and hulls.
export const LINK_STYLES = {
  stroke: '#64748b',
  opacity: 0.4,
} as const;
