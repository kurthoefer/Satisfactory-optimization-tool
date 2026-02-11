import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// 1. IMPORT THE PHYSICS & TYPES
import type {
  Product,
  Recipe,
  TopologicalEdge,
  SimulationNode,
  KineticLink,
} from '@/types';

import topologyData from '@/data/topology.json';
import recipesData from '@/data/recipes.json';
import productsData from '@/data/products-flat.json';

// --- DATA CASTING & INDEXING ---
// We cast these once to ensure TypeScript knows they match our schemas
const allProducts = productsData as Product[];
const allRecipes = recipesData as Recipe[];
const allEdges = topologyData.edges as TopologicalEdge[];

// Index edges for fast lookup during filtering
// "Give me a node ID, I'll give you its physics connections"
// const EDGES_BY_ID = new Map<string, TopologicalEdge[]>();
// allEdges.forEach((edge) => {
//   if (!EDGES_BY_ID.has(edge.sourceId)) EDGES_BY_ID.set(edge.sourceId, []);
//   EDGES_BY_ID.get(edge.sourceId)?.push(edge);

//   if (!EDGES_BY_ID.has(edge.targetId)) EDGES_BY_ID.set(edge.targetId, []);
//   EDGES_BY_ID.get(edge.targetId)?.push(edge);
// });

const VisualizationPage = () => {
  // --- STATE ---
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    showAlternates: false,
    showBaseResources: true,
  });

  // The final graph ready for D3
  const [visualGraph, setVisualGraph] = useState<{
    nodes: SimulationNode[];
    links: KineticLink[];
  }>({ nodes: [], links: [] });

  // --- STEP 1: FILTERING (The "What") ---
  const filteredEntities = useMemo(() => {
    // A. Filter Products
    const activeProducts = new Set(
      allProducts
        .filter((p) => {
          const matchesSearch = p.name
            .toLowerCase()
            .includes(activeFilters.search.toLowerCase());
          const isResource = p.category === 'Resources';
          return (
            matchesSearch && (activeFilters.showBaseResources || !isResource)
          );
        })
        .map((p) => p.id),
    );

    // B. Filter Recipes
    const activeRecipes = new Set(
      allRecipes
        .filter((r) => {
          const producesRelevant = r.products.some((p) =>
            activeProducts.has(p.className),
          );
          const alternatePass = activeFilters.showAlternates || !r.isAlternate;
          return producesRelevant && alternatePass;
        })
        .map((r) => r.id),
    );

    return { activeProducts, activeRecipes };
  }, [activeFilters]);

  // --- STEP 2: TOPOLOGY CONSTRUCTION (The "How") ---
  // Connects the filtered entities using the pre-calculated Manifest.
  // TODO: Move this useEffect block into a Web Worker file (topology.worker.ts)
  useEffect(() => {
    const { activeProducts, activeRecipes } = filteredEntities;

    // 1. Collect Nodes & Initialize Simulation State
    const nodes: SimulationNode[] = [];

    // A. Product Nodes
    activeProducts.forEach((id) => {
      const data = allProducts.find((p) => p.id === id);
      if (data) {
        nodes.push({
          id,
          // D3 Mechanics (Mutable)
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          // The Safe Zone (Immutable Data)
          payload: { type: 'product', data },
          // The "Heat" (Calculated later)
          stressScore: 0,
          degree: 0,
        });
      }
    });

    // B. Recipe Nodes
    activeRecipes.forEach((id) => {
      const data = allRecipes.find((r) => r.id === id);
      if (data) {
        nodes.push({
          id,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          payload: { type: 'recipe', data },
          stressScore: 0,
          degree: 0,
        });
      }
    });

    // 2. Collect Edges (The Bridge)
    const validIds = new Set([...activeProducts, ...activeRecipes]);

    // Map to 'KineticLink' to match our interface
    const links: KineticLink[] = allEdges
      .filter(
        (edge) => validIds.has(edge.sourceId) && validIds.has(edge.targetId),
      )
      .map((edge) => ({
        // Clone the edge to protect the manifest
        ...edge,
        // Explicitly assign string IDs (D3 will mutate these into objects later)
        source: edge.sourceId,
        target: edge.targetId,
      }));

    // 3. Dispatch to State
    setVisualGraph({ nodes, links });
  }, [filteredEntities]);

  return (
    <div className='flex h-screen w-full bg-white text-slate-900'>
      {/* SIDEBAR */}
      <aside className='w-72 border-r bg-slate-50 p-6 flex flex-col gap-6'>
        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4'>
            Search
          </h2>
          <input
            type='text'
            placeholder='Search products...'
            className='w-full p-2 border rounded-md shadow-sm'
            value={activeFilters.search}
            onChange={(e) =>
              setActiveFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>

        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4'>
            Recipe Toggles
          </h2>
          <div className='flex flex-col gap-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={activeFilters.showAlternates}
                onChange={(e) =>
                  setActiveFilters((f) => ({
                    ...f,
                    showAlternates: e.target.checked,
                  }))
                }
              />
              <span className='text-sm'>Include Alternate Recipes</span>
            </label>

            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={activeFilters.showBaseResources}
                onChange={(e) =>
                  setActiveFilters((f) => ({
                    ...f,
                    showBaseResources: e.target.checked,
                  }))
                }
              />
              <span className='text-sm'>Show Base Resources</span>
            </label>
          </div>
        </div>
      </aside>

      {/* CANVAS AREA */}
      <main className='flex-1 relative bg-slate-100 overflow-hidden'>
        <div className='absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-mono border shadow-sm'>
          Nodes: {visualGraph.nodes.length} | Links: {visualGraph.links.length}{' '}
          | Manifest: {topologyData.metadata.generatedAt}
        </div>

        <GraphCanvas data={visualGraph} />
      </main>
    </div>
  );
};

