import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Icon-only button.
 *
 * An icon button without an accessible label is unusable with a screen reader, so
 * `accessibilityLabel` is required by the type rather than optional.
 */

export type IconButtonVariant = 'plain' | 'soft' | 'inverse';

export interface RTIconButtonProps {
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly children: React.ReactNode;
  readonly variant?: IconButtonVariant;
  readonly size?: number;
  readonly disabled?: boolean;
  readonly accessibilityHint?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTIconButton = ({
  accessibilityLabel,
  onPress,
  children,
  variant = 'soft',
  size = 40,
  disabled = false,
  accessibilityHint,
  testID,
  style,
}: RTIconButtonProps) => {
  const theme = useTheme();

  const background = (() => {
    switch (variant) {
      case 'plain':
        return 'transparent';
      case 'inverse':
        return 'rgba(255, 255, 255, 0.12)';
      case 'soft':
      default:
        return theme.colors.accentSoft;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={8}
      android_ripple={{ color: theme.colors.scrim, borderless: true, radius: size / 2 }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};
