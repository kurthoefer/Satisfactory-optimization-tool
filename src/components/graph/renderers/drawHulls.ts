/**
 * drawHulls.ts
 *
 * Renders each SCC as a soft "soap bubble" via a gooey filter (blur +
 * alpha-clamp) that fuses per-member circles into one organic blob. Each hull
 * gets its own stable color (hashed from its min member id).
 *
 * The blob is the collapse affordance: onClick binds a handler to each hull,
 * receiving its SCC group id.
 *
 * Pure rendering. update() repositions member circles each tick.
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
  onClick: (handler: (groupId: number) => void) => void;
}

interface HullDatum {
  groupId: number;
  members: GraphNode[];
}

// ============================================================================
// COLOR
// ============================================================================

/** Stable hue for a cycle, keyed on min member id (survives index reshuffling). */
function hullHue(members: GraphNode[]): number {
  let minId = members[0].id;
  for (const m of members) if (m.id < minId) minId = m.id;

  let h = 0;
  for (let i = 0; i < minId.length; i++) h = (h * 31 + minId.charCodeAt(i)) | 0;
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

  const hullData: HullDatum[] = [...byGroup.entries()]
    .map(([groupId, members]) => ({ groupId, members }))
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, HULL_MAX_GROUPS);

  const hullsRoot = container.append('g').attr('class', 'hulls');

  // One filtered <g> PER SCC. Fill + opacity live on the group; circles inherit
  // the fill, so the whole blob shares one hue and dims as one merged result.
  const hullGroups = hullsRoot
    .selectAll<SVGGElement, HullDatum>('g.hull')
    .data(hullData)
    .join('g')
    .attr('class', 'hull')
    .attr('filter', `url(#${GOO_FILTER_ID})`)
    .attr('opacity', HULL_OPACITY)
    .attr(
      'fill',
      (d) => `hsl(${hullHue(d.members)} ${HULL_SAT}% ${HULL_LIGHT}%)`,
    );

  const blobs = hullGroups
    .selectAll<SVGCircleElement, GraphNode>('circle')
    .data((d) => d.members)
    .join('circle')
    .attr('r', HULL_BLOB_RADIUS);

  const update = () => {
    blobs.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);
  };

  const onClick = (handler: (groupId: number) => void) => {
    hullGroups
      .style('cursor', 'pointer')
      .on('click', (_event, d) => handler(d.groupId));
  };

  return { update, onClick };
}
