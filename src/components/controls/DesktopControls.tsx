/**
 * Floating panel anchored top-left on md+ screens.
 * Contains ProductSelector and FilterToggles stacked vertically.
 * Open by default, collapsible. Panel sizes to content.
 *
 * Owns the ProductSelector's open/close state so the click-outside check
 * can use the WHOLE panel as "inside" — filter toggles below the selector
 * count as inside the panel and won't close the grid when clicked.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductSelector } from '@/components/selector/ProductSelector';
import { FilterSummary } from './FilterSummary';
import { FilterToggles } from './FilterToggles';
import { SelectedProductDisplay } from './SelectedProductDisplay';
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
  selectedProduct: Product | null;
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
  selectedProduct,
  onSelectProduct,
  onSetRule,
}: DesktopControlsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeSelector = useCallback(() => setSelectorOpen(false), []);
  const openSelector = useCallback(() => setSelectorOpen(true), []);

  // Click outside the PANEL closes the selector grid. Anything inside the
  // panel — including the filter toggles below the selector — counts as
  // inside and leaves the grid open.
  useEffect(() => {
    if (!selectorOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeSelector();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [selectorOpen, closeSelector]);

  return (
    <div
      ref={panelRef}
      className='w-72 rounded-lg border border-neutral-700 bg-neutral-900/90 backdrop-blur-sm shadow-xl flex flex-col overflow-hidden'
    >
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
        <div className='flex flex-col px-3'>
          {/* Warning */}
          {warning && (
            <div className='mt-2 px-2 py-1.5 text-xs text-amber-300 bg-amber-950/50 border border-amber-800 rounded'>
              {warning}
            </div>
          )}

          {/* Product selector */}
          <div className='border-neutral-800'>
            {selectedProduct && (
              <SelectedProductDisplay product={selectedProduct} />
            )}
            <ProductSelector
              maxTier={config.rules.maxTier}
              onSelect={onSelectProduct}
              isOpen={selectorOpen}
              onOpen={openSelector}
              onClose={closeSelector}
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
