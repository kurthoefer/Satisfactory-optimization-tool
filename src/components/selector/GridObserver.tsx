import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

/**
 * Shared grid observation system.
 *
 * The grid owns ONE IntersectionObserver whose `root` is its scroll container,
 * because the scroll container is what defines "occluded." Tiles don't each
 * spin up their own observer — they subscribe to this one via useInView. That
 * gives us the one-observer-many-targets pattern the browser is built for, and
 * it's the only place that knows the correct scroll root.
 */

type ObserveFn = (
  el: Element,
  onChange: (inView: boolean) => void,
) => () => void;

const GridObserverContext = createContext<ObserveFn | null>(null);

interface GridObserverProviderProps {
  /** Ref to the scroll container — the observer's root / occlusion boundary. */
  rootRef: RefObject<Element | null>;
  /** Load-ahead buffer: start loading this far before a tile scrolls in. */
  rootMargin?: string;
  children: ReactNode;
}

export function GridObserverProvider({
  rootRef,
  rootMargin = '200px',
  children,
}: GridObserverProviderProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const callbacks = useRef(new Map<Element, (inView: boolean) => void>());

  const observe = useCallback<ObserveFn>(
    (el, onChange) => {
      // Lazily create the observer on first use. A tile's effect runs after the
      // scroll container is mounted, so rootRef.current is set by the time the
      // first observe() lands — this sidesteps child-effects-run-before-parent.
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              callbacks.current.get(entry.target)?.(entry.isIntersecting);
            }
          },
          { root: rootRef.current, rootMargin },
        );
      }
      const observer = observerRef.current;
      callbacks.current.set(el, onChange);
      observer.observe(el);
      return () => {
        callbacks.current.delete(el);
        observer.unobserve(el);
      };
    },
    [rootRef, rootMargin],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      callbacks.current.clear();
    };
  }, []);

  return (
    <GridObserverContext.Provider value={observe}>
      {children}
    </GridObserverContext.Provider>
  );
}

/**
 * Returns whether `ref`'s element has come into view. Latches to true on first
 * sighting and stops observing — we load once and never unload, so there's no
 * reason to keep watching. With no provider (a tile used outside a grid) it
 * defaults to true, i.e. eager loading.
 */
export function useInView(ref: RefObject<Element | null>): boolean {
  const observe = useContext(GridObserverContext);
  const [inView, setInView] = useState(observe === null);

  useEffect(() => {
    if (!observe) return;
    const el = ref.current;
    if (!el) return;
    const unobserve = observe(el, (visible) => {
      if (visible) {
        setInView(true);
        unobserve(); // latch: load once, then stop watching this tile
      }
    });
    return unobserve;
  }, [observe, ref]);

  return inView;
}
