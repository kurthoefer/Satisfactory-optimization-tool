/**
 * Orchestrates product selection. It composes the data, navigation, and resize
 * hooks; routes keys between the GhostInput and the SelectorGrid; and owns
 * submit + open/close. Rendering is delegated to two children:
 *   - GhostInput   — search field + ghost autocomplete overlay
 *   - SelectorGrid — scrollable grid of ProductTiles + the lazy-load observer
 *
 * Keyboard story (unchanged):
 *   - Input owns ArrowDown (dive into grid), ArrowRight (ghost-accept),
 *     Enter (submit ghosted target), Escape (close).
 *   - Grid owns Arrows (move), Enter (submit current tile), Escape (close);
 *     ArrowUp at the top row exits back up to the input.
 *   - Focus is DOM-driven via roving tabindex: exactly one tile has
 *     tabIndex=0; on position change we .focus() the new current tile.
 */

import { useRef, useCallback, useEffect } from 'react';
import { useProductSelector } from './useProductSelector';
import { useGridNavigation, type GridPosition } from './useGridNavigation';
import { useDraggableHeight } from './useDraggableHeight';
import { deriveGhost } from './deriveGhost';
import { GhostInput, type GhostInputHandle } from './GhostInput';
import { SelectorGrid } from './SelectorGrid';
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
  const ghostInputRef = useRef<GhostInputHandle>(null);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const { categories, query, setQuery } = useProductSelector(maxTier);
  const { position, move, isActive, clearPosition, enterAtStart, measureRef } =
    useGridNavigation({ sections: categories });

  // Navigated → that item. Else with a query → first match {0,0}. Else null.
  const submissionTarget = position
    ? (categories[position.sectionIndex]?.products[position.itemIndex] ?? null)
    : query
      ? (categories[0]?.products[0] ?? null)
      : null;

  const ghost = submissionTarget
    ? deriveGhost(query, submissionTarget.product.name)
    : { matched: false, prefix: '', suffix: '' };

  // Clear navigation when closed so reopening is fresh.
  useEffect(() => {
    if (!isOpen) clearPosition();
  }, [isOpen, clearPosition]);

  // Empty query with no deliberate grid focus must not keep a target.
  useEffect(() => {
    if (query) return;
    const activeIsTile =
      gridRef.current?.contains(document.activeElement) ?? false;
    if (!activeIsTile && position) clearPosition();
  }, [query, position, clearPosition]);

  // Roving tabindex: when position changes WHILE a tile is focused, move DOM
  // focus to the new tile. Not on initial entry — ArrowDown handles that.
  useEffect(() => {
    if (!position) return;
    const activeIsTile =
      gridRef.current?.contains(document.activeElement) ?? false;
    if (!activeIsTile) return;
    tileRefs.current.get(keyOf(position))?.focus();
  }, [position]);

  const submit = useCallback(
    (product: Product) => {
      onSelect(product);
      setQuery('');
      clearPosition();
      onClose();
    },
    [onSelect, setQuery, clearPosition, onClose],
  );

  // SelectorGrid registers each tile's DOM node here for roving-tabindex focus.
  const registerTile = useCallback(
    (sectionIndex: number, itemIndex: number, el: HTMLButtonElement | null) => {
      const k = keyOf({ sectionIndex, itemIndex });
      if (el) tileRefs.current.set(k, el);
      else tileRefs.current.delete(k);
    },
    [],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          // Tile is already in the DOM (grid mounted with isOpen), so focus
          // synchronously — rAF here would let the next keypress race the
          // focus transition and get routed back to the input.
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
          if (result.kind === 'exitUp') ghostInputRef.current?.focusEnd();
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
      <GhostInput
        ref={ghostInputRef}
        query={query}
        ghost={ghost}
        placeholder={
          query || ghost.matched ? '' : `Search ${enabledCount} products...`
        }
        onQueryChange={setQuery}
        onFocus={onOpen}
        onKeyDown={handleInputKeyDown}
      />

      {maxTier !== null && (
        <div className='mt-2 text-xs text-neutral-400'>
          {enabledCount} of {totalCount} available at tier {maxTier}
        </div>
      )}

      {isOpen && (
        <>
          {dragDirection === 'top' && dragHandle}
          <SelectorGrid
            categories={categories}
            query={query}
            gridRef={gridRef}
            measureRef={measureRef}
            height={gridHeight}
            isActive={isActive}
            registerTile={registerTile}
            onSelect={submit}
            onKeyDown={handleGridKeyDown}
          />
          {dragDirection === 'bottom' && dragHandle}
        </>
      )}
    </div>
  );
}

function keyOf({ sectionIndex, itemIndex }: GridPosition) {
  return `${sectionIndex}-${itemIndex}`;
}
