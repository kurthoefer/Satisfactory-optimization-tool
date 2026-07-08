/**
 * types/view.ts
 *
 * The VIEW MODEL: a disposable, position-dependent projection of the domain
 * graph, recomputed each tick. This is the seam that was missing.
 *
 * Domain truth (GraphNode/GraphEdge) is build-time, stable, authoritative.
 * The view model is runtime, derived, throwaway. Whether two fields MERGE,
 * whether an edge survives as a LINE or is absorbed into a blob, how LOUD a
 * field is right now — all of that is a function of live layout position plus
 * attention, and none of it belongs in the domain types. It lives here.
 *
 * Nothing in this file is authored. It is all output of projectView().
 */

import type { GraphNode, GraphEdge } from '@/types';

export type NodeId = string; // GraphNode.id is a string
export type FieldId = string; // e.g. `scc:5`

/**
 * Which frame of importance to read from node.persistence. Influence is
 * contextual: `full` = global across all of Satisfactory, `filtered` = within
 * current tier/milestone constraints, `subgraph` = within the chain reachable
 * from the selected targets. Which one feeds charge is itself a lens.
 */
export type PersistenceContext = 'full' | 'filtered' | 'subgraph';

// ----------------------------------------------------------------------------
// DOMAIN INPUT (what providers + projection read)
// ----------------------------------------------------------------------------

/** The authoritative graph. GraphCanvas maps its `links` -> `edges`. */
export interface DomainGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * The attention snapshot. This is the whole deferral mechanism for "what
 * drives attention": that question is answered by what fills THIS over time,
 * not by the shape of the field system. A new attention layer later becomes a
 * new field in here (and, if it wants to draw, a new provider) — touching
 * nothing else. Read-only; assembled fresh each projection pass.
 */
export interface AttentionCtx {
  readonly pinned: ReadonlySet<NodeId>; // the shelf
  readonly hovered: NodeId | null;
  readonly focus: NodeId | null;
  // NOTE: no rank here. Influence is not attention — it's stable per build and
  // lives on the node as `persistence`. ctx is the transient channel (drives
  // salience/loudness); persistence is the stable channel (drives charge/size).
}

/**
 * SCC is ONE provider. It has no special status — it's just the first one
 * written. Influence-basin, resource-lineage, selection are all this signature.
 */
export type FieldProvider = (
  graph: DomainGraph,
  ctx: AttentionCtx,
) => FieldGroup[];

// ----------------------------------------------------------------------------
// VIEW MODEL OUTPUT (what renderers consume)
// ----------------------------------------------------------------------------

/**
 * A node projected as a point source. charge = influence = body radius.
 * The nucleus stays hard/local (identity, position); the body it seeds is
 * soft/extended (reach, interaction). "Spheres of influence" as a render rule.
 */
export interface Nucleus {
  nodeId: NodeId;
  x: number;
  y: number;
  /**
   * 0..1, normalized influence from node.persistence in the active context.
   * Charge is reach: the renderer maps it to blob radius (area-proportional,
   * radius ∝ sqrt(charge)), so a high-influence node seeds a bigger body — and
   * because a bigger body overlaps more neighbors, influence literally governs
   * what fuses. "Spheres of influence" as a render rule, not a slogan.
   */
  charge: number;
}

export type FieldSource = 'scc' | 'collapse' | 'selection' | 'basin';

/**
 * The presentation primitive: "these fields draw as one merged region."
 * SCC hull, collapse blob, selection cluster, influence basin are all THIS —
 * distinguished only by `source`. Overlapping membership is fine: a node can
 * be in several fields at once because it genuinely is (iron plate is in its
 * lineage AND feeds screws AND may be in an SCC). Sets just intersect.
 */
export interface FieldGroup {
  id: FieldId;
  memberIds: ReadonlySet<NodeId>;
  hue: number;
  source: FieldSource;
  /**
   * 0..1 — the RATIONED budget. Presence is free; loudness is scarce. Twenty
   * fields may exist; salience decides which few are lit. Resolved by the
   * projection (see resolveSalience), NOT authored by the provider.
   */
  salience: number;
  collapsed: boolean;
  label?: string; // count glyph when collapsed ("7")
}

/**
 * The two verbs for two-field relationships.
 *   occlude: coexist — z-ordered, top covers bottom, NO new color. The cheap
 *            default. Ordered (figure/ground), so it doubles as click priority.
 *   fuse:    commingle — a shared neck region with a derived hue. Deliberate,
 *            bounded cost (per chosen pair, not per pixel). The real meatball.
 */
export type FieldRelation =
  | { kind: 'occlude'; over: FieldId; under: FieldId }
  | { kind: 'fuse'; a: FieldId; b: FieldId; hue: number };

/** An edge that survived as a LINE because proximity couldn't express it. */
export interface ExceptionalLink {
  edgeId: string;
  sourceId: NodeId;
  targetId: NodeId;
  span: number; // why it earns a line: it's non-local
}

export interface ViewModel {
  nuclei: Nucleus[];
  fields: FieldGroup[];
  relations: FieldRelation[];
  links: ExceptionalLink[]; // sparse non-local survivors only
}
