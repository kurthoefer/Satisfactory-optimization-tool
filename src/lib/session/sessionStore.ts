// ============================================================================
// lib/session/sessionStore.ts
//
// The session's history: a branching tree of "stamps" (moments). Pure and
// framework-agnostic, like pinnedStore. It does NOT drive navigation and is not
// an authority — the URL is. This store just holds the tree and a `currentId`
// that mirrors the URL's stamp pointer. The reconcile engine in useSessionSync
// is the ONLY writer of currentId, so "current" always follows the URL.
//
// Mutators are deliberately small and side-effect-free so the engine can compose
// them: create a child, flush a stamp's latest state, point current at a stamp.
// ============================================================================

import type { TraversalConfig } from '@/hooks/useTraversalRules';

export type StampId = string;

export interface Stamp {
  id: StampId;
  parentId: StampId | null; // null = a root
  config: TraversalConfig; // target + filters, as of last time we were here
  pinnedIds: readonly string[]; // the shelf, as of last time we were here
  t: number; // created-at, for ordering/labels
}

export interface SessionSnapshot {
  nodes: ReadonlyMap<StampId, Stamp>;
  currentId: StampId | null;
}

// ---- internal mutable state -------------------------------------------------

const nodes = new Map<StampId, Stamp>();
let currentId: StampId | null = null;
let seq = 0;

const listeners = new Set<() => void>();

// Cached immutable snapshot, rebuilt only on mutation — same discipline as
// pinnedStore's frozen array, so useSyncExternalStore sees a new reference
// exactly when something changed.
let snapshot: SessionSnapshot = { nodes: new Map(nodes), currentId };

function emit() {
  snapshot = { nodes: new Map(nodes), currentId };
  listeners.forEach((l) => l());
}

function nextId(): StampId {
  return `s${seq++}`;
}

// ---- public store -----------------------------------------------------------

export const sessionStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): SessionSnapshot {
    return snapshot;
  },

  getCurrentId(): StampId | null {
    return currentId;
  },

  get(id: StampId): Stamp | undefined {
    return nodes.get(id);
  },

  /**
   * Seed a root from the working state. Idempotent: if the tree already has
   * nodes (a live session), returns the existing root rather than re-seeding.
   * Called by the reconcile engine on cold start / reload.
   */
  init(config: TraversalConfig, pinnedIds: readonly string[]): StampId {
    if (nodes.size > 0) return currentId ?? nodes.keys().next().value!;
    const id = nextId();
    nodes.set(id, {
      id,
      parentId: null,
      config,
      pinnedIds: [...pinnedIds],
      t: Date.now(),
    });
    currentId = id;
    emit();
    return id;
  },

  /**
   * Add a child stamp and return its id. Does NOT touch currentId — the engine
   * sets current after the URL navigates to the new stamp.
   */
  createChild(
    parentId: StampId | null,
    config: TraversalConfig,
    pinnedIds: readonly string[],
  ): StampId {
    const id = nextId();
    nodes.set(id, {
      id,
      parentId,
      config,
      pinnedIds: [...pinnedIds],
      t: Date.now(),
    });
    emit();
    return id;
  },

  /** Overwrite a stamp's config + pins. Flushes the departing stamp's latest state. */
  sync(id: StampId, config: TraversalConfig, pinnedIds: readonly string[]) {
    const s = nodes.get(id);
    if (!s) return;
    nodes.set(id, { ...s, config, pinnedIds: [...pinnedIds] });
    emit();
  },

  /** Point currentId at a stamp. ONLY the reconcile engine calls this. */
  setCurrent(id: StampId) {
    if (currentId === id) return;
    currentId = id;
    emit();
  },
};

// ---- pure selectors ---------------------------------------------------------

/** Root → node path. Drives the breadcrumb strip. */
export function lineageOf(
  nodes: ReadonlyMap<StampId, Stamp>,
  id: StampId | null,
): Stamp[] {
  const path: Stamp[] = [];
  let cur = id;
  while (cur !== null) {
    const n = nodes.get(cur);
    if (!n) break;
    path.unshift(n);
    cur = n.parentId;
  }
  return path;
}

/** Direct children of a stamp, oldest first. A node with >1 child is a branch. */
export function childrenOf(
  nodes: ReadonlyMap<StampId, Stamp>,
  id: StampId,
): Stamp[] {
  const out: Stamp[] = [];
  for (const n of nodes.values()) if (n.parentId === id) out.push(n);
  return out.sort((a, b) => a.t - b.t);
}
