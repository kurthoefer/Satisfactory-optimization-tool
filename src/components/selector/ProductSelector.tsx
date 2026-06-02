/**
 * Search input + scrollable product grid.
 *
 * The keyboard story:
 *   - Input owns ArrowDown (dive into grid), ArrowRight (ghost-accept),
 *     Enter (submit ghosted target). Other keys fall through to native input.
 *   - Grid owns Arrow keys (move), Enter (submit current tile).
 *   - The wrapper owns Escape (close).
 *
 * Focus is driven by the DOM: grid tiles use ROVING TABINDEX — exactly one
 * tile has tabIndex=0 (the "current" one), the rest are -1. When position
 * changes, we call .focus() on the new current tile.
 */

import { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useProductSelector } from './useProductSelector';
import { useGridNavigation, type GridPosition } from './useGridNavigation';
import { useDraggableHeight } from './useDraggableHeight';
import { deriveGhost } from './deriveGhost';
import { TILE_MIN_WIDTH } from './constants';
import type { Product } from '@/types';

interface ProductSelectorProps {
  maxTier: number | null;
  onSelect: (product: Product) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  dragDirection?: 'bottom' | 'top';
}

export function ProductSelector({
  maxTier,
  onSelect,
  isOpen,
  onOpen,
  onClose,
  dragDirection = 'bottom',
}: ProductSelectorProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { categories, query, setQuery } = useProductSelector(maxTier);
  const { position, move, isActive, clearPosition, enterAtStart, measureRef } =
    useGridNavigation({ sections: categories });

  // ── Submission target ─────────────────────────────────────────────────────
  // Navigated → that item. Else with a query → first match {0,0}. Else null.
  // Empty input with no navigation means: nothing is targeted. The user has
  // to either type or press ArrowDown to establish a target.
  const submissionTarget = position
    ? (categories[position.sectionIndex]?.products[position.itemIndex] ?? null)
    : query
      ? (categories[0]?.products[0] ?? null)
      : null;

  const ghost = submissionTarget
    ? deriveGhost(query, submissionTarget.product.name)
    : { matched: false, prefix: '', suffix: '' };

  // ── Open/close housekeeping ───────────────────────────────────────────────
  // When the selector closes, clear navigation state so reopening is fresh.
  useEffect(() => {
    if (!isOpen) clearPosition();
  }, [isOpen, clearPosition]);

  // Empty query (with no deliberate navigation) must not pre-select. We
  // detect "deliberate navigation" by whether a grid tile currently has DOM
  // focus — if not, and the query is empty, drop position.
  useEffect(() => {
    if (query) return;
    const activeIsTile =
      gridRef.current?.contains(document.activeElement) ?? false;
    if (!activeIsTile && position) clearPosition();
  }, [query, position, clearPosition]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(
    (product: Product) => {
      onSelect(product);
      setQuery('');
      clearPosition();
      onClose();
    },
    [onSelect, setQuery, clearPosition, onClose],
  );

  // ── Roving tabindex / focus the current tile ──────────────────────────────
  // Whenever position changes AND a tile already has focus (we're navigating
  // within the grid), move DOM focus to the new tile. We don't focus on
  // initial entry from the input — that's handled explicitly by ArrowDown.
  useEffect(() => {
    if (!position) return;
    const activeIsTile =
      gridRef.current?.contains(document.activeElement) ?? false;
    if (!activeIsTile) return;
    tileRefs.current.get(keyOf(position))?.focus();
  }, [position]);

  // ── Click-to-accept on the ghost suffix ───────────────────────────────────
  // Clicking a suffix character commits all characters up to and including
  // that one into the query, then focuses the input with the cursor at the
  // end. Uses a flag-ref + layout effect rather than focusing imperatively
  // in the click handler: the input value reflects React state, which won't
  // have updated yet at the moment of the click.
  const clickPendingRef = useRef(false);

  const handleSuffixClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      const target = e.target as HTMLElement;
      const indexStr = target.dataset.suffixIndex;
      if (indexStr === undefined) return;
      const i = parseInt(indexStr, 10);
      if (Number.isNaN(i)) return;
      clickPendingRef.current = true;
      setQuery(query + ghost.suffix.slice(0, i + 1));
    },
    [query, ghost.suffix, setQuery],
  );

  useLayoutEffect(() => {
    if (!clickPendingRef.current) return;
    clickPendingRef.current = false;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [query]);

  // ── Key handlers ──────────────────────────────────────────────────────────

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          // Enter the grid. If position exists, focus that tile; otherwise
          // start at {0,0}. The tile element is already in the DOM (grid
          // mounted with isOpen) so we can focus synchronously — using rAF
          // here would let the next keypress race the focus transition and
          // get routed to the input instead of the grid.
          const target = position ?? enterAtStart();
          if (!target) return;
          tileRefs.current.get(keyOf(target))?.focus();
          break;
        }
        case 'ArrowRight': {
          const el = e.currentTarget;
          const atEnd =
            el.selectionStart === el.selectionEnd &&
            el.selectionStart === query.length;
          if (!atEnd || !ghost.matched || !ghost.suffix) return;
          e.preventDefault();
          setQuery(query + ghost.suffix[0]);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (!submissionTarget || submissionTarget.status !== 'selectable')
            return;
          if (!query) return; // empty input never submits
          submit(submissionTarget.product);
          break;
        }
        case 'Escape': {
          // Could also be on the wrapper; placing it here is fine since the
          // input is the most likely focused element.
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [
      position,
      enterAtStart,
      query,
      ghost,
      submissionTarget,
      submit,
      setQuery,
      onClose,
    ],
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          move({ rows: 1 });
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const result = move({ rows: -1 });
          if (result.kind === 'exitUp') {
            // Leave the grid upward — focus the input, cursor at end of query.
            const el = inputRef.current;
            if (el) {
              el.focus();
              const end = el.value.length;
              el.setSelectionRange(end, end);
            }
          }
          break;
        }
        case 'ArrowLeft':
          e.preventDefault();
          move({ cols: -1 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          move({ cols: 1 });
          break;
        case 'Enter': {
          e.preventDefault();
          if (!submissionTarget || submissionTarget.status !== 'selectable')
            return;
          submit(submissionTarget.product);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [move, submissionTarget, submit, onClose],
  );

  // ── Misc ──────────────────────────────────────────────────────────────────

  const { height: gridHeight, handleDragStart } = useDraggableHeight({
    direction: dragDirection,
  });

  const totalCount = categories.reduce((sum, c) => sum + c.products.length, 0);
  const enabledCount = categories.reduce(
    (sum, c) =>
      sum + c.products.filter((p) => p.status === 'selectable').length,
    0,
  );

  const dragHandle = (
    <div
      onPointerDown={handleDragStart}
      className='h-1.5 cursor-ns-resize bg-neutral-800 hover:bg-neutral-600 transition-colors shrink-0 my-1'
      title='Drag to resize'
    />
  );

  return (
    <div>
      {/* Wrapper owns the shared typography. Both input and overlay inherit
          font + size, so their text metrics align. */}
      <div className='relative w-full mt-2 text-sm'>
        {/* Ghost overlay. Box geometry (inset-0 + matching px-3 py-2) makes
            its content area identical to the input's. pointer-events-none
            lets clicks pass through to the input EXCEPT on the suffix wrapper,
            which opts back in to receive click-to-accept. */}
        <div
          aria-hidden='true'
          className='absolute inset-0 px-3 py-2 pointer-events-none flex items-center whitespace-pre'
        >
          <span className='invisible'>{query}</span>
          {ghost.matched && (
            <span
              className='text-neutral-500 pointer-events-auto cursor-text'
              onClick={handleSuffixClick}
            >
              {Array.from(ghost.suffix).map((ch, i) => (
                <span
                  key={i}
                  data-suffix-index={i}
                >
                  {ch}
                </span>
              ))}
            </span>
          )}
          {ghost.matched && ghost.prefix && (
            <span className='text-neutral-600'> ({ghost.prefix.trim()})</span>
          )}
        </div>
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onOpen}
          onKeyDown={handleInputKeyDown}
          placeholder={
            query || ghost.matched ? '' : `Search ${enabledCount} products...`
          }
          // font:inherit forces the input to use the wrapper's font-family
          // instead of the browser's default input font, which would drift
          // the ghost out of alignment.
          style={{ font: 'inherit' }}
          className='block w-full px-3 py-2 rounded border border-neutral-600 bg-neutral-800 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400'
        />
      </div>

      {maxTier !== null && (
        <div className='mt-2 text-xs text-neutral-400'>
          {enabledCount} of {totalCount} available at tier {maxTier}
        </div>
      )}

      {isOpen && (
        <>
          {dragDirection === 'top' && dragHandle}

          <div
            ref={gridRef}
            onKeyDown={handleGridKeyDown}
            style={{ height: gridHeight }}
            className='overflow-y-auto'
          >
            <div className='py-1' />
            {/* Measurement wrapper — its width is the true layout width that
                the inner CSS grids use to compute column count. Excludes the
                scrollbar gutter of the outer scroll container. */}
            <div ref={measureRef}>
              {categories.map((section, sectionIndex) => (
                <div key={section.name}>
                  <div className='py-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider sticky top-0 bg-neutral-900'>
                    {section.name}
                  </div>
                  <div
                    className='grid py-2 gap-1'
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN_WIDTH}px, 1fr))`,
                    }}
                  >
                    {section.products.map((item, itemIndex) => {
                      const active = isActive(sectionIndex, itemIndex);
                      const disabled = item.status !== 'selectable';
                      return (
                        <button
                          key={item.product.className}
                          ref={(el) => {
                            const k = keyOf({ sectionIndex, itemIndex });
                            if (el) tileRefs.current.set(k, el);
                            else tileRefs.current.delete(k);
                          }}
                          onClick={() => !disabled && submit(item.product)}
                          tabIndex={active ? 0 : -1}
                          title={
                            disabled
                              ? `Requires tier ${item.product.tier}`
                              : item.product.name
                          }
                          className={`
                          flex flex-col items-center justify-center
                          p-1 rounded text-xs text-center
                          border transition-colors
                          ${active ? 'ring-1 ring-white' : ''}
                          ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed border-neutral-700 text-neutral-500'
                              : 'cursor-pointer border-neutral-600 text-neutral-200 hover:border-neutral-400'
                          }
                        `}
                        >
                          <span className='truncate w-full'>
                            {item.product.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className='px-3 py-6 text-sm text-neutral-500 text-center'>
                  No products match "{query}"
                </div>
              )}
            </div>
          </div>

          {dragDirection === 'bottom' && dragHandle}
        </>
      )}
    </div>
  );
}

function keyOf({ sectionIndex, itemIndex }: GridPosition) {
  return `${sectionIndex}-${itemIndex}`;
}
