/**
 * VisualizationPage
 *
 * The orchestration layer. Connects:
 *   URL → useTraversalRules → useGraphBuilder → GraphCanvas
 *
 * Sidebar controls write back to the URL via setRule.
 * Product selection lives in its own component and navigates via URL.
 * The canvas receives tagged graph data shaped by the current rules.
 */

import { useTraversalRules } from '@/hooks/useTraversalRules';
import { useGraphBuilder } from '@/hooks/useGraphBuilder';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import GraphCanvas from '@/components/graph/GraphCanvas';

export default function VisualizationPage() {
  const { config, setRule } = useTraversalRules();
  const { nodes, links, focusedCount } = useGraphBuilder(config);

  return (
    <div className='flex h-full w-full bg-white text-slate-900'>
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

        {/* Filters */}
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
                checked={config.rules.includeConverter}
                onChange={(e) => setRule('includeConverter', e.target.checked)}
              />
              <span className='text-sm'>Include Converter Recipes</span>
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

          {/* Tier Limit */}
          <div className='mt-4'>
            <label className='text-sm text-slate-600'>
              Max Tier
              <select
                className='ml-2 text-sm border rounded px-2 py-1'
                value={config.rules.maxTier ?? 'all'}
                onChange={(e) =>
                  setRule(
                    'maxTier',
                    e.target.value === 'all'
                      ? null
                      : parseInt(e.target.value, 10),
                  )
                }
              >
                <option value='all'>All Tiers</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                  <option
                    key={t}
                    value={t}
                  >
                    Tier {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </aside>

      {/* CANVAS AREA */}
      <main className='flex-1 relative bg-slate-100 overflow-hidden'>
        <div className='absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded-full text-xs font-mono border shadow-sm'>
          Focused: {focusedCount} | Total: {nodes.length}
        </div>

        <GraphCanvas
          nodes={nodes}
          links={links}
        />
      </main>
    </div>
  );
}
