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
import type { DatabasePort } from '@/data/local/database-port';
import { createLocalRepositories } from '@/data/local/repositories';
import { runMigrations } from '@/data/local/migration-runner';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { Repositories } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

/**
 * Onboarding flow integration.
 *
 * Runs the real Expo Router, the real screen and a real migrated SQLite database,
 * then presses through all eight approved steps and asserts what was committed.
 * This is the phase gate: the flow must work end to end, not just in unit tests.
 *
 * Every interaction is awaited: this React Native Testing Library release makes
 * `fireEvent` asynchronous, and an unawaited press leaves an `act()` call open so
 * the next step renders against stale state.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const Themed = ({ children }: { readonly children: ReactNode }) => {
  const appearance = useAppearance();
  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      {children}
    </ThemeProvider>
  );
};

const routes = {
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

interface OnboardingRender {
  readonly getPathname: () => string;
}

const renderOnboarding = async (
  database: DatabasePort,
  initialUrl: string,
): Promise<OnboardingRender> => {
  const handle = renderRouter(routes, { initialUrl, wrapper: buildWrapper(database) });
  // `renderRouter` returns a thenable that also carries the router helpers, and an
  // async function that returned it would be adopted into its resolved value and
  // lose them. Settling it first, then handing back an explicit accessor, keeps
  // both: the mount is complete and `getPathname` still reads the live route.
  await handle;
  // The flow paints a loading state before the stored answers arrive, so waiting
  // on the footer primary is the readiness signal: it exists only once loaded.
  await screen.findByTestId('onboarding-primary');
  return { getPathname: () => handle.getPathname() };
};

const pressPrimary = async () => {
  await fireEvent.press(screen.getByTestId('onboarding-primary'));
};

/** Presses the footer primary and waits for the next step to be on screen. */
const continueTo = async (text: string) => {
  await pressPrimary();
  await waitFor(() => expect(screen.getByText(text)).toBeOnTheScreen());
};

const tap = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
};

describe('onboarding flow', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    db = await openNodeDatabase();
    await runMigrations(db);
    repositories = createLocalRepositories(db);
  });

  // No teardown closes the database: `LocalDataProvider` owns the connection it
  // was given and closes it when the tree unmounts. Closing it here as well throws
  // on an already-closed handle.

  it('walks all eight steps and commits the plan once, at the end', async () => {
    const result = await renderOnboarding(db, '/onboarding');

    expect(screen.getByText('Keep your progress?')).toBeOnTheScreen();
    expect(screen.getByText('Step 1 of 8')).toBeOnTheScreen();

    // Nothing is written while the draft is still open.
    expect(await repositories.profile.get()).toBeNull();
    expect(await repositories.settings.get()).toBeNull();

    await continueTo('Which CSE level are you taking?');
    await tap('track-subprofessional');
    await continueTo('Where should we start?');

    await tap('starting-point-beginner');
    await fireEvent.changeText(screen.getByTestId('exam-date-input'), '2026-12-01');
    expect(screen.getByText(/days to go/)).toBeOnTheScreen();
    await continueTo('When can you usually study?');

    // Friday is a default study day; deselect it, and choose a quick session.
    await tap('study-day-4');
    await tap('session-quick');
    await continueTo('What feels doable most days?');

    await tap('custom-goal-row');
    await fireEvent.changeText(screen.getByTestId('custom-goal-input'), '35');
    expect(screen.getByText('35 questions')).toBeOnTheScreen();
    await continueTo("Here's your study plan");

    // The preview must reflect every earlier answer.
    expect(screen.getByTestId('plan-card')).toBeOnTheScreen();
    expect(screen.getByText('Sub-Professional')).toBeOnTheScreen();
    expect(screen.getByText('Just starting')).toBeOnTheScreen();
    expect(screen.getByText('Mon · Wed · Sat')).toBeOnTheScreen();
    expect(screen.getByText('35 questions')).toBeOnTheScreen();
    expect(screen.getByText('Quick')).toBeOnTheScreen();
    expect(screen.getByText('Dec 1, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Foundation diagnostic')).toBeOnTheScreen();
    expect(screen.getByText('10 questions · ~10 min')).toBeOnTheScreen();

    await continueTo('Make it yours');
    await tap('appearance-dark');
    await tap('text-size-large');
    await fireEvent(screen.getByTestId('reminders-switch'), 'valueChange', true);
    await continueTo("You're all set!");

    expect(screen.getByText('FIRST UP')).toBeOnTheScreen();
    await pressPrimary();

    await waitFor(() => expect(result.getPathname()).toBe('/home'));

    const profile = await repositories.profile.get();
    expect(profile).toMatchObject({
      examId: 'cse',
      trackId: 'subprofessional',
      startingPoint: 'beginner',
      examDate: '2026-12-01',
      studyDays: ['Mon', 'Wed', 'Sat'],
      sessionLength: 'quick',
      dailyGoal: 35,
    });
    expect(profile?.onboardingCompletedAt).not.toBeNull();

    const settings = await repositories.settings.get();
    expect(settings).toMatchObject({
      themePreference: 'dark',
      textSize: 'large',
      remindersEnabled: true,
    });

    const active = await repositories.studyPlans.getActive('cse');
    expect(active).not.toBeNull();
    if (active === null) return;
    const tasks = await repositories.studyPlans.listTasks(active.id);
    expect(tasks.map((task) => task.kind)).toEqual(['learn', 'practice', 'review']);
    expect(tasks.every((task) => task.targetCount === 35)).toBe(true);
  });

  it('keeps the flexible answer when a later step is skipped', async () => {
    await renderOnboarding(db, '/onboarding');

    expect(screen.getByText('Keep your progress?')).toBeOnTheScreen();
    await continueTo('Which CSE level are you taking?');
    await continueTo('Where should we start?');
    await continueTo('When can you usually study?');

    for (const index of [0, 2, 4, 5]) {
      await tap(`study-day-${index}`);
    }
    expect(screen.getByText('No fixed days — your plan stays flexible.')).toBeOnTheScreen();

    await tap('onboarding-skip');
    await waitFor(() => expect(screen.getByText('What feels doable most days?')).toBeOnTheScreen());

    // Skipping keeps the defaults still collected so far, and the plan reflects them.
    await continueTo("Here's your study plan");
    expect(screen.getByText('Flexible')).toBeOnTheScreen();
  });

  it('reopens at a named step in edit mode and preserves the original createdAt', async () => {
    const createdAt = '2026-09-01T00:00:00.000Z';
    await repositories.profile.save({
      examId: 'cse',
      trackId: 'professional',
      startingPoint: 'reviewing',
      examDate: null,
      studyDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      sessionLength: 'regular',
      dailyGoal: 10,
      onboardingCompletedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    await renderOnboarding(db, '/onboarding?mode=edit&step=goal');

    expect(screen.getByText('What feels doable most days?')).toBeOnTheScreen();
    expect(screen.getByText('Step 5 of 8')).toBeOnTheScreen();
    expect(screen.getByTestId('goal-10')).toBeSelected();

    await tap('goal-5');
    await continueTo("Here's your study plan");
    expect(screen.getByText('5 questions')).toBeOnTheScreen();

    await continueTo('Make it yours');
    await continueTo("You're all set!");
    await pressPrimary();

    await waitFor(async () => {
      expect((await repositories.profile.get())?.dailyGoal).toBe(5);
    });
    const profile = await repositories.profile.get();
    expect(profile?.createdAt).toBe(createdAt);
    expect(profile?.onboardingCompletedAt).not.toBe(createdAt);
    expect(profile?.trackId).toBe('professional');
  });
});
