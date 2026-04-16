/**
 * The actual filter controls — tier slider, boolean toggles.
 * Shared between DesktopControls and MobileControls.
 * Consumed by both but shown/hidden differently per form factor.
 */

import type { TraversalRules } from '@/hooks/useTraversalRules';
import type { TraversalConstraints } from '@/hooks/useTraversalRules';
import TierFilter from './TierFilter';

// const MAX_TIER = 9;

interface FilterTogglesProps {
  rules: TraversalRules;
  constraints: TraversalConstraints;
  onSetRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
}

export function FilterToggles({
  rules,
  constraints,
  onSetRule,
}: FilterTogglesProps) {
  return (
    <div className='flex flex-col gap-3 my-2'>
      {/* Max tier */}
      <TierFilter
        maxTier={rules.maxTier}
        minAllowedTier={constraints.minTier}
        onChange={(v) => onSetRule('maxTier', v)}
      />

      {/* Alternates */}
      <Toggle
        label='Alternate Recipes'
        checked={rules.includeAlternates}
        onChange={(v) => onSetRule('includeAlternates', v)}
      />

      {/* Converter */}
      <Toggle
        label='Converter Recipes'
        checked={rules.includeConverter}
        onChange={(v) => onSetRule('includeConverter', v)}
      />
    </div>
  );
}

// ─── Local toggle primitive ───────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className='flex items-center justify-between w-full text-xs text-neutral-300 hover:text-white transition-colors'
    >
      <span>{label}</span>
      <span
        className={`
          relative shrink-0 w-8 h-4 rounded-full transition-colors
          ${checked ? 'bg-neutral-400' : 'bg-neutral-700'}
        `}
      >
        <span
          className={`
            absolute top-0.5 bottom-0.5 aspect-square rounded-full bg-white transition-all
            ${checked ? 'right-0.5 left-auto' : 'left-0.5 right-auto'}
          `}
        />
      </span>
    </button>
  );
}
