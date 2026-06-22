// ============================================================================
// lib/session/useSession.ts
//
// Read-side adapter for the panel: the tree, where we are, and the current
// root→leaf lineage (what the horizontal strip renders). Navigation is NOT here
// — fork/goto need the live working state (config + pins), so they live in the
// orchestration hook (useSessionNav) that can read them.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { sessionStore, lineageOf } from './sessionStore';

export function useSession() {
  const snap = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
  );

  return {
    nodes: snap.nodes,
    currentId: snap.currentId,
    /** Root → current. The breadcrumb the strip walks left-to-right. */
    lineage: lineageOf(snap.nodes, snap.currentId),
    count: snap.nodes.size,
  };
}
