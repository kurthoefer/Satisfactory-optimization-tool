/**
 * imageRegistry.ts
 *
 * Framework-agnostic source of truth for image load state, keyed by URL.
 * No React, no imports — it takes a URL string and nothing else.
 *
 * Phase 1 implements the DOM path only: it drives an HTMLImageElement through
 * `.decode()` to track state. There is NO ImageBitmap here yet — that's the
 * Phase 2 viz path, which will add a second load entrypoint that stores a
 * decoded bitmap on the same entry (the `bitmap?` seam we discussed).
 *
 * Design notes:
 *  - The cache stores only *settled* results (loaded / error). An in-flight
 *    request lives in `inflight`. A URL that is missing from the cache is, by
 *    definition, "loading" — see getEntry().
 *  - getEntry() returns a stable reference between transitions so React's
 *    useSyncExternalStore can bail out of unnecessary re-renders.
 */

export type ImageEntry =
  | { status: 'loading' }
  | { status: 'loaded' } // DOM path stores no payload; the browser holds the bytes.
  | { status: 'error'; error: Error };

/**
 * Shared, frozen sentinels. Returning the SAME reference for unchanged state is
 * what keeps useSyncExternalStore quiet — a fresh `{ status: 'loading' }` object
 * on every read would look like a change and loop / thrash renders.
 */
const IDLE: ImageEntry = Object.freeze({ status: 'loading' });
const LOADED: ImageEntry = Object.freeze({ status: 'loaded' });

const cache = new Map<string, ImageEntry>(); // settled results only
const inflight = new Map<string, Promise<void>>(); // dedup of in-flight loads
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/** Subscribe to any state change. Returns an unsubscribe fn. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Synchronous snapshot for one URL. A cache miss maps to the shared IDLE
 * sentinel, so consumers see 'loading' for both "never requested" and
 * "in flight" — which is exactly correct — with a stable reference either way.
 */
export function getEntry(url: string): ImageEntry {
  return cache.get(url) ?? IDLE;
}

/**
 * Kick off (or join) a DOM-path load. Idempotent and deduped by URL.
 * Resolves when the image is fully decoded and paint-ready; rejects on failure.
 */
export function loadImage(url: string): Promise<void> {
  const existing = inflight.get(url);
  if (existing) return existing; // join the in-flight decode, don't start a second

  const settled = cache.get(url);
  if (settled?.status === 'loaded') return Promise.resolve();
  // A prior 'error' falls through here on purpose: re-calling loadImage retries.

  const img = new Image();
  // No crossOrigin: the DOM path never reads pixels, so nothing taints and CORS
  // isn't needed. The Phase 2 ImageBitmap path WILL set crossOrigin = 'anonymous'
  // so the decoded pixels can be uploaded to canvas/WebGL without tainting.
  img.src = url;

  const promise = img
    .decode() // resolves only when decoded & ready -> this is what kills the flash
    .then(() => {
      cache.set(url, LOADED);
      emit();
    })
    .catch((e: unknown) => {
      cache.set(url, { status: 'error', error: toError(e) });
      emit();
    })
    .finally(() => {
      inflight.delete(url);
    });

  // Note: we do NOT write a 'loading' entry. getEntry() already reports a miss
  // as IDLE/'loading', so there's nothing to emit until the load settles.
  inflight.set(url, promise);
  return promise;
}

/** Warm the cache ahead of render (e.g. before a grid of icons mounts). */
export function preload(urls: Iterable<string>): void {
  for (const url of urls) void loadImage(url);
}
