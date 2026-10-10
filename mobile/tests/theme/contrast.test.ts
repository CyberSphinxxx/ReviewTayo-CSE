import { createTheme } from '@/theme';

import { contrastRatio, roundRatio } from '@tests/utils/contrast';

/**
 * Both themes are audited automatically. This is the automated half of the
 * accessibility review: it guarantees no text role ships below WCAG AA contrast,
 * in either palette, for every surface a user actually reads on.
 */

const LIGHT = createTheme('light');
const DARK = createTheme('dark');

interface PairCase {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
  /** Large display text may satisfy the 3:1 threshold. */
  readonly large?: boolean;
}

const auditPairs = (label: string, theme: ReturnType<typeof createTheme>, minimum: number) => {
  const { colors } = theme;
  const pairs: PairCase[] = [
    { name: `${label}: body text on canvas`, foreground: colors.text, background: colors.canvas },
    { name: `${label}: body text on surface`, foreground: colors.text, background: colors.surface },
    {
      name: `${label}: body text on raised surface`,
      foreground: colors.text,
      background: colors.surfaceRaised,
    },
    {
      name: `${label}: secondary text on canvas`,
      foreground: colors.textSecondary,
      background: colors.canvas,
    },
    {
      name: `${label}: secondary text on surface`,
      foreground: colors.textSecondary,
      background: colors.surface,
    },
    {
      name: `${label}: accent text on canvas`,
      foreground: colors.accentText,
      background: colors.canvas,
    },
    {
      name: `${label}: accent text on surface`,
      foreground: colors.accentText,
      background: colors.surface,
    },
    {
      name: `${label}: accent text on soft surface`,
      foreground: colors.accentText,
      background: colors.surfaceSoft,
    },
    {
      name: `${label}: text on selected accent surface`,
      foreground: colors.onAccentSoft,
      background: colors.accentSoft,
    },
    {
      name: `${label}: inverse text on brand surface`,
      foreground: colors.textInverse,
      background: colors.primary,
    },
    { name: `${label}: text on gold action`, foreground: colors.onGold, background: colors.gold },
    {
      name: `${label}: success text on success surface`,
      foreground: colors.successText,
      background: colors.successSoft,
    },
    {
      name: `${label}: danger text on danger surface`,
      foreground: colors.dangerText,
      background: colors.dangerSoft,
    },
    {
      name: `${label}: danger text on canvas (error lines)`,
      foreground: colors.dangerText,
      background: colors.canvas,
    },
    {
      name: `${label}: danger text on surface (error lines)`,
      foreground: colors.dangerText,
      background: colors.surface,
    },
    {
      name: `${label}: success text on canvas`,
      foreground: colors.successText,
      background: colors.canvas,
    },
    {
      name: `${label}: success text on surface`,
      foreground: colors.successText,
      background: colors.surface,
    },
    {
      name: `${label}: secondary text on raised surface`,
      foreground: colors.textSecondary,
      background: colors.surfaceRaised,
    },
    {
      name: `${label}: secondary text on soft surface`,
      foreground: colors.textSecondary,
      background: colors.surfaceSoft,
    },
    {
      name: `${label}: accent text on raised surface`,
      foreground: colors.accentText,
      background: colors.surfaceRaised,
    },
    {
      name: `${label}: neutral badge text`,
      foreground: colors.onNeutralSoft,
      background: colors.neutralSoft,
    },
    {
      name: `${label}: nav inactive label`,
      foreground: colors.navInactive,
      background: colors.navBackground,
    },
    {
      name: `${label}: nav active label`,
      foreground: colors.navActive,
      background: colors.navBackground,
    },
    {
      name: `${label}: nav centre icon`,
      foreground: colors.navHomeContent,
      background: colors.navHomeBackground,
    },
    {
      name: `${label}: mastery learning`,
      foreground: colors.mastery.learning.text,
      background: colors.mastery.learning.background,
    },
    {
      name: `${label}: mastery developing`,
      foreground: colors.mastery.developing.text,
      background: colors.mastery.developing.background,
    },
    {
      name: `${label}: mastery strong`,
      foreground: colors.mastery.strong.text,
      background: colors.mastery.strong.background,
    },
    {
      name: `${label}: mastery mastered`,
      foreground: colors.mastery.mastered.text,
      background: colors.mastery.mastered.background,
    },
  ];

  it.each(pairs)('$name clears WCAG AA', ({ foreground, background, large }) => {
    const ratio = roundRatio(contrastRatio(foreground, background));
    const threshold = large === true ? 3 : minimum;
    expect(ratio).toBeGreaterThanOrEqual(threshold);
  });
};

describe('light theme contrast', () => {
  auditPairs('light', LIGHT, 4.5);
});

describe('dark theme contrast', () => {
  auditPairs('dark', DARK, 4.5);
});

describe('display typography contrast', () => {
  it.each([
    ['light hero title', LIGHT.colors.textInverse, LIGHT.colors.primary],
    ['dark hero title', DARK.colors.textInverse, DARK.colors.primary],
    ['light study score', LIGHT.colors.accentText, LIGHT.colors.canvas],
    ['dark study score', DARK.colors.accentText, DARK.colors.canvas],
  ])('%s is legible', (_name, foreground, background) => {
    expect(roundRatio(contrastRatio(foreground, background))).toBeGreaterThanOrEqual(3);
  });
});
