import type { RefObject } from 'react';

/**
 * STUB — returns `true` (eager) so tiles load immediately during development
 * and you can test skeleton/styling end to end.
 *
 * Step 2 replaces ONLY this file's body with the real implementation: the grid
 * owns one IntersectionObserver (root = its scroll container, rootMargin for
 * the load-ahead buffer) and exposes it via context; this hook registers the
 * element and returns its live visibility. ProductTile does not change — it
 * already passes `active={inView}` to LoadedImage, so flipping this from a
 * constant to real visibility is all lazy loading needs.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useInView(ref: RefObject<Element | null>): boolean {
  return true;
}
