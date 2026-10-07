import type { ReactNode } from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import OnboardingScreen from '../../app/onboarding';
import SettingsScreen from '../../app/settings';
import type { DatabasePort } from '@/data/local/database-port';
import { createLocalRepositories } from '@/data/local/repositories';
import { runMigrations } from '@/data/local/migration-runner';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { Repositories } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

/**
 * Settings integration.
 *
 * Settings is where committed preferences are edited, and it has two distinct
 * behaviours that must not blur: appearance and reminders save the moment they
 * change, while plan details reopen the approved onboarding flow at the step that
 * owns the field — so there is exactly one definition of a valid plan. Both are
 * driven here through the real router over a real database.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const COMPLETED_AT = '2026-09-01T00:00:00.000Z';

const Themed = ({ children }: { readonly children: ReactNode }) => {
  const appearance = useAppearance();
  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      {children}
    </ThemeProvider>
  );
};

const routes = {
  settings: SettingsScreen,
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

interface SettingsRender {
  readonly getPathname: () => string;
  readonly getSearchParams: () => Record<string, string | string[]>;
}

const renderSettings = async (database: DatabasePort): Promise<SettingsRender> => {
  const handle = renderRouter(routes, { initialUrl: '/settings', wrapper: buildWrapper(database) });
  // The router handle is a thenable that also carries the routing helpers; settling
  // it first and handing back explicit accessors keeps both.
  await handle;
  await screen.findByTestId('settings-content');
  return {
    getPathname: () => handle.getPathname(),
    getSearchParams: () => handle.getSearchParams(),
  };
};

const tap = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
};

describe('settings flow', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    db = await openNodeDatabase();
    await runMigrations(db);
    repositories = createLocalRepositories(db);

    await repositories.profile.save({
      examId: 'cse',
      trackId: 'professional',
      startingPoint: 'reviewing',
      examDate: '2026-12-01',
      studyDays: ['Mon', 'Wed'],
      sessionLength: 'regular',
      dailyGoal: 10,
      onboardingCompletedAt: COMPLETED_AT,
      createdAt: COMPLETED_AT,
      updatedAt: COMPLETED_AT,
    });
    await repositories.settings.save({
      themePreference: 'light',
      textSize: 'standard',
      remindersEnabled: false,
      reminderTime: '19:00',
      reminderTimezone: null,
      updatedAt: COMPLETED_AT,
    });
  });

  it('shows the committed plan and saves appearance and reminders immediately', async () => {
    await renderSettings(db);

    // The screen reflects committed state, not defaults.
    expect(screen.getByText('Dec 1, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Mon · Wed')).toBeOnTheScreen();
    expect(screen.getByText('10 questions')).toBeOnTheScreen();
    expect(screen.getByText('Regular')).toBeOnTheScreen();
    expect(screen.getByText(/Content 1\.0\.0/)).toBeOnTheScreen();

    await tap('settings-appearance-dark');
    await tap('settings-text-size-large');
    await fireEvent(screen.getByTestId('settings-reminders'), 'valueChange', true);

    await waitFor(async () => {
      expect(await repositories.settings.get()).toMatchObject({
        themePreference: 'dark',
        textSize: 'large',
        remindersEnabled: true,
      });
    });

    // A reminder needs a zone to fire sensibly in; it is captured when enabled.
    const settings = await repositories.settings.get();
    expect(settings?.reminderTime).toBe('19:00');
    expect(settings?.reminderTimezone).not.toBeNull();
  });

  it('reopens onboarding at the step that owns the field it was tapped from', async () => {
    const result = await renderSettings(db);

    await tap('settings-daily-goal');

    await waitFor(() => expect(result.getPathname()).toBe('/onboarding'));
    expect(result.getSearchParams()).toMatchObject({ mode: 'edit', step: 'goal' });
    await waitFor(() => expect(screen.getByText('Step 5 of 8')).toBeOnTheScreen());
    expect(screen.getByText('What feels doable most days?')).toBeOnTheScreen();
    expect(screen.getByTestId('goal-10')).toBeSelected();
  });

  it('preserves plan details that the settings screen does not own', async () => {
    await renderSettings(db);

    await tap('settings-appearance-dark');

    const profile = await repositories.profile.get();
    expect(profile).toMatchObject({
      trackId: 'professional',
      startingPoint: 'reviewing',
      examDate: '2026-12-01',
      studyDays: ['Mon', 'Wed'],
      dailyGoal: 10,
      onboardingCompletedAt: COMPLETED_AT,
    });
  });
});
