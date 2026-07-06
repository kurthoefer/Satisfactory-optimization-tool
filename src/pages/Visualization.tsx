/**
 * Visualization
 *
 * Page-level orchestration. Owns URL-derived config and passes
 * derived concerns down to the controls and canvas.
 */

import { useTraversalRules } from '@/hooks/useTraversalRules';
import { useGraphBuilder } from '@/components/graph/useGraphBuilder';
import GraphCanvas from '@/components/graph/GraphCanvas';
import { ControlsPanel } from '@/components/panels/ControlsPanel';
import { PinnedPanel } from '@/components/panels/PinnedPanel';
import type { Product } from '@/types';
import { useSessionNav, useSessionSync } from '@/hooks/useSessionNav';

export default function Visualization() {
  useSessionSync(); // store follows the URL; enables back/forward
  const { config, setRule, constraints, warning, selectedProduct } =
    useTraversalRules();
  const { nodes, links } = useGraphBuilder(config);
  const { reRoot } = useSessionNav();

  const handleSelectProduct = (product: Product) => {
    reRoot({
      targetClassName: product.className,
      targetName: product.name,
      targetSlug: product.slug,
    });
  };

  return (
    <div className='relative h-full w-full overflow-hidden'>
      {/* Click-to-pin and pinned highlighting live inside GraphCanvas
          (it talks to lib/pinned directly), so nothing to wire from here. */}
      <GraphCanvas
        nodes={nodes}
        links={links}
        selectedProduct={selectedProduct}
      />

      {/* Window layer. `isolation: isolate` gives the panels' z-orders their own
          stacking context. The Surfaces are position:fixed and this wrapper has
          no size of its own, so graph interaction passes through the gaps.
          Form-factor seam: branch HERE for mobile bottom sheets when it lands. */}
      <div style={{ isolation: 'isolate' }}>
        <ControlsPanel
          config={config}
          constraints={constraints}
          warning={warning}
          onSetRule={setRule}
          selectedProduct={selectedProduct}
          onSelectProduct={handleSelectProduct}
        />
        <PinnedPanel />
      </div>
    </div>
  );
}
