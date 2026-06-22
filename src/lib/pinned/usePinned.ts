// ============================================================================
// usePinned / useIsPinned
//
// React adapters over pinnedStore. Two of them, for two different needs:
//
//   usePinned()      the whole set + mutators — for the shelf panel, which
//                    re-renders whenever anything is pinned or unpinned.
//   useIsPinned(id)  reactive membership for ONE id — re-renders only when that
//                    id flips. Use this for a per-entity pin toggle (e.g. the
//                    peek tooltip); never usePinned() for that, or you'll
//                    re-render on every unrelated change.
//
// Non-React callers (the D3 renderer, click handlers) skip these and use
// pinnedStore directly.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { pinnedStore } from './pinnedStore';

export function usePinned() {
  const ids = useSyncExternalStore(
    pinnedStore.subscribe,
    pinnedStore.getSnapshot,
  );
  return {
    ids,
    count: ids.length,
    toggle: pinnedStore.toggle,
    add: pinnedStore.add,
    remove: pinnedStore.remove,
    clear: pinnedStore.clear,
  };
}

export function useIsPinned(id: string): boolean {
  return useSyncExternalStore(pinnedStore.subscribe, () => pinnedStore.has(id));
}
