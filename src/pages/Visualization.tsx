/**
 * VisualizationPage
 *
 * The orchestration layer. Connects:
 *   URL → useTraversalRules → useGraphBuilder → GraphCanvas
 *
 * Sidebar controls write back to the URL via setViewMode/setRule.
 * Product selection lives in its own component and navigates via URL.
 * The canvas receives tagged graph data and the current view mode.
 */

import { useTraversalRules } from '@/hooks/useTraversalRules';
import { useGraphBuilder } from '@/hooks/useGraphBuilder';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import GraphCanvas from '@/components/GraphCanvas';
// import GraphCanvas from '@/components/GraphCanvas';

export default function VisualizationPage() {
  const { config, setViewMode, setRule } = useTraversalRules();
  const { nodes, links, focusedCount } = useGraphBuilder(config);

  console.log('targetClassName:', config.targetClassName);
  console.log('productSlug from URL:', config.targetSlug);

  return (
    <div className='flex h-screen w-full bg-white text-slate-900'>
      {/* SIDEBAR */}
      <aside className='w-72 border-r bg-slate-50 p-6 flex flex-col gap-6'>
        {/* Product Selection */}
        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4'>
            Target Product
          </h2>
          {config.targetName && (
            <p className='text-sm text-slate-700 mb-3'>{config.targetName}</p>
          )}
          <ProductAutocomplete />
        </div>

        {/* View Mode */}
        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4'>
            View Mode
          </h2>
          <div className='flex flex-col gap-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='radio'
                name='viewMode'
                checked={config.viewMode === 'focused'}
                onChange={() => setViewMode('focused')}
              />
              <span className='text-sm'>Focused</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='radio'
                name='viewMode'
                checked={config.viewMode === 'bigpicture'}
                onChange={() => setViewMode('bigpicture')}
              />
              <span className='text-sm'>Big Picture</span>
            </label>
          </div>
        </div>

        {/* Traversal Rules */}
        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4'>
            Filters
          </h2>
          <div className='flex flex-col gap-3'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={config.rules.includeAlternates}
                onChange={(e) => setRule('includeAlternates', e.target.checked)}
              />
              <span className='text-sm'>Include Alternate Recipes</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={config.rules.includeBaseResources}
                onChange={(e) =>
                  setRule('includeBaseResources', e.target.checked)
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
          Focused: {focusedCount} | Total: {nodes.length} | Mode:{' '}
          {config.viewMode}
        </div>

        <GraphCanvas
          nodes={nodes}
          links={links}
          viewMode={config.viewMode}
        />
      </main>
    </div>
  );
}
