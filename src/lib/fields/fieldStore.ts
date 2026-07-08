/**
 * lib/fields/fieldStore.ts
 *
 * Stateful, framework-agnostic. Pattern-identical to lib/pinned (useSync
 * ExternalStore twin). Holds VIEW-state — what's collapsed, which lenses are
 * lit — which is an attention-tier concern, not layout truth.
 *
 * Collapse is now THIS: flip a flag. Not the old "cheap" starburst render.
 * The fx/fy convergence still animates (see forceLayout), driven by the flag;
 * the goo compresses toward one dense blob on its own because the field
 * re-projects each tick.
 */

import type { FieldId, FieldSource } from '@/types/view';

type Listener = () => void;

export interface FieldState {
  /** Collapsed FieldGroup ids (e.g. "scc:5"). */
  readonly collapsed: ReadonlySet<FieldId>;
  /** Which sources are lit — the salience gate at the lens level. */
  readonly enabled: ReadonlySet<FieldSource>;
}

let state: FieldState = {
  collapsed: new Set(),
  enabled: new Set<FieldSource>(['scc']), // SCC is the only lens on at boot
};

const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const fieldStore = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  getSnapshot(): FieldState {
    return state;
  },

  isCollapsed(id: FieldId): boolean {
    return state.collapsed.has(id);
  },

  toggleCollapse(id: FieldId): void {
    const next = new Set(state.collapsed);
    next.has(id) ? next.delete(id) : next.add(id);
    state = { ...state, collapsed: next };
    emit();
  },

  toggleLens(source: FieldSource): void {
    const next = new Set(state.enabled);
    next.has(source) ? next.delete(source) : next.add(source);
    state = { ...state, enabled: next };
    emit();
  },
};
