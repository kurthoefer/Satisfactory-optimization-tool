// ============================================================================
// windowManager
//
// The single z-order authority for floating windows. Module-level singleton —
// no provider to wire in, same shape as lib/image's registry: a store plus a
// hook (useWindow) that reads it.
//
// Smallest correct version: a monotonic counter. Registering or raising a
// window assigns it the next-highest order, so the newest / most-recently
// focused window wins. This is already correct stacking for any number of
// windows; future concerns (remembered positions, minimize/restore, bounds,
// keyboard cycling) attach HERE without changing a single call site.
//
// The returned order values are RELATIVE (1, 2, 3, …). Apply them inside a
// window-layer stacking context (e.g. `isolation: isolate` on the container)
// so they never fight your tooltip / nav z-indices, no matter how high the
// counter climbs.
//
// Contract: each window's `id` must be unique.
// ============================================================================

type Listener = () => void;

const order = new Map<string, number>();
const listeners = new Set<Listener>();
let topZ = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

export const windowManager = {
  /** Register a window. New windows spawn on top. Idempotent per id. */
  register(id: string): void {
    if (order.has(id)) return;
    order.set(id, ++topZ);
    emit();
  },

  /** Remove a window (on unmount). */
  unregister(id: string): void {
    if (order.delete(id)) emit();
  },

  /** Bring a window to the front. No-op if it's already there. */
  raise(id: string): void {
    const current = order.get(id);
    if (current === undefined || current === topZ) return;
    order.set(id, ++topZ);
    emit();
  },

  /** This window's current stacking order (0 before it registers). */
  getOrder(id: string): number {
    return order.get(id) ?? 0;
  },

  /** Subscribe to order changes; returns an unsubscribe fn. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
