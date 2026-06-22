// ============================================================================
// useWindow
//
// React adapter for the window manager. Registers the window on mount, exposes
// its stacking order, and a raise() to bring it to the front. Reads per-id via
// useSyncExternalStore, so raising one window only re-renders the window whose
// order actually changed — not every window on screen.
// ============================================================================

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { windowManager } from './windowManager';

export interface WindowHandle {
  /** z-index for the window root (apply inside a window-layer stacking context). */
  z: number;
  /** Bring this window to the front — call on pointer-down / focus. */
  raise: () => void;
}

export function useWindow(id: string): WindowHandle {
  useEffect(() => {
    windowManager.register(id);
    return () => windowManager.unregister(id);
  }, [id]);

  const z = useSyncExternalStore(windowManager.subscribe, () =>
    windowManager.getOrder(id),
  );

  const raise = useCallback(() => windowManager.raise(id), [id]);

  return { z, raise };
}
