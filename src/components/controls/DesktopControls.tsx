/**
 * Floating panel anchored top-left on md+ screens.
 * Contains ProductSelector and FilterToggles stacked vertically.
 * Open by default, collapsible. Panel sizes to content.
 * Product grid height is controlled by the drag handle inside ProductSelector.
 */

import { useState } from 'react';
import { ProductSelector } from '@/components/selector/ProductSelector';
import { FilterSummary } from './FilterSummary';
import { FilterToggles } from './FilterToggles';
import type {
  TraversalConfig,
  TraversalConstraints,
  TraversalRules,
} from '@/hooks/useTraversalRules';
import type { Product } from '@/types';

interface DesktopControlsProps {
  config: TraversalConfig;
  constraints: TraversalConstraints;
  warning: string | null;
  onSelectProduct: (product: Product) => void;
  onSetRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
}

export function DesktopControls({
  config,
  constraints,
  warning,
  onSelectProduct,
  onSetRule,
}: DesktopControlsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className='w-72 rounded-lg border border-neutral-700 bg-neutral-900/90 backdrop-blur-sm shadow-xl flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-2 border-b border-neutral-800 shrink-0'>
        <FilterSummary config={config} />
        <button
          onClick={() => setIsOpen((v) => !v)}
          className='ml-2 text-neutral-500 hover:text-neutral-300 transition-colors text-xs shrink-0'
          title={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? '↑' : '↓'}
        </button>
      </div>

      {/* Body */}
      {isOpen && (
        <div className='flex flex-col'>
          {/* Warning */}
          {warning && (
            <div className='mx-3 mt-2 px-2 py-1.5 text-xs text-amber-300 bg-amber-950/50 border border-amber-800 rounded'>
              {warning}
            </div>
          )}

          {/* Product selector */}
          <div className='border-b border-neutral-800'>
            <ProductSelector
              maxTier={config.rules.maxTier}
              onSelect={onSelectProduct}
            />
          </div>

          {/* Filter toggles */}
          <FilterToggles
            rules={config.rules}
            constraints={constraints}
            onSetRule={onSetRule}
          />
        </div>
      )}
    </div>
  );
}
