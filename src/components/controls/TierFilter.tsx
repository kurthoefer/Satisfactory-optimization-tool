import { getTierTokens, TIER_HOVER } from '@/styles/designTokens';

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function TierFilter({
  maxTier,
  minAllowedTier,
  onChange,
}: {
  maxTier: number | null;
  minAllowedTier: number | null;
  onChange: (tier: number | null) => void;
}) {
  const effective = maxTier ?? TIERS[TIERS.length - 1];

  return (
    <div className='flex items-center justify-between gap-1 w-[262px] mx-auto'>
      {TIERS.map((tier) => {
        const tokens = getTierTokens(tier);
        const isActive = tier === effective;
        const isFilled = tier < effective;
        const isLocked = minAllowedTier !== null && tier < minAllowedTier;

        return (
          <button
            key={tier}
            disabled={isLocked}
            onClick={() =>
              onChange(tier === TIERS[TIERS.length - 1] ? null : tier)
            }
            className={`
              w-6 h-6 rounded-full text-[10px] font-medium
              border transition-colors shrink-0
             ${
               isLocked
                 ? `${tokens.muted} border-transparent cursor-not-allowed opacity-30`
                 : isActive || isFilled
                   ? `${tokens.text} ${tokens.border} ${tokens.bg} hover:brightness-125`
                   : `${tokens.muted} border-transparent ${TIER_HOVER[tier]}`
             }
            `}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}
