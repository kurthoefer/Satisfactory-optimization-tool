/**
 * Visualization
 *
 * Page-level orchestration. Owns the URL-derived config and
 * passes derived concerns down to controls and canvas.
 *
 * Layout:
 *   - GraphCanvas fills the full outlet space
 *   - DesktopControls floats top-left on md+
 *   - MobileControls anchors bottom on <md
 */

import { useNavigate } from 'react-router-dom';
import { useTraversalRules } from '@/hooks/useTraversalRules';
import { useGraphBuilder } from '@/components/graph/useGraphBuilder';
import GraphCanvas from '@/components/graph/GraphCanvas';
import { DesktopControls } from '@/components/controls';
import { MobileControls } from '@/components/controls';
import type { Product } from '@/types';

export default function Visualization() {
  const navigate = useNavigate();
  const { config, setRule, constraints, warning, selectedProduct } =
    useTraversalRules();
  const { nodes, links } = useGraphBuilder(config);

  function handleSelectProduct(product: Product) {
    navigate(`/visualize/${product.slug}`);
  }

  return (
    <div className='relative h-full w-full overflow-hidden'>
      {/* Graph fills the full space */}
      <GraphCanvas
        nodes={nodes}
        links={links}
      />

      {/* Desktop controls — floats top-left, md and up */}
      <div className='hidden md:block absolute top-4 left-4 z-10'>
        <DesktopControls
          config={config}
          constraints={constraints}
          warning={warning}
          selectedProduct={selectedProduct}
          onSelectProduct={handleSelectProduct}
          onSetRule={setRule}
        />
      </div>

      {/* Mobile controls — anchored bottom, below md */}
      <div className='md:hidden absolute bottom-0 left-0 right-0 z-10'>
        <MobileControls
          config={config}
          constraints={constraints}
          warning={warning}
          selectedProduct={selectedProduct}
          onSelectProduct={handleSelectProduct}
          onSetRule={setRule}
        />
      </div>
    </div>
  );
}
