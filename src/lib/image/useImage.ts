/**
 * useImage.ts
 *
 * Read-only React adapter over the registry: it subscribes a component to the
 * load state for `src` via useSyncExternalStore and nothing more. Triggering
 * the load is now the caller's job (LoadedImage does it, gated on `active`),
 * which is exactly what lets one piece of state drive both eager and lazy
 * loading.
 */

import { useSyncExternalStore } from 'react';
import { subscribe, getEntry, type ImageEntry } from './imageRegistry';

export function useImage(src: string): ImageEntry {
  // getSnapshot returns a stable reference between transitions (real entry or
  // the IDLE sentinel), so React only re-renders on an actual state change.
  return useSyncExternalStore(subscribe, () => getEntry(src));
}
