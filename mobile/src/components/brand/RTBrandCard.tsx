import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTText } from '../primitives/RTText';
import { RTOwlMark, type OwlMood } from './RTOwlMark';

/**
 * Branded maroon surface.
 *
 * `hero` is the full-bleed Home header (rounded bottom corners, warm radial
 * highlight, owl anchored bottom-right). `card` is the inset panel used by
 * Practice's Smart Drill and the Mock setup screen. Both keep the same visual
 * personality in light and dark mode, as required by the design system.
 */

export type BrandCardVariant = 'hero' | 'card';

export interface RTBrandCardProps {
  readonly variant?: BrandCardVariant;
  readonly title: string;
  readonly subtitle?: string;
  readonly eyebrow?: string;
  readonly owlWidth?: number;
  readonly owlMood?: OwlMood;
  readonly showOwl?: boolean;
  readonly children?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTBrandCard = ({
  variant = 'card',
  title,
  subtitle,
  eyebrow,
  owlWidth,
  owlMood,
  showOwl = true,
  children,
  style,
  testID,
}: RTBrandCardProps) => {
  const theme = useTheme();
  const isHero = variant === 'hero';

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.primary,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: isHero ? theme.spacing.xl : theme.spacing.xl,
          paddingBottom: isHero ? theme.spacing.xxl : theme.spacing.xl,
          borderBottomLeftRadius: isHero ? theme.radius.heroBottom : theme.radius.xxl,
          borderBottomRightRadius: isHero ? theme.radius.heroBottom : theme.radius.xxl,
          overflow: 'hidden',
        },
        variant === 'card' && {
          marginHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.sm,
          borderTopLeftRadius: theme.radius.xxl,
          borderTopRightRadius: theme.radius.xxl,
        },
        style,
      ]}
    >
      {/* Warm highlight approximating the reference's radial gradient. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -40,
          top: -70,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: 'rgba(176, 42, 74, 0.45)',
        }}
      />

      {eyebrow !== undefined && (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderRadius: theme.radius.pill,
            paddingVertical: 6,
            paddingHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.base,
          }}
        >
          <RTText role="meta" style={{ color: theme.colors.textInverse, fontWeight: '600' }}>
            {eyebrow}
          </RTText>
        </View>
      )}

      <View style={{ maxWidth: isHero ? '76%' : '68%' }}>
        <RTText
          role={isHero ? 'display' : 'displayLarge'}
          style={{ color: theme.colors.textInverse, fontWeight: '400' }}
        >
          {title}
        </RTText>
        {subtitle !== undefined && (
          <RTText
            role="bodySmall"
            style={{
              color: 'rgba(255,255,255,0.82)',
              marginTop: theme.spacing.sm,
            }}
          >
            {subtitle}
          </RTText>
        )}
      </View>

      {showOwl && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: isHero ? -6 : theme.spacing.base,
            bottom: isHero ? -18 : 'auto',
            top: isHero ? 'auto' : theme.spacing.md,
            transform: [{ rotate: isHero ? '6deg' : '0deg' }],
          }}
        >
          <RTOwlMark width={owlWidth ?? (isHero ? 124 : 78)} mood={owlMood} />
        </View>
      )}

      {children !== undefined && <View style={{ marginTop: theme.spacing.lg }}>{children}</View>}
    </View>
  );
};
