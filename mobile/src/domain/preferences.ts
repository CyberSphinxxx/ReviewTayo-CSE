/**
 * User preference vocabulary.
 *
 * Appearance preferences are product vocabulary, not theme internals: onboarding
 * collects them, settings edits them, the theme resolves them and the database
 * stores them. They live in the domain so those four layers cannot drift into
 * four slightly different string sets — the failure mode that would silently drop
 * a learner's choice on upgrade.
 */

export const THEME_PREFERENCES = ['device', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const RESOLVED_THEME_MODES = ['light', 'dark'] as const;
export type ResolvedThemeMode = (typeof RESOLVED_THEME_MODES)[number];

export const TEXT_SIZE_PREFERENCES = ['standard', 'large', 'extra'] as const;
export type TextSizePreference = (typeof TEXT_SIZE_PREFERENCES)[number];

/** Multiplier applied to every typography role for each text-size preference. */
export const TEXT_SIZE_SCALE: Record<TextSizePreference, number> = {
  standard: 1,
  large: 1.15,
  extra: 1.3,
};

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

/**
 * Values an earlier build could have stored. Kept as aliases so a preference is
 * never silently reset by an upgrade.
 */
const TEXT_SIZE_ALIASES: Record<string, TextSizePreference> = { 'extra-large': 'extra' };

export const isTextSizePreference = (value: unknown): value is TextSizePreference =>
  typeof value === 'string' && (TEXT_SIZE_PREFERENCES as readonly string[]).includes(value);

/** Coerces a stored/untrusted value, falling back when it is not recognised. */
export const toThemePreference = (
  value: unknown,
  fallback: ThemePreference = 'device',
): ThemePreference => (isThemePreference(value) ? value : fallback);

export const toTextSizePreference = (
  value: unknown,
  fallback: TextSizePreference = 'standard',
): TextSizePreference => {
  if (typeof value === 'string' && value in TEXT_SIZE_ALIASES) {
    return TEXT_SIZE_ALIASES[value] ?? fallback;
  }
  return isTextSizePreference(value) ? value : fallback;
};
