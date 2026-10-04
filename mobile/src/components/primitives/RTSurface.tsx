import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Surface primitive.
 *
 * Cards, sheets and brand panels all come from one place so padding, radius,
 * borders and elevation stay coherent between the light and dark systems.
 */

export type SurfaceVariant = 'paper' | 'soft' | 'raised' | 'brand' | 'plain';

export interface RTSurfaceProps extends ViewProps {
  readonly variant?: SurfaceVariant;
  readonly padding?: 'none' | 'sm' | 'md' | 'lg';
  readonly radius?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'none';
  readonly bordered?: boolean;
  readonly elevated?: boolean;
}

export const RTSurface = ({
  variant = 'paper',
  padding = 'md',
  radius = 'lg',
  bordered = false,
  elevated = false,
  style,
  children,
  ...rest
}: RTSurfaceProps) => {
  const theme = useTheme();

  const surfaceStyle: ViewStyle = (() => {
    switch (variant) {
      case 'soft':
        return { backgroundColor: theme.colors.surfaceSoft };
      case 'raised':
        return { backgroundColor: theme.colors.surfaceRaised };
      case 'brand':
        return { backgroundColor: theme.colors.primary };
      case 'plain':
        return { backgroundColor: 'transparent' };
      case 'paper':
      default:
        return { backgroundColor: theme.colors.surface };
    }
  })();

  const paddingValue = (() => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return theme.spacing.md;
      case 'lg':
        return theme.spacing.xl;
      case 'md':
      default:
        return theme.spacing.base;
    }
  })();

  const radiusValue = (() => {
    switch (radius) {
      case 'none':
        return 0;
      case 'sm':
        return theme.radius.sm;
      case 'md':
        return theme.radius.md;
      case 'xl':
        return theme.radius.xl;
      case 'xxl':
        return theme.radius.xxl;
      case 'lg':
      default:
        return theme.radius.lg;
    }
  })();

  return (
    <View
      {...rest}
      style={[
        surfaceStyle,
        {
          padding: paddingValue,
          borderRadius: radiusValue,
          borderWidth: bordered ? theme.borderWidth.hairline : 0,
          borderColor: theme.colors.border,
        },
        elevated && {
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
