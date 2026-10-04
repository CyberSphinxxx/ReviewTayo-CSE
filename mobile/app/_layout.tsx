import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
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
        <Stack.Screen name="dev/design-system" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
};

const ThemedApp = () => {
  const appearance = useAppearance();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Ignored: the splash screen is cosmetic.
    });
  }, []);

  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      <ErrorBoundary>
        <ThemedNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <ThemedApp />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}
