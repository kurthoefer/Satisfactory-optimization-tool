/**
 * lib/fields/projectView.ts
 *
 * THE SEAM. One pure function between the domain graph and the renderers.
 * GraphCanvas stops orchestrating domain-into-renderers and starts
 * orchestrating domain-into-projection-into-renderers.
 *
 * Every "spheres of influence" decision is a line in here: merge or line,
 * nucleus charge, which fields are loud, how overlaps render. All of it is a
 * function of live position + attention, which is exactly why it can't live in
 * the domain types.
 *
 * Positions are read straight off the node objects (d3 mutates d.x/d.y in
 * place), so this is called from the tick loop with no separate position map.
 *
 * The first provider (SCC) is co-located here. Extract to providers/ when the
 * second one arrives — not before.
 */

import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';
import type {
  DomainGraph,
  AttentionCtx,
  FieldProvider,
  FieldGroup,
  FieldRelation,
  Nucleus,
  ExceptionalLink,
  ViewModel,
  NodeId,
  PersistenceContext,
} from '@/types/view';
import { hullHue } from '@/utils/fieldGeometry';
import { fieldStore } from './fieldStore';

// ============================================================================
// TUNING
// ============================================================================

const SCC_MAX_GROUPS = 24; // perf cap — largest SCCs win (was HULL_MAX_GROUPS)

/**
 * The "lines carry distance" cutoff. An edge shorter than this is local — the
 * force layout already put its endpoints adjacent, so proximity expresses the
 * relationship and the line is redundant (absorbed into the blobs). Longer
 * than this, the relationship is non-local and proximity CAN'T show it, so it
 * earns a drawn line. Taste knob; raise for a quieter graph.
 */
export const MERGE_THRESHOLD = 140;

/**
 * The single predicate for "does this edge earn a line?" Shared by the
 * projection (to build the ExceptionalLink list) and by the render tick (to
 * toggle link visibility) so the rule has exactly one home. Intra-SCC edges
 * live inside a blob and never draw; local edges are absorbed by proximity.
 */
export function edgeIsExceptional(
  s: GraphNode,
  t: GraphNode,
  threshold: number = MERGE_THRESHOLD,
): boolean {
  const intraSCC = s.sccGroupId !== null && s.sccGroupId === t.sccGroupId;
  if (intraSCC) return false;
  const span = Math.hypot((s.x ?? 0) - (t.x ?? 0), (s.y ?? 0) - (t.y ?? 0));
  return span > threshold;
}

// ============================================================================
// PROVIDERS
// ============================================================================

/**
 * SCC provider. Same bucketing as the original drawHulls: group non-null
 * sccGroupId, largest N win, stable hue per group. This is now just one
 * FieldProvider among a future many — it has no privileged status.
 */
export const sccProvider: FieldProvider = (graph) => {
  const byGroup = new Map<number, GraphNode[]>();
  for (const n of graph.nodes) {
    if (n.sccGroupId === null) continue;
    const arr = byGroup.get(n.sccGroupId);
    if (arr) arr.push(n);
    else byGroup.set(n.sccGroupId, [n]);
  }

  return [...byGroup.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, SCC_MAX_GROUPS)
    .map(([groupId, members]) => ({
      id: `scc:${groupId}`,
      memberIds: new Set(members.map((m) => m.id)),
      hue: hullHue(members),
      source: 'scc' as const,
      salience: 1, // overwritten by resolveSalience below
      collapsed: false, // overwritten from the store below
      label: members.length > 1 ? String(members.length) : undefined,
    }));
};

// ============================================================================
// POLICY HOLES  ——  next conversation
// ============================================================================

/**
 * POLICY HOLE. The entire "loud vs quiet" grammar in one function. How much
 * does a pin brighten? Does hover solo or just lift? For now: constant 1, so
 * the refactor is visually non-regressive (looks like today's build). Wire the
 * real budget here after the structure lands.
 */
