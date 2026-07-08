/**
 * renderers/drawFields.ts   (replaces drawHulls.ts)
 *
 * Renders FieldGroups as soft merged regions. Two structural changes from the
 * old drawHulls:
 *
 * 1. PRESENTATION vs INTERACTION are different objects.
 *      presentation (.field-goo): the gooey filter blobs. pointer-events: none.
 *      interaction  (.field-hit): ONE closed hull path. pointer-events: all.
 *    The pointer only ever hits the single hull path, so it can't fragment on
 *    the filter's necks — that's the jank fix.
 *
 * 2. Blob radius is CHARGE-DRIVEN. Each member's goo circle is sized from its
 *    normalized persistence (charge), area-proportional (radius ∝ sqrt). A
 *    high-influence node seeds a bigger body — and because a bigger body
 *    overlaps more neighbors, influence literally governs what fuses. "Spheres
 *    of influence" becomes geometry, not decoration. Omit chargeById and it
 *    falls back to a fixed radius (non-regressive).
 *
 * Consumes FieldGroup[] (source-agnostic): it does not know or care whether a
 * field came from an SCC, a collapse, or a selection.
 */

import * as d3 from 'd3';
import type { GraphNode } from '@/types';
import type { FieldGroup, NodeId } from '@/types/view';
import { fieldHitPath, fieldCentroid } from '@/utils/fieldGeometry';

// ============================================================================
// TUNING
// ============================================================================

const GOO_FILTER_ID = 'scc-goo';
const HULL_BLUR = 10;
const HULL_OPACITY = 0.24; // faint fill on the MERGED result
const HULL_SAT = 60;
const HULL_LIGHT = 62;

// Charge -> radius. Area-proportional (radius grows with sqrt of charge), so
// the visual weight of a body tracks influence honestly. Clamped so a dominant
// node can't swell into a blob that swallows the graph.
const BLOB_RADIUS_MIN = 16;
const BLOB_RADIUS_MAX = 42;
const BLOB_RADIUS_FIXED = 26; // fallback when no charge is supplied

// ============================================================================
// TYPES
// ============================================================================

export interface FieldRenderResult {
  update: () => void;
  onCollapse: (handler: (fieldId: string) => void) => void;
}

interface FieldDatum {
  group: FieldGroup;
  members: GraphNode[];
}

// ============================================================================
// RADIUS
// ============================================================================

/** Area-proportional radius from a 0..1 charge, or the fixed fallback. */
function radiusFor(id: NodeId, chargeById?: Map<NodeId, number>): number {
  if (!chargeById) return BLOB_RADIUS_FIXED;
  const c = chargeById.get(id) ?? 0; // already normalized 0..1 by projectView
  return BLOB_RADIUS_MIN + (BLOB_RADIUS_MAX - BLOB_RADIUS_MIN) * Math.sqrt(c);
}

// ============================================================================
// FILTER  (unchanged alpha-clamp from drawHulls.appendGooFilter)
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

  filter
    .append('feColorMatrix')
    .attr('in', 'blur')
    .attr('type', 'matrix')
    .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9');
}

// ============================================================================
// HOVER STYLES  (injected once)
// ============================================================================

/**
 * Because ONLY .field-hit receives pointer events, :hover on the wrapping
 * group is equivalent to "field is hovered" — the affordance cascades with no
 * JS state. The goo brightens; a ring fades in on the hit path.
 */
function ensureFieldStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('field-styles')) return;
  const style = document.createElement('style');
  style.id = 'field-styles';
  style.textContent = `
    .field-goo { pointer-events: none; }
    .field-hit {
      fill: transparent;
      pointer-events: all;
      cursor: pointer;
      stroke: hsl(0 0% 100% / 0);
      stroke-width: 2;
      transition: stroke 150ms ease;
    }
    .field:hover .field-hit { stroke: hsl(0 0% 100% / 0.35); }
    .field:hover .field-goo { filter: url(#${GOO_FILTER_ID}) brightness(1.15); }
    .field-label {
      pointer-events: none;
      fill: hsl(0 0% 100% / 0.85);
      font: 600 13px system-ui, sans-serif;
      text-anchor: middle;
      dominant-baseline: central;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// MAIN
// ============================================================================

/**
 * Idempotent: selects-or-appends its root, so re-calling on a field-set change
 * (collapse/lens toggle, re-projection) diffs via the join instead of
 * duplicating. Draw order: larger fields first (underneath), smaller last (on
 * top) — the more specific field wins occlusion, and later, the click.
 *
 * @param chargeById optional normalized (0..1) charge per node; drives radius.
 */
export function drawFields(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  fields: FieldGroup[],
  nodeById: Map<NodeId, GraphNode>,
  chargeById?: Map<NodeId, number>,
): FieldRenderResult {
  ensureFieldStyles();

  const data: FieldDatum[] = fields
    .map((group) => ({
      group,
      members: [...group.memberIds]
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n != null),
    }))
    .filter((d) => d.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length); // big first (bottom)

  const root = container
    .selectAll<SVGGElement, unknown>('g.fields')
    .data([null]);
  const rootEnter = root.enter().append('g').attr('class', 'fields');
  const fieldsRoot = root.merge(rootEnter);

  const groups = fieldsRoot
    .selectAll<SVGGElement, FieldDatum>('g.field')
    .data(data, (d) => d.group.id)
    .join((enter) => {
      const g = enter.append('g').attr('class', 'field');
      g.append('g')
        .attr('class', 'field-goo')
        .attr('filter', `url(#${GOO_FILTER_ID})`);
      g.append('path').attr('class', 'field-hit');
      g.append('text').attr('class', 'field-label');
      return g;
    });

  groups
    .select<SVGGElement>('g.field-goo')
    .attr('opacity', HULL_OPACITY)
    .attr('fill', (d) => `hsl(${d.group.hue} ${HULL_SAT}% ${HULL_LIGHT}%)`);

  // member circles bound to LIVE node objects; radius from charge (or fixed).
  groups
    .select<SVGGElement>('g.field-goo')
    .selectAll<SVGCircleElement, GraphNode>('circle')
    .data(
      (d) => d.members,
      (n) => n.id,
    )
    .join('circle')
    .attr('r', (n) => radiusFor(n.id, chargeById));

  const update = () => {
    groups.each(function (d) {
      const g = d3.select(this);
      g.selectAll<SVGCircleElement, GraphNode>('circle')
        .attr('cx', (n) => n.x ?? 0)
        .attr('cy', (n) => n.y ?? 0);

      // hit pad scales with the largest member body so the region always hugs
      // the widest part of the goo, not a fixed radius.
      const maxR = d.members.reduce(
        (m, n) => Math.max(m, radiusFor(n.id, chargeById)),
        0,
      );
      g.select<SVGPathElement>('path.field-hit').attr(
        'd',
        fieldHitPath(d.members, maxR * 0.6 + 6),
      );

      const [lx, ly] = fieldCentroid(d.members);
      g.select<SVGTextElement>('text.field-label')
        .attr('x', lx)
        .attr('y', ly)
        .text(d.group.collapsed ? (d.group.label ?? '') : '');
    });
  };

  const onCollapse = (handler: (fieldId: string) => void) => {
    groups.select<SVGPathElement>('path.field-hit').on('click', (_event, d) => {
      handler(d.group.id);
    });
  };

  update();
  return { update, onCollapse };
}

// ----------------------------------------------------------------------------
// FUSION SEAM (parked — deriveRelations feeds this later)
// ----------------------------------------------------------------------------
// Occlusion is already the structural default: each field is its OWN filtered
// <g>, so different fields composite by paint order and never goo together.
// Fusion (the real two-color meatball) renders two fields' circles into ONE
// shared filtered <g> so they merge in a single pass, with a derived neck hue.
// Route `{ kind: 'fuse' }` pairs here when resolveSalience/deriveRelations land.
