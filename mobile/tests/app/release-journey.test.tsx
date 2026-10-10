import type { ReactNode } from 'react';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import BootstrapScreen from '../../app/index';
import OnboardingScreen from '../../app/onboarding';
import QuizScreen from '../../app/quiz';
import type { DatabasePort } from '@/data/local/database-port';
import { runMigrations } from '@/data/local/migration-runner';
import { createLocalRepositories } from '@/data/local/repositories';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { Repositories, UserExamProfileRecord } from '@/data/repositories';
import { toIsoDate } from '@/domain/study-plan';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

/**
 * Release journey regression.
 *
 * Phase 16's full regression is the suite as a whole; this file is the one part a
 * per-screen suite cannot give: a single learner walking across routes in one
 * continuous test. A fresh install is sent into onboarding, onboards, lands on
 * Home, answers its first question there and reads its own result; then a
 * half-finished session is paused, the app is closed and reopened against the
 * same database file, and Home brings the learner back to the question they left.
 *
 * Everything is real: the real Expo Router, the real screens, a real migrated
 * SQLite database (file-backed for the restart case), the real content pack.
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
  '(tabs)/home': HomeScreen,
  '(tabs)/learn': LearnScreen,
  '(tabs)/practice': PracticeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
  quiz: QuizScreen,
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

interface Launch {
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}

/** A launch of the app: open the database (a file when asked), migrate it, wire repositories. */
const launch = async (location?: string): Promise<Launch> => {
  const db = await openNodeDatabase(location === undefined ? {} : { location });
  await runMigrations(db);
  return { db, repositories: createLocalRepositories(db) };
};

/**
 * Mounts the app. `renderRouter` is thenable: the resolved value carries the
 * render result (whose `unmount` closes what the providers own), while the
 * thenable itself carries the router helpers (`getPathname`).
 */
const mount = async (
  url: string,
  database: DatabasePort,
): Promise<{
  readonly handle: ReturnType<typeof renderRouter>;
  readonly ui: Awaited<ReturnType<typeof renderRouter>>;
}> => {
  const handle = renderRouter(routes, { initialUrl: url, wrapper: buildWrapper(database) });
  const ui = await handle;
  return { handle, ui };
};

const profile = (): UserExamProfileRecord => ({
  examId: 'cse',
  trackId: 'professional',
  startingPoint: 'beginner',
  examDate: null,
  studyDays: ['Mon', 'Wed', 'Fri'],
  sessionLength: 'regular',
  dailyGoal: 10,
  onboardingCompletedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
});

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

