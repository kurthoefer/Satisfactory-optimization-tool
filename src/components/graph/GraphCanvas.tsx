import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import type { GraphNode, GraphEdge, Product } from '@/types';
import type { AttentionCtx, NodeId } from '@/types/view';

import { appendGooFilter, drawFields } from './renderers/drawFields'; // was drawHulls
import { drawLinks } from './renderers/drawLinks';
import { drawNodes } from './renderers/drawNodes';
import { createEmphasisPainter } from './renderers/nodeEmphasis';
import { createForceLayout } from './layouts/forceLayout';
// createCollapseController is gone — collapse is a fieldStore flag now.

import {
  projectView,
  sccProvider,
  edgeIsExceptional,
  MERGE_THRESHOLD,
} from '@/lib/fields/projectView';
import { fieldStore } from '@/lib/fields/fieldStore';
import { pinnedStore } from '@/lib/pinned';

import { NodeTooltipContent } from './NodeTooltipContent';
import { CursorTooltip } from '@/components/ui/CursorTooltip';

// ============================================================================
// TYPES
// ============================================================================

interface HoverState {
  node: GraphNode;
  x: number;
  y: number;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  selectedProduct: Product | null;
  /** Optional extra hook fired alongside the pin toggle on node click. */
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================
//
// Orchestration: domain -> projectView -> renderers. React owns the shell
// (svg + tooltip); D3 owns the canvas imperatively in one effect. Store
// changes drive imperative re-projection, never a React re-render, so the
// simulation is never torn down mid-flight.

export default function GraphCanvas({
  nodes,
  links,
  selectedProduct,
  onNodeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Keep the latest onNodeClick without rebuilding the simulation each render.
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    appendGooFilter(svg);

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // --- Semantic zoom; layers under `g`, back -> front ---------------------
    const g = svg.append('g');
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (event) => g.attr('transform', event.transform)),
    );
    const fieldsLayer = g.append('g').attr('class', 'layer-fields');
    const linksLayer = g.append('g').attr('class', 'layer-links');
    const nodesLayer = g.append('g').attr('class', 'layer-nodes');

    const nodeById = new Map<NodeId, GraphNode>(nodes.map((n) => [n.id, n]));

    // --- Renderers own their selections ------------------------------------
    const linkSelection = drawLinks(linksLayer, links);
    const nodeSelection = drawNodes(nodesLayer, nodes);
    const paintEmphasis = createEmphasisPainter(
      svg,
      nodeSelection,
      selectedProduct,
    );

    // --- Hover -> tooltip + attention --------------------------------------
    // setHover identity is stable, so no ref indirection is needed. hoverRef
    // mirrors it for the attention snapshot (consumed by salience later).
    const hoverRef = { current: null as NodeId | null };
    nodeSelection
      .on('mouseenter', (e: MouseEvent, d: GraphNode) => {
        hoverRef.current = d.id;
        setHover({ node: d, x: e.clientX, y: e.clientY });
      })
      .on('mousemove', (e: MouseEvent) =>
        setHover((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p)),
      )
      .on('mouseleave', () => {
        hoverRef.current = null;
        setHover(null);
      });

    // --- Simulation (collapse-aware centroid) ------------------------------
    let reheat = 0;
    const { simulation, cleanup } = createForceLayout({
      width,
      height,
      nodes,
      links,
      nodeSelection,
      linkSelection,
      isCollapsed: (gid) => fieldStore.isCollapsed(`scc:${gid}`),
      onNodeClick: (id) => {
        pinnedStore.toggle(id);
        onNodeClickRef.current?.(id);
      },
    });

    // --- Projection: domain + live positions + attention -> view model -----
    const buildCtx = (): AttentionCtx => ({
      pinned: new Set(pinnedStore.getSnapshot()), // store returns readonly string[]; Set gives O(1) membership
      hovered: hoverRef.current,
      focus: null,
    });

    let fieldsRender: ReturnType<typeof drawFields> | null = null;
    const project = () => {
      const view = projectView({ nodes, edges: links }, buildCtx(), {
        providers: [sccProvider],
        context: 'subgraph', // importance within the chain being built
        mergeThreshold: MERGE_THRESHOLD,
      });
      const chargeById = new Map(view.nuclei.map((n) => [n.nodeId, n.charge]));
      fieldsRender = drawFields(fieldsLayer, view.fields, nodeById, chargeById);
      fieldsRender.onCollapse(onCollapse);
    };

    // Collapse: flip the store flag + re-heat so members converge / boil apart.
    const onCollapse = (fieldId: string) => {
      fieldStore.toggleCollapse(fieldId);
      simulation.alphaTarget(0.3).restart();
      window.clearTimeout(reheat);
      reheat = window.setTimeout(() => simulation.alphaTarget(0), 500);
    };

    project();

    // --- One predicate for link visibility ---------------------------------
    // Non-local (earns a line) OR touching attention (pinning reveals a node's
    // links even when local — this preserves the old always-visible flow).
    const touchesPinned = (d: GraphEdge) => {
      const s =
        typeof d.source === 'string' ? d.source : (d.source as GraphNode).id;
      const t =
        typeof d.target === 'string' ? d.target : (d.target as GraphNode).id;
      return pinnedStore.has(s) || pinnedStore.has(t);
    };
    const refreshLinks = () => {
      linkSelection.attr('display', (d) => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        return edgeIsExceptional(s, t, MERGE_THRESHOLD) || touchesPinned(d)
          ? null
          : 'none';
      });
    };

    // --- Per-tick: reposition fields, refresh link visibility --------------
    // Coexists with createForceLayout's internal 'tick' (node/link positions).
    simulation.on('tick.detail', () => {
      fieldsRender?.update();
      refreshLinks();
    });

    // --- Repaint on pin change: emphasis, flow class, link visibility -------
    const repaint = () => {
      paintEmphasis();
      linkSelection.classed('flow', touchesPinned);
      refreshLinks(); // catch pins while the sim is cool (no ticks firing)
    };
    repaint();

    const unsubPinned = pinnedStore.subscribe(repaint);
    const unsubField = fieldStore.subscribe(project); // collapse/lens -> re-project

    return () => {
      window.clearTimeout(reheat);
      simulation.on('tick.detail', null);
      unsubPinned();
      unsubField();
      cleanup();
    };
  }, [nodes, links, selectedProduct]);

  return (
    <div className='absolute inset-0 overflow-hidden'>
      <svg
        ref={svgRef}
        className='w-full h-full'
      />
      <CursorTooltip
        active={!!hover}
        x={hover?.x ?? 0}
        y={hover?.y ?? 0}
      >
        {hover && <NodeTooltipContent node={hover.node} />}
      </CursorTooltip>
    </div>
  );
}
