import React, { useMemo, useState, useEffect } from 'react';
import type { Product, Recipe, TopologicalEdge, GraphNode } from '@/types';
// 1. IMPORT THE PHYSICS
import topologyData from '@/data/topology.json';
import recipesData from '@/data/recipes.json';
import productsData from '@/data/products-flat.json';

// --- DATA CASTING & INDEXING ---
const allProducts = productsData as Product[];
const allRecipes = recipesData as Recipe[];
const allEdges = topologyData.edges as TopologicalEdge[];

// Index edges by their associated node (Recipe or Product) for fast lookup
// This lets us say: "If Recipe X is active, give me all its friction edges."
// TODO: "sourceId" refers to products and "targetId" to recipes, i think for arbritrary reasons,
const EDGES_BY_ID = new Map<string, TopologicalEdge[]>();
allEdges.forEach((edge) => {
  // Index by Source
  if (!EDGES_BY_ID.has(edge.sourceId)) EDGES_BY_ID.set(edge.sourceId, []);
  EDGES_BY_ID.get(edge.sourceId)?.push(edge);
  // Index by Target
  if (!EDGES_BY_ID.has(edge.targetId)) EDGES_BY_ID.set(edge.targetId, []);
  EDGES_BY_ID.get(edge.targetId)?.push(edge);
});

const VisualizationPage = () => {
  // --- STATE ---
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    showAlternates: false,
    showBaseResources: true,
  });

  // The final graph ready for D3 (calculated by Worker ideally, or Memo for now)
  const [visualGraph, setVisualGraph] = useState<{
    nodes: GraphNode[];
    links: TopologicalEdge[];
  }>({ nodes: [], links: [] });

  // --- STEP 1: FILTERING ---
  // This determines which Recipes/Products are allowed on the board.
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
          // Only show if its product is relevant (Structural Integrity)
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

  // --- STEP 2: TOPOLOGY CONSTRUCTION ---
  // Connects the filtered entities using the pre-calculated Manifest.
  // TODO: Move this useMemo block into a Web Worker file (topology.worker.ts)
  useEffect(() => {
    const { activeProducts, activeRecipes } = filteredEntities;

    // 1. Collect Nodes
    const nodes: GraphNode[] = [];

    // Add Product Nodes
    activeProducts.forEach((id) => {
      // Find the full product object (simplified lookup for demo)
      const data = allProducts.find((p) => p.id === id);
      if (data) nodes.push({ id, type: 'product', data, stressScore: 0 });
    });

    // Add Recipe Nodes
    activeRecipes.forEach((id) => {
      const data = allRecipes.find((r) => r.id === id);
      if (data) nodes.push({ id, type: 'recipe', data, stressScore: 0 });
    });

    // 2. Collect Edges (The Bridge)
    // We only include edges where BOTH source and target are active.
    // This automatically handles "broken loops" when a user filters out an item.
    const validIds = new Set([...activeProducts, ...activeRecipes]);

    const links = allEdges.filter(
      (edge) => validIds.has(edge.sourceId) && validIds.has(edge.targetId),
    );

    // 3. Dispatch to D3 (or Worker for TDA/Persistence calculation)
    setVisualGraph({ nodes, links });
  }, [filteredEntities]);

  return (
    <div className='flex h-screen w-full bg-white text-slate-900'>
      {/* SIDEBAR (Unchanged) */}
      <aside className='w-72 border-r bg-slate-50 p-6 flex flex-col gap-6'>
        {/* ... Inputs ... */}
      </aside>

      {/* CANVAS */}
      <main className='flex-1 relative bg-slate-100'>
        <div className='absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-mono border shadow-sm'>
          Nodes: {visualGraph.nodes.length} | Links: {visualGraph.links.length}{' '}
          | Manifest: {topologyData.metadata.generatedAt}
        </div>

        {/* Pass the weighted links to D3 */}
        <GraphCanvas data={visualGraph} />
      </main>
    </div>
  );
};

// --- D3 CANVAS ---
// *key note:
// D3 wants X Y and Z.... blah blah (a MUTABLE object && a singular data struct/obj)
const GraphCanvas = ({
  data,
}: {
  data: { nodes: GraphNode[]; links: TopologicalEdge[] };
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    console.log('🎨 D3 Received Topology:', data);
    // Here we will map `link.weight` to d3.forceLink().distance()
    // and `link.throughput` to stroke-width.
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className='w-full h-full'
    />
  );
};

export default VisualizationPage;
