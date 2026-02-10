import React, { useMemo, useState } from 'react';
import type { Product, Recipe, RecipesOrganized } from '@/types';
import recipesOrganizedData from '@/data/recipes-organized.json';
import productsData from '@/data/products-flat.json';

//* DATA CASTING
const recipesOrganized = recipesOrganizedData as RecipesOrganized;
const allProducts = productsData as Product[];

//* GLOBAL SPEED-DIAL (Pre-index classname to each Product[])
// Map wants key, value pairs to build an Obj ->
//          we give itterable full of them
// { array.map builds us an array of tuples -- [classname, Product[]] }
const PRODUCT_MAP = new Map(allProducts.map((p) => [p.className, p]));

const VisualizationPage = () => {
  // 3. STATE: User Controls
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    showAlternates: false,
    showBaseResources: true, // e.g., Iron Ore, Water, etc.
    // [ADDITIONAL FILTERS HERE]
  });

  //* STEP 1: Raw data --> into validated Node/Edge graph.
  const filteredGraph = useMemo(() => {
    // A. FILTER NODES (Products)
    const nodes = allProducts.filter((product) => {
      // Search Filter
      const matchesSearch = product.name
        .toLowerCase()
        .includes(activeFilters.search.toLowerCase());

      // Base Resource Filter (Example logic)
      // If user wants to hide base resources, we check a category or energy value
      const isBaseResource = product.category === 'Resources';
      const baseFilterPass = activeFilters.showBaseResources || !isBaseResource;

      return matchesSearch && baseFilterPass;
    });

    // Create a Set for lookup during edge pruning
    const survivorIds = new Set(nodes.map((p) => p.className));

    // B. FILTER EDGES (Recipes)
    const edges = recipesOrganized.all.filter((recipe) => {
      // Structural Integrity: Only keep recipe if the primary output exists in our survivor nodes
      const hasValidOutput = recipe.products.some((p) =>
        survivorIds.has(p.className),
      );

      // Alternate Recipe Filter
      const alternatePass = activeFilters.showAlternates || !recipe.isAlternate;

      // [SPACE FOR MORE EDGE FILTERS: e.g., Filter by Machine or Tier]

      return hasValidOutput && alternatePass;
    });

    return { nodes, edges };
  }, [activeFilters]);

  //* STEP 2: THE CONDENSATION (Placeholder)
  const condensationGraph = useMemo(() => {
    // Tarjan's / SCC logic will eventually live here.
    // For now, it passes through the filtered graph.
    return filteredGraph;
  }, [filteredGraph]);

  return (
    <div className='flex h-screen w-full bg-white text-slate-900'>
      {/* TOOLBOX / SIDEBAR */}
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

        {/* [SPACE TO FILL LATER: Machine filters, Tier sliders, etc.] */}
      </aside>

      {/* CANVAS AREA */}
      <main className='flex-1 relative bg-slate-100'>
        <div className='absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-mono border shadow-sm'>
          Nodes: {condensationGraph.nodes.length} | Edges:{' '}
          {condensationGraph.edges.length}
        </div>
        <GraphCanvas data={condensationGraph} />
      </main>
    </div>
  );
};

// D3 Integration Point
const GraphCanvas = ({ data }: { data: { nodes: any[]; edges: any[] } }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    // D3 magic happens here: Selection, Data Join, Layout
    console.log('Canvas received clean DAG. Ready for Sugiyama.');
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className='w-full h-full'
    />
  );
};

export default VisualizationPage;
