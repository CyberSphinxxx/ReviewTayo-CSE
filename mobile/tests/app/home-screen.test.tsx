import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import MockScreen from '../../app/mock';
import QuizScreen from '../../app/quiz';
import SettingsScreen from '../../app/settings';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import type { TextStyle } from 'react-native';
import { addDaysToIso, startOfWeek, toIsoDate } from '@/domain/study-plan';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import {
  darkTheme,
  lightTheme,
  ThemeProvider,
  type TextSizePreference,
  type ThemePreference,
} from '@/theme';

import { createMigratedDatabase } from '@tests/utils/database';

/**
 * Home integration.
 *
 * Home is the screen that answers "what should I do now?", and every line on it is
 * derived from committed state. These tests seed a real database — a profile with an
 * exam date, a plan for this week, activity for today and yesterday, items due for
 * review and an unfinished mock — then render the real router and read the screen.
 * The clock is the real one, so the seeded dates are computed from today rather than
 * frozen: what is asserted is the relationship, not a hard-coded calendar.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const TODAY = toIsoDate(new Date());
const YESTERDAY = addDaysToIso(TODAY, -1);
const WEEK_START = startOfWeek(new Date());
/** 30 days out: inside the Accuracy Phase (min 30 days remaining), not Foundation. */
const EXAM_DATE = addDaysToIso(TODAY, 30);

const Themed = ({ children }: { readonly children: ReactNode }) => {
  const appearance = useAppearance();
  return (
    <ThemeProvider preference={appearance.themePreference} textSize={appearance.textSize}>
      {children}
    </ThemeProvider>
  );
};

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/learn': LearnScreen,
  '(tabs)/practice': PracticeScreen,
  '(tabs)/home': HomeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
  quiz: QuizScreen,
  mock: MockScreen,
  settings: SettingsScreen,
};

const buildWrapper = (
  database: DatabasePort,
  themePreference: ThemePreference,
  textSize: TextSizePreference = 'standard',
) => {
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <LocalDataProvider openDatabase={async () => database}>
        <AppearanceProvider initial={{ themePreference, textSize }}>
          <Themed>{children}</Themed>
        </AppearanceProvider>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
  return Wrapper;
};

interface HomeRender {
  readonly getPathname: () => string;
  readonly getSearchParams: () => Record<string, string | string[]>;
}

const renderHome = async (
  database: DatabasePort,
  themePreference: ThemePreference = 'light',
): Promise<HomeRender> => {
  const handle = renderRouter(routes, {
    initialUrl: '/(tabs)/home',
    wrapper: buildWrapper(database, themePreference),
  });
  await handle;
  await screen.findByTestId('home-hero');
  return {
    getPathname: () => handle.getPathname(),
    getSearchParams: () => handle.getSearchParams(),
  };
};

/** The resolved colour of a styled primitive, whose style prop is an array. */
const colorOf = (testID: string): unknown =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style as TextStyle).color;

/** Answers `count` questions on a day, which is what the streak and goal read. */
const answerOn = async (repositories: Repositories, day: string, count: number) => {
  for (let index = 0; index < count; index += 1) {
    await repositories.activity.recordQuestion({ day, examId: 'cse', correct: index % 2 === 0 });
  }
};

interface SeedOptions {
  /** Questions answered today. */
  readonly todayQuestions?: number;
  /** Questions answered yesterday. */
  readonly yesterdayQuestions?: number;
  /** Due review items. */
  readonly dueCount?: number;
  /** Marks today's single plan task complete. */
  readonly planComplete?: boolean;
  /** Uses the exam date from onboarding, or none at all. */
  readonly withExamDate?: boolean;
}

