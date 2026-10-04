import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTOwlMark, RTButton, RTText } from '@/components';
import { appConfig } from '@/config/env';
import { useTheme } from '@/theme';

/**
 * Application bootstrap.
 *
 * Today this renders the branded launch state; from Phase 6 it becomes the gate
 * that decides between onboarding and the tab shell based on the persisted exam
 * profile. Keeping the decision in one route means navigation state stays
 * predictable after a cold start.
 */
export default function BootstrapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        gap: theme.spacing.base,
      }}
    >
      <RTOwlMark width={132} />
      <RTText role="display" style={{ textAlign: 'center' }}>
        ReviewTayo
      </RTText>
      <RTText role="bodySmall" tone="secondary" style={{ textAlign: 'center' }}>
        Civil Service Exam study companion
      </RTText>
      <RTText role="meta" tone="secondary">
        {appConfig.environment} · {appConfig.apiBaseUrl === null ? 'offline content' : 'connected'}
      </RTText>

      {__DEV__ && (
        <RTButton
          label="Open design system probe"
          variant="outline"
          size="sm"
          onPress={() => router.push('/dev/design-system')}
        />
      )}
    </View>
  );
}
