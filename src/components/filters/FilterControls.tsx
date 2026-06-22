import type {
  TraversalRules,
  TraversalConstraints,
} from '@/hooks/useTraversalRules';
import TierFilter from './TierFilter';
import { FilterToggles } from './FilterToggles';

// The filter INPUTS as one unit — what the controls panel drops in. FilterSummary
// is intentionally NOT here; it sits higher in the panel (above the selector) and
// is placed by the panel directly.

interface FilterControlsProps {
  rules: TraversalRules;
  constraints: TraversalConstraints;
  onSetRule: <K extends keyof TraversalRules>(
    key: K,
    value: TraversalRules[K],
  ) => void;
}

export function FilterControls({
  rules,
  constraints,
  onSetRule,
}: FilterControlsProps) {
  return (
    <div className='flex flex-col gap-3'>
      <TierFilter
        maxTier={rules.maxTier}
        minAllowedTier={constraints.minTier}
        onChange={(v) => onSetRule('maxTier', v)}
      />
      <FilterToggles
        rules={rules}
        onSetRule={onSetRule}
      />
    </div>
  );
}
