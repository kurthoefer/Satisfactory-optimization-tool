/**
 * drawHulls.ts
 *
 * Renders each SCC as a soft "soap bubble" enclosure — NOT a convex polygon.
 * Every member gets a circle; a gooey SVG filter (blur + alpha-clamp) fuses
 * overlapping circles into one organic blob per cycle.
 *
 * Each hull gets its OWN color, derived from a stable property of the cycle
 * (its lexicographically-min member id) so the color survives SCC-index
 * reshuffling across filter/target recomputes — a given loop keeps its hue.
 *
 * Pure rendering. Returns update() to reposition member circles each tick.
 */

import * as d3 from 'd3';
import type { GraphNode } from '@/types';

// ============================================================================
// TUNING
// ============================================================================

const GOO_FILTER_ID = 'scc-goo';
const HULL_BLOB_RADIUS = 26;
const HULL_BLUR = 10;
const HULL_OPACITY = 0.24; // faint fill on the MERGED result
const HULL_SAT = 60; // per-hull hue saturation (%)
const HULL_LIGHT = 62; // per-hull hue lightness (%)
const HULL_MAX_GROUPS = 24; // perf cap — largest SCCs win

// ============================================================================
// TYPES
// ============================================================================

export interface HullRenderResult {
  update: () => void;
}

// ============================================================================
// COLOR
// ============================================================================

/**
 * Stable hue for a cycle. Keyed on the min member id (not the SCC index), so
 * the same loop keeps its color across recomputes even as indices reshuffle.
 */
function hullHue(members: GraphNode[]): number {
  let minId = members[0].id;
  for (const m of members) if (m.id < minId) minId = m.id;

  let h = 0;
  for (let i = 0; i < minId.length; i++) {
    h = (h * 31 + minId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

// ============================================================================
// FILTER
// ============================================================================

export function appendGooFilter(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
): void {
  if (!svg.select(`#${GOO_FILTER_ID}`).empty()) return;

  const filter = svg
    .append('defs')
    .append('filter')
    .attr('id', GOO_FILTER_ID)
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%');

  filter
    .append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', HULL_BLUR)
    .attr('result', 'blur');

  // Alpha clamp: steep multiply + offset snaps the feather to a hard edge,
  // fusing overlapping circles into one shape.
  filter
    .append('feColorMatrix')
    .attr('in', 'blur')
    .attr('type', 'matrix')
    .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9');
}

// ============================================================================
// MAIN
// ============================================================================

export function drawHulls(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: GraphNode[],
): HullRenderResult {
  const byGroup = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    if (n.sccGroupId === null) continue;
    const arr = byGroup.get(n.sccGroupId);
    if (arr) arr.push(n);
    else byGroup.set(n.sccGroupId, [n]);
  }

  const hullData = [...byGroup.values()]
    .sort((a, b) => b.length - a.length)
    .slice(0, HULL_MAX_GROUPS);

  const hullsRoot = container.append('g').attr('class', 'hulls');

  // One filtered <g> PER SCC. Fill + opacity live on the group; circles inherit
  // the fill, so the whole blob shares one hue and dims as one merged result.
  const hullGroups = hullsRoot
    .selectAll<SVGGElement, GraphNode[]>('g.hull')
    .data(hullData)
    .join('g')
    .attr('class', 'hull')
    .attr('filter', `url(#${GOO_FILTER_ID})`)
    .attr('opacity', HULL_OPACITY)
    .attr(
      'fill',
      (members) => `hsl(${hullHue(members)} ${HULL_SAT}% ${HULL_LIGHT}%)`,
    );

  const blobs = hullGroups
    .selectAll<SVGCircleElement, GraphNode>('circle')
    .data((members) => members)
    .join('circle')
    .attr('r', HULL_BLOB_RADIUS); // no fill — inherits the group's hue

  const update = () => {
    blobs.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);
  };

  return { update };
}
