import { useState } from 'react';

import type {
  TraversalRules,
  TraversalConfig,
  TraversalConstraints,
} from '@/hooks/useTraversalRules';
import type { Product } from '@/types';

import { Surface } from '@/components/ui/Surface';
import { WarningBubble } from '@/components/ui/WarningBubble';
import { ProductSelector } from '@/components/selector';
import { FilterControls, FilterSummary } from '@/components/filters';
import { SelectedProductDisplay } from './SelectedProductDisplay';

// The controls surface. Surface owns the chrome, header, drag, and z-order;
// this composition only arranges the contents.
//
// config / constraints / warning are three distinct outputs of
// useTraversalRules, not a single bundle — they stay separate props.

interface ControlsPanelProps {
  /** Target identity + rule set. Does NOT carry constraints or warning. */
  config: TraversalConfig;
  /** Derived selection limits (e.g. minTier) from useTraversalRules. */
  constraints: TraversalConstraints;
  /** Auto-correction notice from the rules engine, or null when clean. */
  warning: string | null;
  onSetRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

export function ControlsPanel({
  config,
  constraints,
  warning,
  onSetRule,
  selectedProduct,
  onSelectProduct,
}: ControlsPanelProps) {
  // ProductSelector is a controlled disclosure. Its open-state has no consumer
  // outside this panel, so it lives here rather than in the orchestration layer.
  // When mobile lifts this body into a bottom sheet (see seam below), revisit
  // whether a sheet manager should own it instead.
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setSelectorOpen(false); // collapse on pick; drop if ProductSelector self-closes
  };

  return (
    <Surface
      id='controls'
      title='Controls'
      anchor='top-left'
      className='w-72'
    >
      {/* ── Mobile seam ──────────────────────────────────────────────────────
          These contents are container-agnostic. When mobile lands, lift this
          body into a shared <ControlsContent /> and wrap it in a bottom sheet
          there instead of Surface. No second consumer yet, so it stays inline. */}
      <div className='flex flex-col gap-3 p-3'>
        {/* Summary sits at the top, above the selector. */}
        <FilterSummary config={config} />

        {warning && <WarningBubble message={warning} />}

        <div className='flex flex-col gap-2'>
          {selectedProduct && (
            <SelectedProductDisplay product={selectedProduct} />
          )}
          <ProductSelector
            maxTier={config.rules.maxTier}
            onSelect={handleSelect}
            isOpen={selectorOpen}
            onOpen={() => setSelectorOpen(true)}
            onClose={() => setSelectorOpen(false)}
          />
        </div>

        <FilterControls
          rules={config.rules}
          constraints={constraints}
          onSetRule={onSetRule}
        />
      </div>
    </Surface>
  );
}