function resolveSalience(field: FieldGroup, _ctx: AttentionCtx): number {
  return 1;
}

/**
 * POLICY HOLE. Where occlude-vs-fuse is decided per overlapping pair. occlude
 * is the cheap default (separate filtered groups, composited by paint order);
 * fuse is the deliberate meatball (co-tenant circles in one pass). For now:
 * none — overlaps just occlude via draw order in the renderer.
 */
function deriveRelations(
  _fields: FieldGroup[],
  _graph: DomainGraph,
): FieldRelation[] {
  return [];
}

// ============================================================================
// PROJECTION
// ============================================================================

/** Resolve an edge endpoint to a node (d3 forceLink swaps ids for objects). */
function endpoint(
  v: string | GraphNode,
  byId: Map<NodeId, GraphNode>,
): GraphNode | null {
  if (typeof v === 'string') return byId.get(v) ?? null;
  return v;
}

export interface ProjectOptions {
  providers: FieldProvider[];
  mergeThreshold?: number;
  /** Which frame of importance feeds charge. Default: the chain you're building. */
  context?: PersistenceContext;
}

export function projectView(
  graph: DomainGraph,
  ctx: AttentionCtx,
  opts: ProjectOptions,
): ViewModel {
  const { collapsed, enabled } = fieldStore.getSnapshot();
  const threshold = opts.mergeThreshold ?? MERGE_THRESHOLD;

  const byId = new Map<NodeId, GraphNode>(graph.nodes.map((n) => [n.id, n]));

  // 1. NUCLEI — node as point source; charge (reach) = influence from
  //    node.persistence in the chosen context, normalized 0..1 against the max
  //    in this set (so the biggest body is the most important in-frame). NOT
  //    degree — degree is the layout hub-stabilizer, a different job.
  const contextKey = opts.context ?? 'subgraph';
  let maxScore = 0;
  for (const n of graph.nodes) {
    const s = n.persistence?.[contextKey] ?? 0;
    if (s > maxScore) maxScore = s;
  }
  const nuclei: Nucleus[] = graph.nodes.map((n) => ({
    nodeId: n.id,
    x: n.x ?? 0,
    y: n.y ?? 0,
    charge: maxScore > 0 ? (n.persistence?.[contextKey] ?? 0) / maxScore : 0,
  }));

  // 2. FIELDS — run only lit providers, union output (overlap is fine), then
  //    stamp store-derived collapsed + resolved salience.
  const fields: FieldGroup[] = opts.providers
    .flatMap((p) => p(graph, ctx))
    .filter((f) => enabled.has(f.source))
    .map((f) => {
      const withState = { ...f, collapsed: collapsed.has(f.id) };
      return { ...withState, salience: resolveSalience(withState, ctx) };
    });

  // 3. RELATIONS — how overlapping fields render (occlude default, fuse later).
  const relations = deriveRelations(fields, graph);

  // 4. LINKS — an edge draws ONLY if it earns a line (see edgeIsExceptional):
  //    non-local AND not absorbed by a shared SCC. This is the declutter —
  //    lines become the exception, and the exceptions flag the surprising,
  //    long-range structure (a hub's spokes light up as centrality for free).
  const links: ExceptionalLink[] = [];
  for (const e of graph.edges) {
    const s = endpoint(e.source as string | GraphNode, byId);
    const t = endpoint(e.target as string | GraphNode, byId);
    if (!s || !t) continue;
    if (!edgeIsExceptional(s, t, threshold)) continue;

    links.push({
      edgeId: (e as GraphEdge & { id?: string }).id ?? `${s.id}->${t.id}`,
      sourceId: s.id,
      targetId: t.id,
      span: Math.hypot((s.x ?? 0) - (t.x ?? 0), (s.y ?? 0) - (t.y ?? 0)),
    });
  }

  return { nuclei, fields, relations, links };
}
