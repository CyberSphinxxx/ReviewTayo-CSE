import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { RTOwlMark, RTStateView } from '@/components';
import { hasCompletedOnboarding } from '@/services/onboarding';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Bootstrap route.
 *
 * The gate between first run and the tab shell. A stored exam profile that has a
 * completion timestamp goes Home; anything else opens onboarding. The decision is
 * read from the same repository the rest of the app uses, so it reflects committed
 * state rather than a flag kept in memory.
 */
export default function BootstrapScreen() {
  const theme = useTheme();
  const { repositories } = useLocalData();
  const [destination, setDestination] = useState<'home' | 'onboarding' | null>(null);

  useEffect(() => {
    if (repositories === null) return;
    let cancelled = false;
    void (async () => {
      let completed = false;
      try {
        completed = await hasCompletedOnboarding(repositories);
      } catch {
        // An unreadable profile must not skip onboarding; the flow itself surfaces
        // any real storage failure with a retry.
        completed = false;
      }
      if (!cancelled) setDestination(completed ? 'home' : 'onboarding');
    })();
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  if (destination !== null) {
    return <Redirect href={destination === 'home' ? '/(tabs)/home' : '/onboarding'} />;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.canvas,
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="ReviewTayo"
        description="Opening your study plan…"
        illustration={<RTOwlMark width={116} />}
      />
    </View>
  );
}
