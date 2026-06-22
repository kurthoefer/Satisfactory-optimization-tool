/**
 * Visualization
 *
 * Page-level orchestration. Owns the URL-derived config and
 * passes derived concerns down to controls and canvas.
 */

import { useNavigate } from 'react-router-dom';

import { useTraversalRules } from '@/hooks/useTraversalRules';
import { useGraphBuilder } from '@/components/graph/useGraphBuilder';
import GraphCanvas from '@/components/graph/GraphCanvas';
import { ControlsPanel } from '@/components/panels/ControlsPanel';
import { PinnedPanel } from '@/components/panels/PinnedPanel';
import type { Product } from '@/types';
import { useSessionNav, useSessionSync } from '@/hooks/useSessionNav';

export default function Visualization() {
  useSessionSync(); // makes the store follow the URL; enables back/forward
  // const navigate = useNavigate();
  const { config, setRule, constraints, warning, selectedProduct } =
    useTraversalRules();
  const { nodes, links } = useGraphBuilder(config);

  const { reRoot, goto } = useSessionNav();

  const handleSelectProduct = (product: Product) => {
    reRoot({
      targetClassName: product.className,
      targetName: product.name,
      targetSlug: product.slug,
    });
  };

  // function handleSelectProduct(product: Product) {
  //   navigate(`/visualize/${product.slug}`);
  // }

  return (
    <div className='relative h-full w-full overflow-hidden'>
      {/* Graph fills the viewport. Click-to-pin and pinned highlighting now live
          inside GraphCanvas (it talks to lib/pinned directly), so there's nothing
          to wire from here. */}
      <GraphCanvas
        nodes={nodes}
        links={links}
        selectedProduct={selectedProduct}
      />

      {/* Window layer. `isolation: isolate` gives the panels' z-orders their own
          stacking context, so they never escalate past the tooltip / nav. The
          Surfaces are position:fixed and this wrapper has no size of its own, so
          it doesn't overlay the graph — graph interaction passes through the gaps
          untouched.

          This is also the form-factor seam: today it renders the desktop window
          layer; when mobile lands, branch HERE to wrap the same panel content in
          bottom sheets instead of Surfaces. */}
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
