/**
 * WCAG 2.1 contrast helpers.
 *
 * Used by the theme contrast suite so both palettes are audited automatically
 * rather than by eye. Text pairs must reach 4.5:1; large display text and
 * non-text UI accents must reach 3:1.
 */

const parseHex = (hex: string): [number, number, number] => {
  const normalised = hex.replace('#', '');
  const expanded =
    normalised.length === 3
      ? normalised
          .split('')
          .map((character) => character + character)
          .join('')
      : normalised;
  const value = Number.parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const channelToLinear = (channel: number): number => {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
};

export const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

export const roundRatio = (ratio: number): number => Math.round(ratio * 100) / 100;
