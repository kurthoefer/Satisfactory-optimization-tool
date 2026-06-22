// ============================================================================
// hooks/useSessionNav.ts
//
// Two pieces over the same model:
//
//   useSessionNav()  — the actions (reRoot, goto). They ONLY navigate; they
//                      never mutate currentId or pins. Safe to call anywhere.
//   useSessionSync() — the reconcile engine. Mount ONCE (in Visualization). It
//                      makes the store follow the URL, which is what makes the
//                      browser's back/forward work with zero special-casing.
//
// Flow is one-directional: actions write the URL → the engine turns URL changes
// into store + pin updates. Because the engine keys on the URL, it can't tell
// (and doesn't care) whether a change came from a button or the back button.
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';

import { sessionStore, type StampId } from '@/lib/session';
import { pinnedStore } from '@/lib/pinned';
import {
  useTraversalRules,
  type TraversalConfig,
} from '@/hooks/useTraversalRules';

/** The identity half of a config — what re-rooting actually changes. */
type TargetRef = Pick<
  TraversalConfig,
  'targetClassName' | 'targetName' | 'targetSlug'
>;

// ---- actions ----------------------------------------------------------------

export function useSessionNav() {
  const { config, stampId, applyConfig } = useTraversalRules();

  // Re-root: create the child stamp (inherits ALL pins, carries filters), then
  // navigate to it. Pins are untouched here — they carry by definition.
  const reRoot = useCallback(
    (target: TargetRef) => {
      const parentId = stampId ?? sessionStore.getCurrentId();
      const nextConfig: TraversalConfig = { ...config, ...target };
      const childId = sessionStore.createChild(
        parentId,
        nextConfig,
        pinnedStore.getSnapshot(),
      );
      applyConfig(nextConfig, childId);
    },
    [config, stampId, applyConfig],
  );

  // Jump to an existing stamp: just navigate to it. The engine restores it.
  const goto = useCallback(
    (id: StampId) => {
      if (id === stampId) return; // already here
      const target = sessionStore.get(id);
      if (!target) return;
      applyConfig(target.config, id);
    },
    [stampId, applyConfig],
  );

  return { reRoot, goto };
}

// ---- reconcile engine (mount once) ------------------------------------------

export function useSessionSync() {
  const { config, stampId, applyConfig } = useTraversalRules();

  // The last position we actually loaded. At a transition this holds the
  // DEPARTING config — the URL's `config` has already moved to the arrival, so
  // we can't read the departing filters from it.
  const loaded = useRef<{ stampId: StampId; config: TraversalConfig } | null>(
    null,
  );

  // Keep the departing config fresh while we sit on a stamp. Filter toggles
  // change `config` but not `stampId`, so the transition effect won't see them;
  // this captures them for the next departure flush.
  useEffect(() => {
    if (loaded.current && loaded.current.stampId === stampId) {
      loaded.current.config = config;
    }
  }, [config, stampId]);

  // Transition: fires on stamp change and on first mount.
  useEffect(() => {
    // Cold start / reload / dangling id → seed a root and pin it into the URL.
    // The replace re-enters this effect with a valid stamp.
    if (stampId === null || !sessionStore.get(stampId)) {
      const rootId = sessionStore.init(config, pinnedStore.getSnapshot());
      applyConfig(config, rootId, { replace: true });
      return;
    }

    // Flush the stamp we're leaving: its config from the ref (URL has moved on),
    // its pins still live in pinnedStore (the restore below hasn't run yet).
    const prev = loaded.current;
    if (prev && prev.stampId !== stampId) {
      sessionStore.sync(prev.stampId, prev.config, pinnedStore.getSnapshot());
    }

    const target = sessionStore.get(stampId)!;
    sessionStore.setCurrent(stampId);
    pinnedStore.replace(target.pinnedIds);
    loaded.current = { stampId, config: target.config };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stampId]);
}
