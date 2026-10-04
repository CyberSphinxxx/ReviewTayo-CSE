import { View } from 'react-native';

import { useTheme } from '@/theme';

import { RTOwlMark } from '../brand/RTOwlMark';
import { RTButton } from '../primitives/RTButton';
import { RTText } from '../primitives/RTText';

/**
 * Fatal error fallback.
 *
 * Shown when a render error escapes the tree. It explains what happened in plain
 * language, gives the learner a way to continue, and never exposes internals —
 * the technical detail goes to the crash reporter instead.
 */

export interface FatalErrorFallbackProps {
  readonly message: string;
  readonly componentStack?: string | null;
  readonly onRetry: () => void;
}

export const FatalErrorFallback = ({
  message,
  componentStack,
  onRetry,
}: FatalErrorFallbackProps) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        gap: theme.spacing.base,
      }}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
    >
      <RTOwlMark width={110} />
      <RTText role="sectionTitle" style={{ textAlign: 'center' }}>
        Something went wrong
      </RTText>
      <RTText role="bodySmall" tone="secondary" style={{ textAlign: 'center' }}>
        ReviewTayo hit an unexpected problem. Your saved progress is safe — nothing was lost.
      </RTText>
      <RTButton label="Try again" onPress={onRetry} variant="primary" />
      {__DEV__ && (
        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceSoft,
            maxWidth: '100%',
          }}
        >
          <RTText role="meta" tone="secondary" selectable>
            {[message, componentStack ?? ''].filter(Boolean).join('\n\n').slice(0, 1200)}
          </RTText>
        </View>
      )}
    </View>
  );
};
