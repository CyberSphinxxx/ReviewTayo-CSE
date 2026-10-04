import { Platform, type TextStyle } from 'react-native';

import { textScale, type TextSizePreference } from './tokens';

/**
 * Typography system.
 *
 * The reference uses an editorial serif for display moments (hero headlines,
 * question stems, big scores) and a neutral sans for controls and body copy.
 * Both resolve to fonts that ship with the platform, so we get consistent native
 * rendering without bundling extra font binaries or adding a font dependency.
 */

const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

const sansFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});

export type TypographyRole =
  | 'display'
  | 'displayLarge'
  | 'pageTitle'
  | 'sectionTitle'
  | 'question'
  | 'cardTitle'
  | 'lead'
  | 'body'
  | 'bodySmall'
  | 'meta'
  | 'eyebrow'
  | 'button'
  | 'navLabel'
  | 'score'
  | 'scoreLarge'
  | 'countLarge';

interface RoleDefinition extends TextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
}

const roleDefinitions: Record<TypographyRole, RoleDefinition> = {
  /** Home hero headline. */
  display: {
    fontFamily: serifFamily,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '400',
    letterSpacing: -0.6,
  },
  /** Large editorial headline used on Learn/Practice hero cards. */
  displayLarge: {
    fontFamily: serifFamily,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  /** Sheet and onboarding titles. */
  pageTitle: {
    fontFamily: serifFamily,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  /** Section headings. */
  sectionTitle: {
    fontFamily: serifFamily,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  /** Question stem. */
  question: {
    fontFamily: serifFamily,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  /** Row and card titles. */
  cardTitle: {
    fontFamily: sansFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  lead: {
    fontFamily: sansFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    fontFamily: sansFamily,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: sansFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  meta: {
    fontFamily: sansFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  /** Uppercase section label. */
  eyebrow: {
    fontFamily: sansFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: sansFamily,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  navLabel: {
    fontFamily: sansFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  /** Big serif numerals (streak, weekly counts). */
  score: {
    fontFamily: serifFamily,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '400',
  },
  /** Study score numeral. */
  scoreLarge: {
    fontFamily: serifFamily,
    fontSize: 88,
    lineHeight: 92,
    fontWeight: '400',
    letterSpacing: -2,
  },
  /** Review-due count and other oversized counters. */
  countLarge: {
    fontFamily: serifFamily,
    fontSize: 112,
    lineHeight: 116,
    fontWeight: '400',
    letterSpacing: -3,
  },
};

export type Typography = Record<TypographyRole, TextStyle>;

/**
 * Builds the typography roles for a user text-size preference.
 *
 * Font sizes scale with the preference; line heights scale proportionally so text
 * never collides. Layouts deliberately avoid fixed text heights so the operating
 * system's own font scaling can also apply on top of this.
 */
export const createTypography = (preference: TextSizePreference): Typography => {
  const scale = textScale[preference];
  const output = {} as Typography;
  for (const role of Object.keys(roleDefinitions) as TypographyRole[]) {
    const definition = roleDefinitions[role];
    output[role] = {
      ...definition,
      fontSize: Math.round(definition.fontSize * scale),
      lineHeight: Math.round(definition.lineHeight * scale),
    };
  }
  return output;
};

export const serifFontFamily = serifFamily;
export const sansFontFamily = sansFamily;
