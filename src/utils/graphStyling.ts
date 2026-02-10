/**
 * Generates a distinct base color for an SCC family.
 */
export function generateFamilyColor(familyIndex: number): string {
  const colorPalette = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];
  return colorPalette[familyIndex % colorPalette.length];
}

/**
 * Creates lighter/darker shades of a base color for sub-SCCs.
 */
export function generateSubFamilyColor(
  baseColor: string,
  index: number,
  total: number,
): string {
  if (total <= 1) return baseColor;

  // Create a gradient range of brightness
  const brightnessStep = 60 / total;
  const adjustment = (index - total / 2) * brightnessStep;
  return adjustBrightness(baseColor, adjustment);
}

/**
 * Adjusts hex color brightness.
 * Positive = lighter, Negative = darker.
 */
export function adjustBrightness(hexColor: string, amount: number): string {
  const hex = hexColor.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
