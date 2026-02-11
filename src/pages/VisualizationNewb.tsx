import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// 1. TYPE DEFINITIONS
import type {
  Product,
  Recipe,
  TopologicalEdge,
  SimulationNode,
  KineticLink,
} from '@/types';

// 2. DATA IMPORTS (The Static Manifest)
import topologyData from '@/data/topology.json';
import recipesData from '@/data/recipes.json';
import productsData from '@/data/products-flat.json';

// --- DATA CASTING & INDEXING ---
// We cast these once to ensure TypeScript knows they match our schemas
const allProducts = productsData as Product[];
const allRecipes = recipesData as Recipe[];
const allEdges = topologyData.edges as TopologicalEdge[];

// ----------------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------------
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
          // Structural Integrity: Only keep recipe if the primary output exists in our survivor nodes
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
  useEffect(() => {
    const { activeProducts, activeRecipes } = filteredEntities;

    // 1. Collect Nodes (The Atoms)
    const nodes: SimulationNode[] = [];

    // A. Product Nodes
    activeProducts.forEach((id) => {
      const data = allProducts.find((p) => p.id === id);
      if (data) {
        nodes.push({
          id,
          // D3 Simulation Props (Mutable)
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          // The Application Payload (Immutable)
          payload: { type: 'product', data },
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

    const links: KineticLink[] = allEdges
      .filter(
        (edge) => validIds.has(edge.sourceId) && validIds.has(edge.targetId),
      )
      .map((edge) => ({
        // Clone the edge so D3 doesn't mutate the raw JSON manifest
        ...edge,
        source: edge.sourceId, // D3 will replace this string with a Node object reference
        target: edge.targetId,
      }));

    // 3. Dispatch to State
    setVisualGraph({ nodes, links });
  }, [filteredEntities]);

  return (
    <div className='flex h-screen w-full bg-white text-slate-900 font-sans'>
      {/* SIDEBAR */}
      <aside className='w-72 border-r bg-slate-50 p-6 flex flex-col gap-6 shadow-md z-10'>
        <div>
          <h2 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>
            Search Products
          </h2>
          <input
            type='text'
            placeholder='e.g. Iron...'
            className='w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none'
            value={activeFilters.search}
            onChange={(e) =>
              setActiveFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>

        <div>
          <h2 className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>
            Configuration
          </h2>
          <div className='flex flex-col gap-3'>
            <label className='flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1 rounded transition'>
              <input
                type='checkbox'
                className='rounded text-blue-600 focus:ring-blue-500'
                checked={activeFilters.showAlternates}
                onChange={(e) =>
                  setActiveFilters((f) => ({
                    ...f,
                    showAlternates: e.target.checked,
                  }))
                }
              />
              <span className='text-sm text-slate-700'>Alternate Recipes</span>
            </label>

            <label className='flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1 rounded transition'>
              <input
                type='checkbox'
                className='rounded text-blue-600 focus:ring-blue-500'
                checked={activeFilters.showBaseResources}
                onChange={(e) =>
                  setActiveFilters((f) => ({
                    ...f,
                    showBaseResources: e.target.checked,
                  }))
                }
              />
              <span className='text-sm text-slate-700'>Base Resources</span>
            </label>
          </div>
        </div>
      </aside>

      {/* CANVAS */}
      <main className='flex-1 relative bg-slate-100 overflow-hidden'>
        <div className='absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-mono border shadow-sm text-slate-600'>
          <span className='font-bold text-slate-800'>
            {visualGraph.nodes.length}
          </span>{' '}
          Nodes |
          <span className='font-bold text-slate-800 ml-2'>
            {visualGraph.links.length}
          </span>{' '}
          Edges |
          <span className='ml-2 opacity-50'>
            v.{topologyData.metadata.generatedAt.substring(0, 10)}
          </span>
        </div>

        <GraphCanvas data={visualGraph} />
      </main>
    </div>
  );
};

// ----------------------------------------------------------------------------
// D3 CANVAS COMPONENT
// ----------------------------------------------------------------------------
const GraphCanvas = ({
  data,
}: {
  data: { nodes: SimulationNode[]; links: KineticLink[] };
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous render
    svg.selectAll('*').remove();

    // 1. SETUP SIMULATION
    const simulation = d3
      .forceSimulation<SimulationNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, KineticLink>(data.links)
          .id((d) => d.id)
          // THE PHYSICS: Map Weight to Distance
          // Low Weight (High Saturation) = Pulls Tight (Short Distance)
          // High Weight (Low Saturation) = Pushes Apart (Long Distance)
          .distance((d) => Math.min(d.weight * 50, 400)),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(25)); // Prevent overlap

    // 2. RENDER ELEMENTS
    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.6)
      // THE PHYSICS: Map Throughput to Thickness
      .attr('stroke-width', (d) => Math.log(d.throughput + 1) * 2);

    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', (d) => (d.payload.type === 'product' ? 8 : 12)) // Recipe nodes are larger
      .attr('fill', (d) =>
        d.payload.type === 'product' ? '#3b82f6' : '#f59e0b',
      ) // Blue for Product, Orange for Recipe
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(drag(simulation) as any);

    // Add Titles for Hover
    node.append('title').text((d) => d.payload.data?.name || d.id);

    // 3. TICK HANDLER
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimulationNode).x!)
        .attr('y1', (d) => (d.source as SimulationNode).y!)
        .attr('x2', (d) => (d.target as SimulationNode).x!)
        .attr('y2', (d) => (d.target as SimulationNode).y!);

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className='w-full h-full cursor-grab active:cursor-grabbing'
    />
  );
};

// ----------------------------------------------------------------------------
// D3 DRAG UTILITY
// ----------------------------------------------------------------------------
const drag = (simulation: d3.Simulation<SimulationNode, undefined>) => {
  function dragstarted(event: any, d: SimulationNode) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: any, d: SimulationNode) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: any, d: SimulationNode) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3
    .drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
};

export default VisualizationPage;
