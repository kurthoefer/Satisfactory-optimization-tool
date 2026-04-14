/**
 * Bottom sheet for mobile. A persistent strip shows the filter
 * summary at all times. Tapping it reveals a sheet with two tabs:
 * selector and filters. Sheet dismisses on tap-outside or close button.
 */

import { useState, useRef, useEffect } from 'react';
import { ProductSelector } from '@/components/selector/ProductSelector';
import { FilterSummary } from './FilterSummary';
import { FilterToggles } from './FilterToggles';
import type {
  TraversalConfig,
  TraversalConstraints,
  TraversalRules,
} from '@/hooks/useTraversalRules';
import type { Product } from '@/types';

type Tab = 'selector' | 'filters';

interface MobileControlsProps {
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

export function MobileControls({
  config,
  constraints,
  warning,
  onSelectProduct,
  onSetRule,
}: MobileControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('selector');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Click-outside close
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  function handleSelectProduct(product: Product) {
    onSelectProduct(product);
    setIsOpen(false);
  }

  return (
    <div ref={sheetRef}>
      {/* Sheet — renders above the strip */}
      {isOpen && (
        <div className='bg-neutral-900 border-t border-neutral-700 flex flex-col'>
          {/* Tab bar */}
          <div className='flex border-b border-neutral-800'>
            {(['selector', 'filters'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-2 text-xs capitalize transition-colors
                  ${
                    activeTab === tab
                      ? 'text-white border-b-2 border-neutral-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }
                `}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => setIsOpen(false)}
              className='px-4 text-neutral-500 hover:text-neutral-300 text-xs'
            >
              ✕
            </button>
          </div>

          {/* Warning */}
          {warning && (
            <div className='mt-2 px-2 py-1.5 text-xs text-amber-300 bg-amber-950/50 border border-amber-800 rounded'>
              {warning}
            </div>
          )}

          {/* Tab content — no scroll wrapper, ProductSelector owns its own height */}
          {activeTab === 'selector' && (
            <ProductSelector
              maxTier={config.rules.maxTier}
              onSelect={handleSelectProduct}
              dragDirection='top'
            />
          )}
          {activeTab === 'filters' && (
            <FilterToggles
              rules={config.rules}
              constraints={constraints}
              onSetRule={onSetRule}
            />
          )}
        </div>
      )}

      {/* Persistent strip */}
      <div className='flex items-center justify-between px-4 py-2 bg-neutral-900/95 border-t border-neutral-700 backdrop-blur-sm'>
        <FilterSummary config={config} />
        <div className='flex gap-2 ml-2 shrink-0'>
          <button
            onClick={() => {
              setActiveTab('selector');
              setIsOpen((v) => !v);
            }}
            className='text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'
          >
            Select
          </button>
          <button
            onClick={() => {
              setActiveTab('filters');
              setIsOpen((v) => !v);
            }}
            className='text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'
          >
            Filters
          </button>
        </div>
      </div>
    </div>
  );
}
