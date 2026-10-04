import { Text, type TextProps } from 'react-native';

import { useTheme, type ThemeColors, type TypographyRole } from '@/theme';

/**
 * Typography-aware text.
 *
 * Every string in the app renders through this primitive so type roles and theme
 * colours stay consistent, and so screens never hard-code a font size or colour.
 */

export type TextTone =
  'default' | 'secondary' | 'inverse' | 'accent' | 'gold' | 'success' | 'danger';

/**
 * `role` is omitted from the underlying TextProps because React Native reserves it
 * for ARIA-style semantics; here it selects a typography role instead.
 */
export interface RTTextProps extends Omit<TextProps, 'role'> {
  readonly role?: TypographyRole;
  readonly tone?: TextTone;
  /** Explicit colour for the rare case a role needs a themed token by name. */
  readonly colorKey?: keyof ThemeColors;
}

const toneColor = (colors: ThemeColors, tone: TextTone): string => {
  switch (tone) {
    case 'secondary':
      return colors.textSecondary;
    case 'inverse':
      return colors.textInverse;
    case 'accent':
      return colors.accentText;
    case 'gold':
      return colors.gold;
    case 'success':
      return colors.successText;
    case 'danger':
      return colors.dangerText;
    case 'default':
    default:
      return colors.text;
  }
};

export const RTText = ({
  role = 'body',
  tone = 'default',
  colorKey,
  style,
  ...rest
}: RTTextProps) => {
  const theme = useTheme();
  const color =
    colorKey !== undefined ? (theme.colors[colorKey] as string) : toneColor(theme.colors, tone);

  return <Text {...rest} style={[theme.typography[role], { color }, style]} />;
};
