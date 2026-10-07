import type { ReactNode } from 'react';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import BootstrapScreen from '../../app/index';
import OnboardingScreen from '../../app/onboarding';
import type { DatabasePort } from '@/data/local/database-port';
import { createLocalRepositories } from '@/data/local/repositories';
import { runMigrations } from '@/data/local/migration-runner';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { UserExamProfileRecord } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

/**
 * Bootstrap gate.
 *
 * The first frame of the app is a decision, not a screen: a learner who has never
 * finished onboarding goes to the flow, and everyone else goes Home. It is read
 * from committed state, so "onboarding done" cannot drift from the profile it
 * describes.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const NOW = '2026-10-06T08:00:00.000Z';

const Themed = ({ children }: { readonly children: ReactNode }) => {
  const appearance = useAppearance();
  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      {children}
    </ThemeProvider>
  );
};

const routes = {
  index: BootstrapScreen,
  onboarding: OnboardingScreen,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/learn': LearnScreen,
  '(tabs)/practice': PracticeScreen,
  '(tabs)/home': HomeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
};

const buildWrapper = (database: DatabasePort) => {
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <LocalDataProvider openDatabase={async () => database}>
        <AppearanceProvider initial={{ themePreference: 'light', textSize: 'standard' }}>
          <Themed>{children}</Themed>
        </AppearanceProvider>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
  return Wrapper;
};

const profile = (onboardingCompletedAt: string | null): UserExamProfileRecord => ({
  examId: 'cse',
  trackId: 'professional',
  startingPoint: 'beginner',
  examDate: null,
  studyDays: ['Mon', 'Wed'],
  sessionLength: 'regular',
  dailyGoal: 10,
  onboardingCompletedAt,
  createdAt: NOW,
  updatedAt: NOW,
});

const renderGate = async (database: DatabasePort) => {
  const handle = renderRouter(routes, { initialUrl: '/', wrapper: buildWrapper(database) });
  await handle;
  return { getPathname: () => handle.getPathname() };
};

const openDatabase = async (): Promise<DatabasePort> => {
  const db = await openNodeDatabase();
  await runMigrations(db);
  return db;
};

describe('first-run gate', () => {
  it('sends a learner who has never onboarded into the flow', async () => {
    const database = await openDatabase();
    const result = await renderGate(database);

    await waitFor(() => expect(result.getPathname()).toBe('/onboarding'));
    expect(screen.getByTestId('screen-onboarding')).toBeOnTheScreen();
  });

  it('keeps a learner in the flow when a plan was saved but never finished', async () => {
    const database = await openDatabase();
    // A profile row can exist without a completion stamp — onboarding writes one
    // draft at a time, and a half-finished run must not be treated as done.
    await createLocalRepositories(database).profile.save(profile(null));

    const result = await renderGate(database);

    await waitFor(() => expect(result.getPathname()).toBe('/onboarding'));
  });

  it('sends a returning learner to Home', async () => {
    const database = await openDatabase();
    await createLocalRepositories(database).profile.save(profile(NOW));

    const result = await renderGate(database);

    await waitFor(() => expect(result.getPathname()).toBe('/home'));
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
  });
});
