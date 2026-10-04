import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTButton } from './RTButton';
import { RTText } from './RTText';

/**
 * Standard state views.
 *
 * Every list or screen that can be empty, offline, loading or broken uses one of
 * these so the app never shows a bare blank region and never leaks a stack trace.
 */

export type StateViewKind = 'empty' | 'error' | 'offline' | 'info';

export interface RTStateViewProps {
  readonly kind: StateViewKind;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly secondaryActionLabel?: string;
  readonly onSecondaryAction?: () => void;
  readonly illustration?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTStateView = ({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  style,
  testID,
}: RTStateViewProps) => {
  const theme = useTheme();
  const announcement = kind === 'error' ? 'Error' : kind === 'offline' ? 'Offline' : undefined;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={[announcement, title, description].filter(Boolean).join('. ')}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.xxl,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {illustration}
      <RTText role="sectionTitle" style={{ textAlign: 'center' }}>
        {title}
      </RTText>
      {description !== undefined && (
        <RTText role="bodySmall" tone="secondary" style={{ textAlign: 'center', maxWidth: 320 }}>
          {description}
        </RTText>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <RTButton
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          accessibilityHint={`${title} — ${actionLabel}`}
        />
      )}
      {secondaryActionLabel !== undefined && onSecondaryAction !== undefined && (
        <RTButton label={secondaryActionLabel} onPress={onSecondaryAction} variant="ghost" />
      )}
    </View>
  );
};

export interface RTLoadingViewProps {
  readonly label: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTLoadingView = ({ label, style, testID }: RTLoadingViewProps) => {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.xxl,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <RTText role="bodySmall" tone="secondary">
        {label}
      </RTText>
    </View>
  );
};
