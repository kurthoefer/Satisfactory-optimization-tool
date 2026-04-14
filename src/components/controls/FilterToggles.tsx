/**
 * The actual filter controls — tier slider, boolean toggles.
 * Shared between DesktopControls and MobileControls.
 * Consumed by both but shown/hidden differently per form factor.
 */

import type { TraversalRules } from '@/hooks/useTraversalRules';
import type { TraversalConstraints } from '@/hooks/useTraversalRules';

const MAX_TIER = 9;

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
      <div className='flex flex-col gap-1'>
        <div className='flex justify-between items-center'>
          <label className='text-xs text-neutral-400'>Max Tier</label>
          <span className='text-xs text-neutral-300'>
            {rules.maxTier === null ? 'All' : rules.maxTier}
          </span>
        </div>
        <input
          type='range'
          min={constraints.minTier}
          max={MAX_TIER}
          value={rules.maxTier ?? MAX_TIER}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onSetRule('maxTier', val === MAX_TIER ? null : val);
          }}
          className='w-full accent-neutral-400'
        />
      </div>

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
        w-8 h-4 rounded-full transition-colors relative
        ${checked ? 'bg-neutral-400' : 'bg-neutral-700'}
      `}
      >
        <span
          className={`
          absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
        `}
        />
      </span>
    </button>
  );
}