// --- D3 CANVAS COMPONENT ---
const GraphCanvas = ({
  data,
}: {
  data: { nodes: SimulationNode[]; links: KineticLink[] };
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    console.log('🎨 Initializing Physics Engine...');

    const svg = d3.select(svgRef.current);
    // Clear previous renders (important for React re-renders)
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // A group for semantic zooming
    const g = svg.append('g');

    // Add basic zoom capability
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }),
    );

    // 1. SETUP SIMULATION
    const simulation = d3
      .forceSimulation<SimulationNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, KineticLink>(data.links)
          .id((d) => d.id)
          // THE PHYSICS: Map Weight to Distance
          // Low Weight (High Saturation) = Short Distance
          // High Weight (Low Saturation) = Long Distance
          .distance((d) => Math.min(d.weight * 50, 300)),
      )
      // Push nodes apart so they don't overlap
      .force('charge', d3.forceManyBody().strength(-150))
      // Pull everything toward the center of the SVG
      .force('center', d3.forceCenter(width / 2, height / 2));

    // 2. DRAW LINKS
    const link = g
      .append('g')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      // Visual Thickness based on Throughput
      .attr('stroke-width', (d) =>
        Math.max(1, Math.log10(d.throughput + 1) * 2),
      );

    // 3. DRAW NODES
    const node = g
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', (d) => (d.payload.type === 'recipe' ? 8 : 12))
      .attr('fill', (d) =>
        d.payload.type === 'recipe' ? '#f59e0b' : '#3b82f6',
      );

    // Add titles for native browser tooltips
    node.append('title').text((d) => d.payload.data?.name || d.id);

    // 4. TICK EVENT (The Render Loop)
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimulationNode).x!)
        .attr('y1', (d) => (d.source as SimulationNode).y!)
        .attr('x2', (d) => (d.target as SimulationNode).x!)
        .attr('y2', (d) => (d.target as SimulationNode).y!);

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
    });

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className='w-full h-full'
    />
  );
};

export default VisualizationPage;
