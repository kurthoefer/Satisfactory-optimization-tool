/**
 * Pure derivation of the ghost-completion regions from a query and a product
 * name. No React, no DOM — just string math.
 *
 * Display reads: <query><suffix> (<prefix>)
 *   suffix: characters in `name` after the match. Right-arrow / click walk this.
 *   prefix: leading context for the parenthetical. If the match starts mid-word,
 *           extended forward through the rest of that word so the parens read
 *           as complete words. Overlaps with suffix by design — they answer
 *           different questions ("what is this?" vs. "what comes next?").
 */

export interface GhostParts {
  matched: boolean;
  prefix: string;
  suffix: string;
}

export function deriveGhost(query: string, name: string): GhostParts {
  // Empty query → spell out the full target name as suffix.
  // Useful when the user is navigating the grid with no query typed;
  // the input shows what the currently-focused product is.
  if (!query) return { matched: true, prefix: '', suffix: name };
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return { matched: false, prefix: '', suffix: '' };

  const suffix = name.slice(idx + query.length);

  let prefixEnd = idx;
  const charBefore = name[idx - 1];
  if (charBefore !== undefined && /[A-Za-z0-9]/.test(charBefore)) {
    prefixEnd = idx + query.length;
    while (prefixEnd < name.length && /[A-Za-z0-9]/.test(name[prefixEnd])) {
      prefixEnd++;
    }
  }
  const prefix = name.slice(0, prefixEnd);

  return { matched: true, prefix, suffix };
}
