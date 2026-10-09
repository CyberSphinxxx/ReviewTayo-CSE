import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { RTOwlMark } from '@/components/brand/RTOwlMark';
import { RTStateView } from '@/components/primitives/RTStateView';
import { AppearanceBootstrap } from '@/store/AppearanceBootstrap';
import { useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider, useLocalData } from '@/store/LocalDataProvider';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // A missing splash screen must not prevent the app from starting.
});

const ThemedNavigator = () => {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.canvas },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="guide" />
        <Stack.Screen name="concept" />
        <Stack.Screen name="build-quiz" options={{ presentation: 'modal' }} />
        <Stack.Screen name="subject-practice" options={{ presentation: 'modal' }} />
        <Stack.Screen name="quiz" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review-session" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="review-list" />
        <Stack.Screen name="mock" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="dev/design-system" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
};

/**
 * Data gate.
 *
 * The navigation tree is only mounted once the local database has migrated and
 * bundled content is imported, so no screen can ever read from a half-ready
 * database. A failure shows a recoverable error state rather than a blank app.
 */
const LocalDataGate = () => {
  const theme = useTheme();
  const { status, error, retry } = useLocalData();

  useEffect(() => {
    if (status !== 'starting') {
      void SplashScreen.hideAsync().catch(() => {
        // Ignored: the splash screen is cosmetic.
      });
    }
  }, [status]);

  if (status === 'ready') return <ThemedNavigator />;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      {status === 'failed' ? (
        <RTStateView
          kind="error"
          title="Could not open your study data"
          description={error?.message ?? 'The local database could not be prepared.'}
          actionLabel="Try again"
          onAction={retry}
        />
      ) : (
        <RTStateView
          kind="info"
          title="ReviewTayo"
          description="Preparing your study data…"
          illustration={<RTOwlMark width={116} />}
        />
      )}
    </View>
  );
};

const ThemedApp = () => {
  const appearance = useAppearance();

  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      <ErrorBoundary>
        <LocalDataGate />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalDataProvider>
        <AppearanceBootstrap>
          <ThemedApp />
        </AppearanceBootstrap>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
}
