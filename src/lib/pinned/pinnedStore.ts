// ============================================================================
// pinnedStore
//
// The set of entity ids the user has pinned — your third state tier (URL config
// and transient hover being the other two). Module-level singleton, framework-
// agnostic, same shape as lib/image's registry and lib/windows: a store plus
// hooks that read it.
//
// It holds ids only, so it's entity-agnostic (products and recipes alike). It is
// the single source of truth for "what's pinned" — a node looking highlighted is
// just that node rendering its own membership, so there is no separate highlight
// state to keep in sync.
//
// Because it's its own store (not derived from the graph or the URL), pins
// survive re-rooting and re-filtering — the "shelf, not lens" behavior. And it's
// the natural seam for later persistence/sharing: add hydrate/serialize here and
// no consumer changes.
// ============================================================================

type Listener = () => void;

const ids = new Set<string>();
const listeners = new Set<Listener>();
let snapshot: readonly string[] = [];

function commit(): void {
  snapshot = Object.freeze([...ids]); // new immutable ref each change
  for (const listener of listeners) listener();
}

export const pinnedStore = {
  /** Pin if absent, unpin if present — the click interaction. */
  toggle(id: string): void {
    if (!ids.delete(id)) ids.add(id);
    commit();
  },

  add(id: string): void {
    if (!ids.has(id)) {
      ids.add(id);
      commit();
    }
  },

  remove(id: string): void {
    if (ids.delete(id)) commit();
  },

  clear(): void {
    if (ids.size) {
      ids.clear();
      commit();
    }
  },

  replace(next: Iterable<string>) {
    ids.clear();
    for (const id of next) ids.add(id);
    commit();
  },

  /** Imperative membership check — for the D3 renderer / non-React callers. */
  has(id: string): boolean {
    return ids.has(id);
  },

  /** Stable immutable snapshot — safe for useSyncExternalStore. */
  getSnapshot(): readonly string[] {
    return snapshot;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
