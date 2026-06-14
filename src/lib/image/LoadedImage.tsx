/**
 * LoadedImage.tsx
 *
 * The DOM render adapter and successor to ImageWithFallback. It owns no load
 * state itself — that lives in the registry — so it's a thin consumer of
 * useImage(). Two render slots, `placeholder` and `error`, are where loading
 * polish plugs in; they default to your existing primitives (Skeleton and the
 * placeholder image) so this is a near drop-in for old ImageWithFallback sites.
 *
 * `active` controls *when* the load fires: true (default) = eager on mount;
 * pass a visibility flag (e.g. from useInView) to defer until on screen.
 *
 * Adjust the Skeleton import path to match your project layout.
 */

import { useEffect, type ImgHTMLAttributes, type ReactNode } from 'react';
import { useImage } from './useImage';
import { loadImage } from './imageRegistry';
import { Skeleton } from '@/components/ui/Skeleton';

type Slot = ReactNode | (() => ReactNode);

const DEFAULT_FALLBACK = '/images/icons/placeholder.png';

function renderSlot(slot: Slot | undefined): ReactNode {
  return typeof slot === 'function' ? slot() : slot;
}

export interface LoadedImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src'
> {
  src: string;
  alt: string;
  /**
   * Whether to load. Defaults to true (eager). Pass a visibility flag to defer
   * loading until the element nears the viewport (lazy loading).
   */
  active?: boolean;
  /** Shown while decoding. Defaults to <Skeleton>. */
  placeholder?: Slot;
  /** Shown on failure. Defaults to an <img> of `fallbackSrc`. */
  error?: Slot;
  /** Placeholder image used by the default error slot. */
  fallbackSrc?: string;
}

export function LoadedImage({
  src,
  alt,
  active = true,
  placeholder,
  error,
  fallbackSrc = DEFAULT_FALLBACK,
  className,
  ...imgProps
}: LoadedImageProps) {
  const entry = useImage(src); // read-only: subscribes to state

  // The trigger lives here now, not in the hook — that's the read/trigger
  // split. Eager by default; gated on `active` for lazy loading. loadImage is
  // deduped, so re-running when `active` flips from false -> true is safe.
  useEffect(() => {
    if (active) void loadImage(src);
  }, [src, active]);

  if (entry.status === 'loading') {
    return <>{renderSlot(placeholder) ?? <Skeleton className={className} />}</>;
  }

  if (entry.status === 'error') {
    return (
      <>
        {renderSlot(error) ?? (
          <img
            src={fallbackSrc}
            alt={alt}
            className={className}
            {...imgProps}
          />
        )}
      </>
    );
  }

  // 'loaded': bytes are decoded and HTTP-cached, so this <img> paints from
  // cache with no second flash. If the registry already knew this URL was
  // loaded (shown elsewhere first), we arrive here on the first render and
  // skip the placeholder entirely.
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      {...imgProps}
    />
  );
}
