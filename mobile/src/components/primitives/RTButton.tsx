import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTText } from './RTText';

/**
 * Button primitive.
 *
 * Variants encode the product's decision hierarchy: exactly one `gold` primary
 * action per screen region, `primary` for brand-filled secondary actions, and
 * `ghost`/`subtle` for everything that must stay quiet. Touch targets never fall
 * below the accessible minimum, and loading/disabled states stay announced.
 */

export type ButtonVariant = 'gold' | 'primary' | 'subtle' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface RTButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly trailing?: React.ReactNode;
  readonly leading?: React.ReactNode;
  readonly accessibilityHint?: string;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTButton = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  trailing,
  leading,
  accessibilityHint,
  accessibilityLabel,
  testID,
  style,
}: RTButtonProps) => {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = (() => {
    switch (variant) {
      case 'gold':
        return { background: theme.colors.gold, text: theme.colors.onGold, border: 'transparent' };
      case 'primary':
        return {
          background: theme.colors.primary,
          text: theme.colors.onPrimary,
          border: 'transparent',
        };
      case 'subtle':
        return {
          background: theme.colors.accentSoft,
          text: theme.colors.onAccentSoft,
          border: 'transparent',
        };
      case 'outline':
        return {
          background: 'transparent',
          text: theme.colors.text,
          border: theme.colors.borderStrong,
        };
      case 'ghost':
      default:
        return {
          background: 'transparent',
          text: theme.colors.accentText,
          border: 'transparent',
        };
    }
  })();

  const metrics = (() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.base };
      case 'lg':
        return { paddingVertical: theme.spacing.base, paddingHorizontal: theme.spacing.xl };
      case 'md':
      default:
        return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: theme.colors.scrim, borderless: false }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          minHeight: size === 'sm' ? theme.touchTarget.minimum : theme.touchTarget.comfortable,
          borderRadius: theme.radius.pill,
          backgroundColor: palette.background,
          borderWidth: variant === 'outline' ? theme.borderWidth.thin : 0,
          borderColor: palette.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
        },
        metrics,
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {leading !== undefined && <View>{leading}</View>}
          <RTText role="button" style={{ color: palette.text }}>
            {label}
          </RTText>
          {trailing !== undefined && <View>{trailing}</View>}
        </>
      )}
    </Pressable>
  );
};
