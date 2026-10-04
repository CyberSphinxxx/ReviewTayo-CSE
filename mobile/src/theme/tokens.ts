/**
 * Raw design tokens.
 *
 * Palettes are transcribed from the approved merged reference prototype
 * (`references/merged-prototype/css/app.css`). Screens must never use these
 * values directly — they consume semantic roles from `theme.ts` instead, so the
 * light and dark systems can evolve without touching feature code.
 */

export const lightPalette = {
  /** Deep ReviewTayo maroon — filled actions and brand surfaces. */
  maroon: '#8A1630',
  /** Darker maroon used for elevated brand surfaces (resume card, rings). */
  maroonDeep: '#5A0F23',
  /** Warm cream canvas. */
  cream: '#FFF9F5',
  /** Paper surface for cards and sheets. */
  paper: '#FFFFFF',
  /** Soft rose used for selected/active chrome. */
  rose: '#F7E8EA',
  /** Warmer rose used by the mascot illustration. */
  roseIllustration: '#F8DDE2',
  /** Restrained gold reserved for the single dominant action. */
  gold: '#F6B93B',
  /** Primary ink. */
  ink: '#28171D',
  /** Secondary/muted ink. */
  inkMuted: '#806C72',
  /** Warm hairline borders. */
  line: '#EBDDD9',
  /** App backdrop behind the content frame. */
  backdrop: '#E8DFDB',
  /** Slightly tinted surface for selected rows. */
  surfaceSoft: '#FFF4F1',
  /** Bottom navigation background. */
  navBackground: '#FFFFFF',
  success: '#2E7A59',
  successSoft: '#D9EFDC',
  successText: '#1F6A35',
  danger: '#B94B54',
  dangerSoft: '#F7DCDC',
  dangerText: '#8E2732',
} as const;

export const darkPalette = {
  /** Deep burgundy / near-black maroon canvas. */
  maroon: '#8A1630',
  maroonDeep: '#5A0F23',
  cream: '#1D1015',
  paper: '#2A1920',
  rose: '#4A1F2C',
  roseIllustration: '#4A1F2C',
  gold: '#F6B93B',
  /** Cream primary text. */
  ink: '#F6E9EA',
  /** Muted rose secondary text. */
  inkMuted: '#B79EA5',
  line: '#3C2830',
  backdrop: '#0F080B',
  surfaceSoft: '#24141A',
  navBackground: '#2A1920',
  success: '#4E9E77',
  successSoft: '#1C3A2A',
  successText: '#8FD1AE',
  danger: '#C4636C',
  dangerSoft: '#3A1B21',
  dangerText: '#F0A9B1',
} as const;

/**
 * Widened palette shape. The literal values above describe the light system; dark
 * mode supplies different values for the same keys.
 */
export type Palette = { [K in keyof typeof lightPalette]: string };
export type BrandPalette = { [K in keyof typeof brandIllustration]: string };

/** Brand illustration colours for the mascot, kept separate from UI roles. */
export const brandIllustration = {
  body: '#8A1630',
  face: '#A81B3B',
  wing: '#6B0F25',
  belly: '#F8DDE2',
  bellyFeather: '#DDA3AF',
  beak: '#F6B93B',
  eyeWhite: '#FFFFFF',
  pupil: '#1B0A10',
  cap: '#221219',
  capUnder: '#33202A',
} as const;

/** 4pt spacing scale. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 15,
  lg: 20,
  xl: 26,
  xxl: 32,
  sheetTop: 30,
  heroBottom: 44,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: 1,
  thin: 1.5,
  medium: 2,
  thick: 3,
} as const;

/** Minimum accessible touch target, in logical pixels. */
export const touchTarget = {
  minimum: 44,
  comfortable: 48,
} as const;

export type ThemePreference = 'device' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';
export type TextSizePreference = 'standard' | 'large' | 'extra';

export const textScale: Record<TextSizePreference, number> = {
  standard: 1,
  large: 1.15,
  extra: 1.3,
};

export const TEXT_SIZE_OPTIONS: readonly TextSizePreference[] = ['standard', 'large', 'extra'];

export const TEXT_SIZE_LABELS: Record<TextSizePreference, string> = {
  standard: 'Standard',
  large: 'Large',
  extra: 'Extra Large',
};

export const THEME_OPTIONS: readonly ThemePreference[] = ['device', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  device: 'Device',
  light: 'Light',
  dark: 'Dark',
};
