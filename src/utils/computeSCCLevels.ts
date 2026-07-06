/**
 * computeSCCLevels
 *
 * Longest-path level for every super-node in the condensation DAG.
 * This is the flow-layout stratifier: the y-band each node sits in.
 *
 *   level(source)          = 0
 *   level(v) for edge u→v  = max over predecessors of (level(u) + 1)
 *
 * So for every condensation edge u→v, level(v) > level(u) strictly — the
 * number climbs along the flow everywhere, never ties, never runs backward.
 * That monotonicity is what makes it a true directed potential (unlike
 * undirected depth, which can go flat or backward across an edge).
 *
 * Cheap by design: it needs NO topological sort. condensation.members is in
 * Tarjan's emission order (reverse-topological), so iterating indices from
 * high to low walks the DAG sources-first — exactly topological order. When we
 * reach a super-node, all its predecessors are already final.
 *
 * Unrooted components (disconnected from base resources) have no incoming
 * condensation edge, so they're never relaxed and land at level 0 — the same
 * band as true sources. That's the agreed behavior: treat the unrooted as raw.
 *
 * Returns an array indexed by superId, parallel to condensation.members.
 */

import type { Condensation } from './detectSCCs';

export function computeSCCLevels(condensation: Condensation): number[] {
  const { members, adjacency } = condensation;
  const level = new Array<number>(members.length).fill(0);

  // High index = source (Tarjan reverse-topological). Descending = topo order.
  for (let u = members.length - 1; u >= 0; u--) {
    const next = level[u] + 1;
    const downstream = adjacency.get(u);
    if (!downstream) continue;
    for (const v of downstream) {
      if (next > level[v]) level[v] = next;
    }
  }

  return level;
}
