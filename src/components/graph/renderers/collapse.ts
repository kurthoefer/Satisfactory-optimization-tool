/**
 * collapse.ts
 *
 * SCC collapse as a fx/fy convergence, not a data rebuild. Collapsing pins
 * every member to their shared centroid (same mechanism as drag), so the hull
 * shrinks to one bubble, intra-edges vanish, and external edges converge — all
 * via the existing tick loop. Expanding clears the pins and lets them spring
 * back. State is local to one render (resets on structural rebuild).
 */

import type * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@/types';
import type { NodeSelection } from './drawNodes';

export interface CollapseController {
  toggle: (groupId: number) => void;
}

export function createCollapseController(
  nodes: GraphNode[],
  nodeSelection: NodeSelection,
  simulation: d3.Simulation<GraphNode, GraphEdge>,
  targetId: string | null,
): CollapseController {
  const groups = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    if (n.sccGroupId === null) continue;
    const arr = groups.get(n.sccGroupId);
    if (arr) arr.push(n);
    else groups.set(n.sccGroupId, [n]);
  }

  const collapsed = new Set<number>();

  const apply = () => {
    for (const [groupId, members] of groups) {
      if (collapsed.has(groupId)) {
        // Pin all members to their current centroid → converge to one point.
        let cx = 0;
        let cy = 0;
        for (const m of members) {
          cx += m.x ?? 0;
          cy += m.y ?? 0;
        }
        cx /= members.length;
        cy /= members.length;
        for (const m of members) {
          m.fx = cx;
          m.fy = cy;
        }
      } else {
        for (const m of members) {
          m.fx = null;
          m.fy = null;
        }
      }
    }

    // Hide the member node-shapes so the hull bubble reads as a clean point.
    nodeSelection.style('display', (d) =>
      d.sccGroupId !== null && collapsed.has(d.sccGroupId) ? 'none' : null,
    );

    // Nudge the sim so fx/fy takes effect and neighbors reflow around the point.
    simulation.alpha(0.3).restart();
  };

  const toggle = (groupId: number) => {
    const members = groups.get(groupId);
    if (!members) return;

    // Never collapse the SCC holding the focused target.
    if (targetId !== null && members.some((m) => m.id === targetId)) return;

    if (collapsed.has(groupId)) collapsed.delete(groupId);
    else collapsed.add(groupId);
    apply();
  };

  return { toggle };
}