describe('release journey', () => {
  it('walks a fresh install from onboarding into its first answered question', async () => {
    const first = await launch();
    const { repositories } = first;
    const { handle, ui } = await mount('/', first.db);

    // The first frame is the gate: a learner who has never onboarded goes into the flow.
    await waitFor(() => expect(handle.getPathname()).toBe('/onboarding'));
    await screen.findByTestId('onboarding-primary');

    // Through the flow keeping every default except the track and the starting point,
    // which are named so the plan this test will later read is unambiguous.
    await continueTo('Which CSE level are you taking?');
    await tap('track-professional');
    await continueTo('Where should we start?');
    await tap('starting-point-beginner');
    await continueTo('When can you usually study?');
    await continueTo('What feels doable most days?');
    await continueTo("Here's your study plan");
    await continueTo('Make it yours');
    await continueTo("You're all set!");
    await pressPrimary();

    await waitFor(() => expect(handle.getPathname()).toBe('/home'));
    expect(screen.getByTestId('screen-home')).toBeOnTheScreen();

    // Home's first small thing is one question, not a drill.
    await fireEvent.press(screen.getByTestId('home-daily-question'));
    await waitFor(() => expect(handle.getPathname()).toBe('/quiz'));
    await screen.findByTestId('quiz-question');
    expect(await screen.findByText('Question 1 of 1')).toBeOnTheScreen();

    // The question the route actually planned, answered correctly.
    const session = await repositories.practice.findResumable('cse');
    expect(session?.mode).toBe('daily-question');
    if (session === null) return;
    const order = await repositories.practice.listQuestions(session.id);
    const [question] = await repositories.questions.getByIds(
      order.map((entry) => entry.questionId),
    );
    expect(question).toBeDefined();
    if (question === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${question.correctChoiceId}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
    expect(screen.getByTestId('quiz-next')).toHaveTextContent('See results');
    await fireEvent.press(screen.getByTestId('quiz-next'));

    // The first score is the learner's own, and every record behind it agrees.
    await waitFor(() => expect(screen.getByTestId('quiz-results')).toBeOnTheScreen());
    expect(screen.getByTestId('quiz-results-score')).toHaveTextContent('1/1');
    await waitFor(async () => {
      expect((await repositories.practice.getById(session.id))?.status).toBe('completed');
    });
    const answers = await repositories.answers.listBySession(session.id);
    expect(answers).toHaveLength(1);
    expect(answers[0]).toMatchObject({ questionId: question.id, isCorrect: true });
    const today = toIsoDate(new Date());
    expect((await repositories.activity.get(today, 'cse'))?.questionsAnswered).toBe(1);

    await ui.unmount();
  });

  it('brings a half-finished session back after the app is closed and reopened', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reviewtayo-journey-'));
    const location = join(directory, 'reviewtayo.db');
    let ui: Awaited<ReturnType<typeof renderRouter>> | undefined;

    try {
      // First launch: an onboarded learner starts a three-question set and answers one.
      const first = await launch(location);
      await first.repositories.profile.save(profile());

      const firstRun = await mount('/quiz?mode=random-set&count=3', first.db);
      ui = firstRun.ui;
      await screen.findByTestId('quiz-question');
      expect(await screen.findByText('Question 1 of 3')).toBeOnTheScreen();

      const session = await first.repositories.practice.findResumable('cse');
      if (session === null) throw new Error('Expected the route to have started a session.');
      const order = await first.repositories.practice.listQuestions(session.id);
      const [question] = await first.repositories.questions.getByIds(
        order.map((entry) => entry.questionId),
      );
      if (question === undefined) throw new Error('Expected the session to hold a question.');

      await fireEvent.press(screen.getByTestId(`quiz-choice-${question.correctChoiceId}`));
      await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
      await fireEvent.press(screen.getByTestId('quiz-next'));
      await waitFor(() => expect(screen.getByText('Question 2 of 3')).toBeOnTheScreen());

      // Walking away pauses the session rather than throwing the work out.
      await fireEvent.press(screen.getByLabelText('Close'));
      await waitFor(async () => {
        expect((await first.repositories.practice.getById(session.id))?.status).toBe('paused');
      });

      // The app closes: the provider closes the connection it owns.
      await ui.unmount();
      ui = undefined;

      // Second launch, same file, nothing else: the session, its order and the one
      // answer given before the restart are all still there.
      const second = await launch(location);
      expect((await second.repositories.practice.getById(session.id))?.status).toBe('paused');
      expect(await second.repositories.practice.listQuestions(session.id)).toHaveLength(3);
      expect((await second.repositories.answers.listBySession(session.id)).length).toBe(1);

      // Home remembers, with the progress read from those answers…
      const restarted = await mount('/(tabs)/home', second.db);
      ui = restarted.ui;
      await screen.findByTestId('home-resume');
      expect(screen.getByText('Continue practice')).toBeOnTheScreen();
      expect(screen.getByTestId('home-resume-progress')).toHaveTextContent('1 / 3');

      // …and its action reopens the very session that was interrupted (the question
      // screen itself is covered by the quiz suite's own resume test).
      await fireEvent.press(screen.getByTestId('home-resume-action'));
      await waitFor(() => expect(restarted.handle.getPathname()).toBe('/quiz'));
      expect(restarted.handle.getSearchParams()).toMatchObject({
        mode: 'random-set',
        sessionId: session.id,
      });

      await ui.unmount();
      ui = undefined;
    } finally {
      // A failed assertion can leave a tree holding the file. Unmount first, and
      // never let cleanup noise mask the real failure.
      if (ui !== undefined) await ui.unmount().catch(() => undefined);
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
