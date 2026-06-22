import type { TraversalRules } from '@/hooks/useTraversalRules';
import { Toggle } from './Toggle';

// The boolean recipe filters only. Tier lives beside this in FilterControls,
// not inside it. New boolean filters land here.

interface FilterTogglesProps {
  rules: TraversalRules;
  onSetRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
}

export function FilterToggles({ rules, onSetRule }: FilterTogglesProps) {
  return (
    <div className='flex flex-col gap-3'>
      <Toggle
        label='Alternate Recipes'
        checked={rules.includeAlternates}
        onChange={(v) => onSetRule('includeAlternates', v)}
      />
      <Toggle
        label='Converter Recipes'
        checked={rules.includeConverter}
        onChange={(v) => onSetRule('includeConverter', v)}
      />
      <Toggle
        label='Packager Recipes'
        checked={rules.includePackager}
        onChange={(v) => onSetRule('includePackager', v)}
      />
    </div>
  );
}
