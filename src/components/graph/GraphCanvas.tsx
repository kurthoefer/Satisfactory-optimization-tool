import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import type { GraphNode, GraphEdge, Product } from '@/types';
import { drawLinks } from './renderers/drawLinks';
import { drawNodes } from './renderers/drawNodes';
import { createForceLayout } from './layouts/forceLayout';
import { LoadedImage } from '@/lib/image';
import { Skeleton } from '@/components/ui/Skeleton';
import { CursorTooltip } from '@/components/ui/CursorTooltip';
// import { imageUrl } from '@/utils/imageHelper'; // ← wire to your actual export
import getProductImagePath from '@/utils/imageHelper';

// ============================================================================
// HOVER STATE
// ============================================================================

interface HoverState {
  node: GraphNode;
  x: number;
  y: number;
}

// ============================================================================
// TOOLTIP CONTENT
//
// Scoped here for now — single consumer. Hoists to product/ | entities/ the
// moment SelectedProductDisplay or the attention shelf becomes consumer #2.
//
// Minimal peek for now: thumbnail + label. The real fields, design-token
// styling, and the product-vs-recipe treatment land in the content pass.
// ============================================================================

function NodeTooltipContent({ node }: { node: GraphNode }) {
  const { data } = node.payload;
  if (!data) return null;

  const label =
    'name' in data ? data.name : 'displayName' in data ? data.displayName : '';
  if (!label) return null;

  return (
    <div className='flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-sm'>
      <LoadedImage
        src={getProductImagePath(data.className)}
        // Recipe nodes may key off the produced-in machine or the primary
        // output product — that's a content-pass decision.
        alt={label}
        active
        placeholder={<Skeleton className='h-8 w-8 rounded' />}
        className='h-8 w-8 rounded object-contain'
      />
      <span className='font-medium'>{label}</span>
    </div>
  );
}

// ============================================================================
// PROPS
// ============================================================================

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphEdge[];
  selectedProduct: Product | null;
  onNodeClick?: (nodeId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function GraphCanvas({
  nodes,
  links,
  selectedProduct,
  onNodeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  // Insulate the D3 effect from hover updates: handlers reach the *latest*
  // setter through a ref, so hover/coord changes never re-run the heavy
  // effect. (Your existing hoveredNode pattern, extended to coordinates.)
  const setHoverRef = useRef(setHover);
  setHoverRef.current = setHover;

  const onEnter = useCallback((node: GraphNode, x: number, y: number) => {
    setHoverRef.current({ node, x, y });
  }, []);

  const onMove = useCallback((x: number, y: number) => {
    setHoverRef.current((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const onLeave = useCallback(() => {
    setHoverRef.current(null);
  }, []);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // --- Semantic zoom group ---
    const g = svg.append('g');

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }),
    );

    // --- Render (order matters: links behind nodes) ---
    const linkSelection = drawLinks(g, links);
    const nodeSelection = drawNodes(g, nodes, selectedProduct);

    // --- Hover events ---
    // enter: capture node + initial coords. move: keep the tooltip following
    // the pointer (coords only update while over a node — exactly when the
    // tooltip is shown). leave: clear.
    nodeSelection
      .on('mouseenter', (event, d) => onEnter(d, event.clientX, event.clientY))
      .on('mousemove', (event) => onMove(event.clientX, event.clientY))
      .on('mouseleave', () => onLeave());

    // --- Layout ---
    const { cleanup } = createForceLayout({
      width,
      height,
      nodes,
      links,
      nodeSelection,
      linkSelection,
      onNodeClick,
    });

    cleanupRef.current = cleanup;

    return () => {
      cleanup();
      cleanupRef.current = null;
    };
    // Note: selectedProduct is read here but intentionally left out of deps to
    // preserve your original behavior. If selection should redraw the graph,
    // add it — flagging in case that omission was an oversight rather than a choice.
  }, [nodes, links, onNodeClick, onEnter, onMove, onLeave]);

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