const seed = async ({
  todayQuestions = 4,
  yesterdayQuestions = 3,
  dueCount = 3,
  planComplete = false,
  withExamDate = true,
}: SeedOptions = {}): Promise<{ db: DatabasePort; repositories: Repositories }> => {
  const { db, repositories } = await createMigratedDatabase();

  await repositories.profile.save({
    examId: 'cse',
    trackId: 'professional',
    startingPoint: 'reviewing',
    examDate: withExamDate ? EXAM_DATE : null,
    studyDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    sessionLength: 'regular',
    dailyGoal: 10,
    onboardingCompletedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  });

  await repositories.studyPlans.savePlan(
    {
      id: 'plan-1',
      examId: 'cse',
      trackId: 'professional',
      weekStart: WEEK_START,
      generatedAt: '2026-09-01T00:00:00.000Z',
      isActive: true,
      payload: { version: 1 },
    },
    [
      {
        id: 'task-1',
        planId: 'plan-1',
        day: TODAY,
        kind: 'practice',
        label: 'Practice set',
        targetCount: 10,
        completedCount: planComplete ? 10 : 0,
        status: planComplete ? 'completed' : 'pending',
        position: 0,
      },
    ],
  );

  await answerOn(repositories, TODAY, todayQuestions);
  await answerOn(repositories, YESTERDAY, yesterdayQuestions);

  for (let index = 0; index < dueCount; index += 1) {
    await repositories.review.upsert({
      id: `review-${index}`,
      examId: 'cse',
      conceptId: `concept-${index}`,
      questionId: null,
      source: 'mistake',
      dueAt: '2026-10-01T00:00:00.000Z',
      intervalDays: 1,
      easeLevel: 0,
      lapses: 0,
      reviews: 0,
      lastReviewedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
  }

  return { db, repositories };
};

describe('Home', () => {
  it('leads with the phase, one recommendation and today\u2019s three small things', async () => {
    const { db } = await seed();
    await renderHome(db);

    // Hero: phase and countdown from the profile's exam date, and a recommendation
    // sized by the learner's own daily goal.
    expect(screen.getByTestId('home-phase-pill')).toHaveTextContent(
      'Accuracy Phase · 30 days left',
    );
    expect(screen.getByTestId('home-headline')).toHaveTextContent('Your next 10 are ready.');
    expect(screen.getByTestId('home-drill-meta')).toHaveTextContent(
      'Personalized from your recent practice',
    );
    expect(screen.getByTestId('home-smart-drill')).toBeOnTheScreen();

    // The three daily actions, each with a duration from the exam's policy.
    expect(screen.getByText('Daily Question')).toBeOnTheScreen();
    expect(screen.getByText('1 minute')).toBeOnTheScreen();
    expect(screen.getByText('10 questions · ~10 min')).toBeOnTheScreen();
    expect(screen.getByText('3 items · ~2 min')).toBeOnTheScreen();

    // Today's promise and the streak it protects.
    expect(screen.getByTestId('home-goal-line')).toHaveTextContent('4 of 10 questions');
    expect(screen.getByTestId('home-streak-line')).toHaveTextContent(/2-day streak/);

    // The plan's own task for today is surfaced rather than hidden behind the CTA.
    expect(screen.getByTestId('home-plan-tasks')).toBeOnTheScreen();
    expect(screen.getByTestId('home-task-practice')).toBeOnTheScreen();
  });

  it('shows what is due from the real review queue, not a placeholder', async () => {
    const { db } = await seed({ dueCount: 7 });
    await renderHome(db);

    expect(screen.getByText('7 items · ~4 min')).toBeOnTheScreen();
  });

  it('offers the unfinished mock and can be dismissed', async () => {
    const { db, repositories } = await seed();
    await repositories.mock.create(
      {
        id: 'mock-1',
        examId: 'cse',
        trackId: 'professional',
        status: 'paused',
        totalItems: 170,
        answeredCount: 83,
        correctCount: 61,
        startedAt: '2026-10-06T09:00:00.000Z',
        updatedAt: '2026-10-06T10:00:00.000Z',
        completedAt: null,
        expiresAt: '2027-10-06T10:00:00.000Z',
        pausedAt: '2026-10-06T10:00:00.000Z',
        remainingSeconds: 5400,
        payload: null,
      },
      [],
    );

    await renderHome(db);

    expect(screen.getByTestId('home-resume')).toBeOnTheScreen();
    expect(screen.getByTestId('home-resume-progress')).toHaveTextContent('83 / 170');
    expect(screen.getByText('Continue mock exam')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('home-resume-dismiss'));
    await waitFor(() => expect(screen.queryByTestId('home-resume')).toBeNull());
  });

  it('offers an unfinished practice session when there is no mock to resume', async () => {
    const { db, repositories } = await seed();
    await repositories.practice.create(
      {
        id: 'session-1',
        examId: 'cse',
        trackId: 'professional',
        mode: 'smart-drill',
        status: 'paused',
        requestedCount: 10,
        correctCount: 3,
        startedAt: '2026-10-06T09:00:00.000Z',
        updatedAt: '2026-10-06T09:30:00.000Z',
        completedAt: null,
        durationSeconds: 900,
        timeLimitSeconds: null,
        timeRemainingSeconds: null,
      },
      ['q-1', 'q-2', 'q-3'],
    );
    // Two of the three planned questions were actually answered before pausing.
    for (const [index, questionId] of ['q-1', 'q-2'].entries()) {
      await repositories.answers.record({
        id: `answer-${index}`,
        sessionId: 'session-1',
        questionId,
        examId: 'cse',
        subjectId: 'verbal-ability',
        conceptIds: [],
        chosenChoiceId: 'a',
        correctChoiceId: 'a',
        isCorrect: true,
        source: 'practice',
        answeredAt: '2026-10-06T09:10:00.000Z',
        timeSpentSeconds: 30,
      });
    }

    const result = await renderHome(db);

    expect(screen.getByTestId('home-resume')).toBeOnTheScreen();
    expect(screen.getByText('Continue practice')).toBeOnTheScreen();
    // Answered over requested, from the answers themselves rather than a guess.
    expect(screen.getByTestId('home-resume-progress')).toHaveTextContent('2 / 10');

    // Resuming reopens that session rather than starting a new one.
    await fireEvent.press(screen.getByTestId('home-resume-action'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    expect(result.getSearchParams()).toMatchObject({
      mode: 'smart-drill',
      sessionId: 'session-1',
    });
  });

  it('says the day is done once nothing is planned and nothing is due', async () => {
    const { db } = await seed({ todayQuestions: 12, dueCount: 0, planComplete: true });
    await renderHome(db);

    expect(screen.getByTestId('home-headline')).toHaveTextContent("You're done for today.");
    expect(screen.getByTestId('home-context')).toHaveTextContent(/Come back tomorrow\./);
    expect(screen.getByTestId('home-done-banner')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-resume')).toBeNull();
  });

  it('never calls the day done while review is still waiting', async () => {
    const { db } = await seed({ todayQuestions: 12, dueCount: 2, planComplete: true });
    await renderHome(db);

    expect(screen.getByTestId('home-headline')).toHaveTextContent('Your next 10 are ready.');
    expect(screen.queryByTestId('home-done-banner')).toBeNull();
  });

  it('reads a plan-less day as flexible rather than broken', async () => {
    const { db } = await seed({
      withExamDate: false,
      todayQuestions: 0,
      yesterdayQuestions: 0,
      dueCount: 0,
    });
    await renderHome(db);

    // No exam date: the phase stands alone, with no countdown invented.
    expect(screen.getByTestId('home-phase-pill')).toHaveTextContent('Flexible Study');
    expect(screen.getByTestId('home-goal-line')).toHaveTextContent('0 of 10 questions');
    expect(screen.getByTestId('home-streak-line')).toHaveTextContent(
      'One question today starts a streak.',
    );
    expect(screen.getByText('0 items · 1 minute')).toBeOnTheScreen();
  });

  it('keeps yesterday\u2019s streak standing before today\u2019s first question', async () => {
    const { db } = await seed({ todayQuestions: 0, yesterdayQuestions: 2 });
    await renderHome(db);

    // A streak is not broken at midnight: it survives a day that has not started yet.
    expect(screen.getByTestId('home-streak-line')).toHaveTextContent(/1-day streak/);
  });

  it('renders the hero as a brand surface in the light theme', async () => {
    const { db } = await seed();
    await renderHome(db, 'light');

    expect(StyleSheet.flatten(screen.getByTestId('screen-home').props.style).backgroundColor).toBe(
      lightTheme.colors.canvas,
    );
    expect(StyleSheet.flatten(screen.getByTestId('home-hero').props.style).backgroundColor).toBe(
      lightTheme.colors.primary,
    );
    expect(colorOf('home-headline')).toBe(lightTheme.colors.textInverse);
  });

  it('renders the hero as a brand surface in the dark theme', async () => {
    const { db } = await seed();
    await renderHome(db, 'dark');

    // Dark mode is a system of its own, not an inversion: the canvas changes while
    // the hero stays the same brand maroon and keeps inverse text on it.
    expect(StyleSheet.flatten(screen.getByTestId('screen-home').props.style).backgroundColor).toBe(
      darkTheme.colors.canvas,
    );
    expect(darkTheme.colors.canvas).not.toBe(lightTheme.colors.canvas);
    expect(StyleSheet.flatten(screen.getByTestId('home-hero').props.style).backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(colorOf('home-headline')).toBe(darkTheme.colors.textInverse);
  });

  it('routes the primary actions to the places that own them', async () => {
    const { db } = await seed();
    const result = await renderHome(db);

    await fireEvent.press(screen.getByTestId('home-smart-drill'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    expect(result.getSearchParams()).toMatchObject({ mode: 'smart-drill' });
  });
});
