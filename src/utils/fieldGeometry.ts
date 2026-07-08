/**
 * utils/fieldGeometry.ts
 *
 * Pure, stateless geometry for fields. No d3 selections, no state — just
 * math in, string/number out.
 *
 *   hullHue      — stable per-field color
 *   fieldHitPath — the ONE closed region that catches the pointer, decoupled
 *                  from the goo so hit-testing never fragments on filter necks
 */

import * as d3 from 'd3';
import type { GraphNode } from '@/types';

/**
 * Stable hue for a field, keyed on min member id (survives index reshuffling).
 * Unchanged from the original drawHulls.hullHue — same hash, same result, so
 * existing SCC colors are preserved exactly across the refactor.
 */
export function hullHue(members: GraphNode[]): number {
  if (members.length === 0) return 0;
  let minId = members[0].id;
  for (const m of members) if (m.id < minId) minId = m.id;

  let h = 0;
  for (let i = 0; i < minId.length; i++) h = (h * 31 + minId.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** Full-circle SVG path (fallback for fields too small to have a polygon hull). */
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;
}

const smooth = d3
  .line<[number, number]>()
  .curve(d3.curveCatmullRomClosed.alpha(0.5)); // rounded corners that read like the blob

/**
 * ONE closed path enclosing every member — the INTERACTION surface.
 *
 * Convex (not the exact metaball isocontour) on purpose: cheap, stable per
 * tick, and forgiving — clicking slightly into a concavity still hits, which
 * is better UX, not worse. Small cases fall back to a padded circle so a null
 * hull never silently drops the click target.
 *
 * @param pad pushed outward from each center (~ blob radius + a click margin)
 */
export function fieldHitPath(members: GraphNode[], pad: number): string {
  const pts = members.map((m) => [m.x ?? 0, m.y ?? 0] as [number, number]);

  if (pts.length === 0) return '';
  if (pts.length === 1) return circlePath(pts[0][0], pts[0][1], pad);
  if (pts.length === 2) {
    // capsule approximated by the bounding circle — good enough for a hit region
    const [a, b] = pts;
    const cx = (a[0] + b[0]) / 2;
    const cy = (a[1] + b[1]) / 2;
    const r = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 + pad;
    return circlePath(cx, cy, r);
  }

  const hull = d3.polygonHull(pts);
  if (!hull) return circlePath(pts[0][0], pts[0][1], pad); // collinear/degenerate

  const [cx, cy] = d3.polygonCentroid(hull);
  // push each vertex outward along its ray so the region hugs the goo's edge,
  // not the bare centers
  const expanded = hull.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * pad, y + (dy / len) * pad] as [number, number];
  });

  return smooth(expanded) ?? '';
}

/** Centroid of members' live positions — for label placement. */
export function fieldCentroid(members: GraphNode[]): [number, number] {
  let cx = 0;
  let cy = 0;
  for (const m of members) {
    cx += m.x ?? 0;
    cy += m.y ?? 0;
  }
  const n = members.length || 1;
  return [cx / n, cy / n];
}
