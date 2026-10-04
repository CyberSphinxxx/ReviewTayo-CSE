import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, CloseIcon } from '@/components/icons';
import { RTIconButton } from '@/components/primitives/RTIconButton';
import { RTText } from '@/components/primitives/RTText';
import { useTheme } from '@/theme';

/**
 * Screen shell.
 *
 * Provides the reference prototype's modal/sheet chrome natively: safe-area
 * handling, an optional back or close affordance, an optional segmented progress
 * bar, a scrolling body and a footer that stays reachable with one thumb. Rendered
 * as a router screen rather than a DOM overlay, so Android back and navigation
 * state behave correctly.
 */

export interface ScreenProgress {
  readonly total: number;
  readonly current: number;
  readonly accessibilityLabel: string;
}

export interface RTScreenShellProps {
  readonly children: React.ReactNode;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly onBack?: () => void;
  readonly onClose?: () => void;
  readonly backLabel?: string;
  readonly closeLabel?: string;
  readonly headerAccessory?: React.ReactNode;
  readonly progress?: ScreenProgress;
  readonly scroll?: boolean;
  readonly footer?: React.ReactNode;
  readonly headerTone?: 'default' | 'inverse';
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTScreenShell = ({
  children,
  eyebrow,
  title,
  onBack,
  onClose,
  backLabel = 'Go back',
  closeLabel = 'Close',
  headerAccessory,
  progress,
  scroll = true,
  footer,
  headerTone = 'default',
  contentContainerStyle,
  testID,
}: RTScreenShellProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inverse = headerTone === 'inverse';
  const iconColor = inverse ? theme.colors.textInverse : theme.colors.text;
  const titleColor = inverse ? theme.colors.textInverse : theme.colors.text;

  const body = <View style={[{ gap: theme.spacing.xs }, contentContainerStyle]}>{children}</View>;

  return (
    <View
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.colors.canvas, paddingTop: insets.top }}
    >
      <View style={{ paddingHorizontal: theme.spacing.xl }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: 48,
          }}
        >
          {onBack !== undefined ? (
            <RTIconButton
              accessibilityLabel={backLabel}
              onPress={onBack}
              variant={inverse ? 'inverse' : 'soft'}
            >
              <ArrowLeftIcon color={iconColor} />
            </RTIconButton>
          ) : null}
          {eyebrow !== undefined && (
            <View style={{ flex: 1 }}>
              <RTText
                role="eyebrow"
                style={{ color: inverse ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }}
              >
                {eyebrow}
              </RTText>
              {title !== undefined && (
                <RTText role="pageTitle" style={{ color: titleColor, marginTop: 2 }}>
                  {title}
                </RTText>
              )}
            </View>
          )}
          {eyebrow === undefined && title !== undefined && (
            <RTText role="pageTitle" style={{ color: titleColor, flex: 1 }}>
              {title}
            </RTText>
          )}
          {eyebrow === undefined && title === undefined && <View style={{ flex: 1 }} />}
          {headerAccessory}
          {onClose !== undefined && (
            <RTIconButton
              accessibilityLabel={closeLabel}
              onPress={onClose}
              variant={inverse ? 'inverse' : 'soft'}
            >
              <CloseIcon color={iconColor} />
            </RTIconButton>
          )}
        </View>

        {progress !== undefined && (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={progress.accessibilityLabel}
            accessibilityValue={{ min: 0, max: progress.total, now: progress.current }}
            style={{
              flexDirection: 'row',
              gap: theme.spacing.xs,
              marginTop: theme.spacing.md,
            }}
          >
            {Array.from({ length: progress.total }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: theme.radius.pill,
                  backgroundColor:
                    index < progress.current ? theme.colors.primary : theme.colors.border,
                }}
              />
            ))}
          </View>
        )}
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.lg,
          }}
        >
          {body}
        </View>
      )}

      {footer !== undefined && (
        <View
          style={{
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.md,
            paddingBottom: Math.max(insets.bottom, theme.spacing.base),
            backgroundColor: theme.colors.canvas,
            borderTopWidth: theme.borderWidth.hairline,
            borderTopColor: theme.colors.border,
          }}
        >
          {footer}
        </View>
      )}
    </View>
  );
};
