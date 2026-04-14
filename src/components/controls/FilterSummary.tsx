/**
 * Compact read-only display of the current TraversalRules.
 * Shared between DesktopControls and MobileControls.
 * Always visible — gives the user a quick read of active filters
 * without opening the full toggle panel.
 */

import type { TraversalConfig } from '@/hooks/useTraversalRules';

interface FilterSummaryProps {
  config: TraversalConfig;
}

export function FilterSummary({ config }: FilterSummaryProps) {
  const { rules, targetName } = config;

  const parts: string[] = [];

  if (targetName) {
    parts.push(targetName);
  } else {
    parts.push('No product selected');
  }

  if (rules.maxTier !== null) {
    parts.push(`Tier ${rules.maxTier}`);
  }

  if (rules.includeAlternates) {
    parts.push('Alternates');
  }

  if (!rules.includeConverter) {
    parts.push('No Converter');
  }

  return (
    <div className='flex flex-wrap gap-1.5 items-center'>
      {parts.map((part, i) => (
        <span
          key={i}
          className='text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700'
        >
          {part}
        </span>
      ))}
    </div>
  );
}
