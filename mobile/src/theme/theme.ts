import {
  borderWidth,
  brandIllustration,
  darkPalette,
  lightPalette,
  radius,
  spacing,
  touchTarget,
  type BrandPalette,
  type Palette,
  type ResolvedThemeMode,
  type TextSizePreference,
} from './tokens';
import { createTypography, type Typography } from './typography';

/**
 * Semantic theme.
 *
 * Screens consume these roles only. The light and dark systems deliberately share
 * one role vocabulary so both themes keep the same component and information
 * architecture — dark mode is a distinct Claude-inspired burgundy system, not an
 * inversion of light mode.
 */

export interface MasteryColors {
  readonly background: string;
  readonly text: string;
  readonly border: string;
}

export interface ThemeColors {
  /** Screen background (warm cream in light, near-black maroon in dark). */
  readonly canvas: string;
  /** Elevated card/sheet surface. */
  readonly surface: string;
  /** Slightly raised surface for nested cards. */
  readonly surfaceRaised: string;
  /** Tinted surface used for selected states. */
  readonly surfaceSoft: string;
  /** App backdrop; also used behind modal framing. */
  readonly backdrop: string;

  readonly border: string;
  readonly borderStrong: string;

  readonly text: string;
  readonly textSecondary: string;
  /** Text drawn on maroon/brand surfaces. */
  readonly textInverse: string;

  /** Filled brand action background. */
  readonly primary: string;
  readonly primaryDeep: string;
  readonly onPrimary: string;
  /** Accent used for text, icons and small accents (contrast-safe per theme). */
  readonly accentText: string;
  /** Soft rose accent surface. */
  readonly accentSoft: string;
  readonly onAccentSoft: string;

  /** Restrained gold, reserved for the single dominant action per screen. */
  readonly gold: string;
  readonly onGold: string;
  readonly goldSoft: string;

  readonly success: string;
  readonly successSoft: string;
  readonly successText: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly dangerText: string;
  readonly neutralSoft: string;
  readonly onNeutralSoft: string;

  readonly navBackground: string;
  readonly navInactive: string;
  readonly navActive: string;
  readonly navActivePill: string;
  readonly navHomeBackground: string;
  readonly navHomeContent: string;
  readonly navHomeRing: string;

  readonly scrim: string;
  readonly shadow: string;
  readonly focusRing: string;

  readonly mastery: {
    readonly learning: MasteryColors;
    readonly developing: MasteryColors;
    readonly strong: MasteryColors;
    readonly mastered: MasteryColors;
  };

  readonly brand: BrandPalette;
}

export interface Theme {
  readonly mode: ResolvedThemeMode;
  readonly textSize: TextSizePreference;
  readonly colors: ThemeColors;
  readonly typography: Typography;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly borderWidth: typeof borderWidth;
  readonly touchTarget: typeof touchTarget;
  /** Monospace-free tabular numerals are handled through the serif score roles. */
  readonly isDark: boolean;
}

const buildLightColors = (palette: Palette): ThemeColors => ({
  canvas: palette.cream,
  surface: palette.paper,
  surfaceRaised: palette.paper,
  surfaceSoft: palette.surfaceSoft,
  backdrop: palette.backdrop,

  border: palette.line,
  borderStrong: '#DCC8C3',

  text: palette.ink,
  textSecondary: palette.inkMuted,
  textInverse: '#FFFFFF',

  primary: palette.maroon,
  primaryDeep: palette.maroonDeep,
  onPrimary: '#FFFFFF',
  accentText: palette.maroon,
  accentSoft: palette.rose,
  onAccentSoft: palette.maroon,

  gold: palette.gold,
  onGold: '#2B1408',
  goldSoft: '#FDEBC8',

  success: palette.success,
  successSoft: palette.successSoft,
  successText: palette.successText,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  dangerText: palette.dangerText,
  neutralSoft: palette.rose,
  onNeutralSoft: palette.maroon,

  navBackground: palette.navBackground,
  navInactive: palette.inkMuted,
  navActive: palette.maroon,
  navActivePill: palette.rose,
  navHomeBackground: palette.maroon,
  navHomeContent: '#FFFFFF',
  navHomeRing: palette.rose,

  scrim: 'rgba(34, 18, 25, 0.45)',
  shadow: 'rgba(90, 15, 35, 0.18)',
  focusRing: 'rgba(138, 22, 48, 0.55)',

  mastery: {
    learning: { background: '#F1E7E9', text: '#7A5A62', border: '#E1D2D6' },
    developing: { background: '#FDEBC8', text: '#7A4E00', border: '#EBD2A2' },
    strong: { background: '#D9EFDC', text: '#1F6A35', border: '#BCDEC2' },
    mastered: { background: '#BDE7C7', text: '#14512A', border: '#9BD3A9' },
  },

  brand: brandIllustration,
});

const buildDarkColors = (palette: Palette): ThemeColors => ({
  canvas: palette.cream,
  surface: palette.paper,
  surfaceRaised: '#331E26',
  surfaceSoft: palette.surfaceSoft,
  backdrop: palette.backdrop,

  border: palette.line,
  borderStrong: '#4E3540',

  text: palette.ink,
  textSecondary: palette.inkMuted,
  textInverse: '#FFFFFF',

  primary: palette.maroon,
  primaryDeep: palette.maroonDeep,
  onPrimary: '#FFFFFF',
  /**
   * Filled maroon is too dark for text on the dark canvas, so the accent role
   * resolves to a light rose that clears WCAG AA on both canvas and surface.
   */
  accentText: '#F2A9B8',
  accentSoft: palette.rose,
  onAccentSoft: '#F6E9EA',

  gold: palette.gold,
  onGold: '#2B1408',
  goldSoft: '#4A3218',

  success: palette.success,
  successSoft: palette.successSoft,
  successText: palette.successText,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  dangerText: palette.dangerText,
  neutralSoft: palette.rose,
  onNeutralSoft: '#F6E9EA',

  navBackground: palette.navBackground,
  navInactive: palette.inkMuted,
  navActive: '#F2A9B8',
  navActivePill: palette.rose,
  navHomeBackground: palette.maroon,
  navHomeContent: '#FFFFFF',
  navHomeRing: 'rgba(242, 169, 184, 0.35)',

  scrim: 'rgba(9, 4, 6, 0.62)',
  shadow: 'rgba(0, 0, 0, 0.45)',
  focusRing: 'rgba(242, 169, 184, 0.75)',

  mastery: {
    learning: { background: '#3A2229', text: '#E4C9CF', border: '#4E3038' },
    developing: { background: '#4A3218', text: '#F6C86B', border: '#63431F' },
    strong: { background: '#1C3A2A', text: '#8FD1AE', border: '#295139' },
    mastered: { background: '#143020', text: '#A6E3BF', border: '#1E5233' },
  },

  brand: {
    ...brandIllustration,
    belly: '#4A1F2C',
    bellyFeather: '#8A5560',
    eyeWhite: '#F6E9EA',
    pupil: '#150A0F',
  },
});

export const createTheme = (
  mode: ResolvedThemeMode,
  textSize: TextSizePreference = 'standard',
): Theme => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const colors = mode === 'dark' ? buildDarkColors(palette) : buildLightColors(palette);
  return {
    mode,
    textSize,
    isDark: mode === 'dark',
    colors,
    typography: createTypography(textSize),
    spacing,
    radius,
    borderWidth,
    touchTarget,
  };
};

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');
