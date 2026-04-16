export const DESIGN_TOKENS = {
  text: {
    tinyEmbellished:
      'inline-block text-[9px] tracking-[0.3em] uppercase font-black leading-none',
    body: 'text-base leading-relaxed text-slate-900',
  },
  animation: {
    quirky: 'animate-quirky',
  },
} as const;

export const TIER_COLORS = {
  0: {
    border: 'border-tier-0-border',
    text: 'text-tier-0-text',
    bg: 'bg-tier-0-bg',
    muted: 'text-tier-0-muted',
  },
  1: {
    border: 'border-tier-1-border',
    text: 'text-tier-1-text',
    bg: 'bg-tier-1-bg',
    muted: 'text-tier-1-muted',
  },
  2: {
    border: 'border-tier-2-border',
    text: 'text-tier-2-text',
    bg: 'bg-tier-2-bg',
    muted: 'text-tier-2-muted',
  },
  3: {
    border: 'border-tier-3-border',
    text: 'text-tier-3-text',
    bg: 'bg-tier-3-bg',
    muted: 'text-tier-3-muted',
  },
  4: {
    border: 'border-tier-4-border',
    text: 'text-tier-4-text',
    bg: 'bg-tier-4-bg',
    muted: 'text-tier-4-muted',
  },
  5: {
    border: 'border-tier-5-border',
    text: 'text-tier-5-text',
    bg: 'bg-tier-5-bg',
    muted: 'text-tier-5-muted',
  },
  6: {
    border: 'border-tier-6-border',
    text: 'text-tier-6-text',
    bg: 'bg-tier-6-bg',
    muted: 'text-tier-6-muted',
  },
  7: {
    border: 'border-tier-7-border',
    text: 'text-tier-7-text',
    bg: 'bg-tier-7-bg',
    muted: 'text-tier-7-muted',
  },
  8: {
    border: 'border-tier-8-border',
    text: 'text-tier-8-text',
    bg: 'bg-tier-8-bg',
    muted: 'text-tier-8-muted',
  },
  9: {
    border: 'border-tier-9-border',
    text: 'text-tier-9-text',
    bg: 'bg-tier-9-bg',
    muted: 'text-tier-9-muted',
  },
} as const;

export const TIER_HOVER: Record<number, string> = {
  1: 'hover:border-tier-1-border hover:text-tier-1-text hover:bg-tier-1-bg',
  2: 'hover:border-tier-2-border hover:text-tier-2-text hover:bg-tier-2-bg',
  3: 'hover:border-tier-3-border hover:text-tier-3-text hover:bg-tier-3-bg',
  4: 'hover:border-tier-4-border hover:text-tier-4-text hover:bg-tier-4-bg',
  5: 'hover:border-tier-5-border hover:text-tier-5-text hover:bg-tier-5-bg',
  6: 'hover:border-tier-6-border hover:text-tier-6-text hover:bg-tier-6-bg',
  7: 'hover:border-tier-7-border hover:text-tier-7-text hover:bg-tier-7-bg',
  8: 'hover:border-tier-8-border hover:text-tier-8-text hover:bg-tier-8-bg',
  9: 'hover:border-tier-9-border hover:text-tier-9-text hover:bg-tier-9-bg',
};

export type TierLevel = keyof typeof TIER_COLORS;

export function getTierTokens(tier: number) {
  return TIER_COLORS[tier as TierLevel] ?? TIER_COLORS[0];
}
