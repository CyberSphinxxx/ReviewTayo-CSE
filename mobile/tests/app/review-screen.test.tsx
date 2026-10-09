import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ConceptScreen from '../../app/concept';
import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewListScreen from '../../app/review-list';
import ReviewScreen from '../../app/(tabs)/review';
import ReviewSessionScreen from '../../app/review-session';
import TabsLayout from '../../app/(tabs)/_layout';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { darkTheme, lightTheme, ThemeProvider, type ThemePreference } from '@/theme';

import { loadCsePack } from '@tests/utils/exam-fixtures';
import { createMigratedDatabase } from '@tests/utils/database';

/**
 * Review integration.
 *
 * The tab, the deck and the four lists, driven through the real router over a real
 * database. The deck is the one screen in the app where the learner grades themselves,
 * so what is asserted is what actually moved: the due date, the lapse count and the
 * review count behind each answer.
 */

const pack = loadCsePack();
const exam = pack.exam;
const policy = exam.studyPolicy;

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
  '(tabs)/_layout': TabsLayout,
  '(tabs)/home': HomeScreen,
  '(tabs)/learn': LearnScreen,
  '(tabs)/practice': PracticeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
  concept: ConceptScreen,
  'review-list': ReviewListScreen,
  'review-session': ReviewSessionScreen,
};

const buildWrapper = (database: DatabasePort, themePreference: ThemePreference = 'light') => {
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <LocalDataProvider openDatabase={async () => database}>
        <AppearanceProvider initial={{ themePreference, textSize: 'standard' }}>
          <Themed>{children}</Themed>
        </AppearanceProvider>
      </LocalDataProvider>
    </SafeAreaProvider>
  );
  return Wrapper;
};

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

interface ReviewFixture {
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}

const seed = async (): Promise<ReviewFixture> => {
  const { db, repositories } = await createMigratedDatabase();
  await repositories.profile.save({
    examId: 'cse',
    trackId: 'professional',
    startingPoint: 'beginner',
    examDate: null,
    studyDays: ['Mon', 'Wed', 'Fri'],
    sessionLength: 'regular',
    dailyGoal: 10,
    onboardingCompletedAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  });
  return { db, repositories };
};

const schedule = async (
  repositories: Repositories,
  conceptId: string,
  options: { readonly dueAt?: string; readonly lapses?: number } = {},
): Promise<string> => {
  const id = `review-${conceptId}`;
  await repositories.review.upsert({
    id,
    examId: exam.id,
    conceptId,
    questionId: null,
    source: 'mistake',
    dueAt: options.dueAt ?? daysAgo(2),
    intervalDays: 1,
    easeLevel: 0,
    lapses: options.lapses ?? 1,
    reviews: 0,
    lastReviewedAt: null,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  });
  return id;
};

const mastered = async (repositories: Repositories, conceptId: string): Promise<void> => {
  await repositories.mastery.save({
    conceptId,
    examId: exam.id,
    correctCount: 12,
    wrongCount: 1,
    level: 3,
    streak: 6,
    lastAnsweredAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });
};

const renderReview = async (
  database: DatabasePort,
  initialUrl = '/(tabs)/review',
  waitForTestId = 'review-title',
  themePreference: ThemePreference = 'light',
): Promise<void> => {
  const handle = renderRouter(routes, {
    initialUrl,
    wrapper: buildWrapper(database, themePreference),
  });
  await handle;
  await screen.findByTestId(waitForTestId);
};

describe('Review tab', () => {
  it('leads with what is due and what it costs', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');
    await schedule(repositories, 'grammar-and-usage');

    await renderReview(db);

    expect(screen.getByTestId('review-count')).toHaveTextContent('2');
    expect(screen.getByTestId('review-meta')).toHaveTextContent('2 items · 1 minute');
    expect(screen.getByTestId('review-start')).toBeOnTheScreen();
  });

  it('says so when nothing is due, instead of drawing an empty queue', async () => {
    const { db } = await seed();

    await renderReview(db);

    expect(screen.getByTestId('review-caught-up')).toBeOnTheScreen();
    expect(screen.getByTestId('review-caught-up-title')).toHaveTextContent("You're caught up.");
    expect(screen.queryByTestId('review-start')).toBeNull();
  });

  it('keeps the four rows in agreement with the queue', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');
    await repositories.mastery.save({
      conceptId: 'reading-comprehension',
      examId: exam.id,
      correctCount: 1,
      wrongCount: 3,
      level: 0,
      streak: 0,
      lastAnsweredAt: daysAgo(1),
      updatedAt: daysAgo(1),
    });
    const question = pack.questions[0];
    if (question === undefined) return;
    await repositories.savedQuestions.save({
      questionId: question.id,
      examId: exam.id,
      savedAt: daysAgo(1),
    });

    await renderReview(db);

    expect(screen.getByTestId('review-row-mistakes')).toHaveTextContent('1', { exact: false });
    expect(screen.getByTestId('review-row-saved')).toHaveTextContent('Saved', { exact: false });
    expect(screen.getByTestId('review-row-revisit')).toHaveTextContent('Concepts to revisit', {
      exact: false,
    });
    expect(screen.getByTestId('review-row-history')).toHaveTextContent('Nothing reviewed yet', {
      exact: false,
    });
  });

  it('counts the same items the tab badge does', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');
    await schedule(repositories, 'grammar-and-usage');

    await renderReview(db);

    // One count, two places: the badge and the number are read from the same queue.
    expect(screen.getByLabelText('Review tab, 2 items due')).toBeOnTheScreen();
    expect(screen.getByTestId('review-count')).toHaveTextContent('2');
  });

  it('keeps its composition in the dark theme', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');

    await renderReview(db, '/(tabs)/review', 'review-title', 'dark');

    const canvas = StyleSheet.flatten(screen.getByTestId('screen-review').props.style) as {
      backgroundColor?: string;
    };
    expect(canvas.backgroundColor).toBe(darkTheme.colors.canvas);
    expect(canvas.backgroundColor).not.toBe(lightTheme.colors.canvas);
    expect(screen.getByTestId('review-count')).toHaveTextContent('1');
  });
});

describe('Review deck', () => {
  it('holds the answer back until the learner asks for it, then grades the card', async () => {
    const { db, repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary');
    await mastered(repositories, 'vocabulary');

    await renderReview(db, '/review-session', 'review-card');

    expect(screen.getByTestId('review-card-prompt')).toHaveTextContent('Vocabulary');
    expect(screen.getByTestId('review-card-hint')).toHaveTextContent('Tap to reveal');
    expect(screen.queryByTestId('review-card-answer')).toBeNull();
    // Nothing can be graded before it has been read.
    expect(screen.getByTestId('review-again')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('review-card-face'));
    expect(screen.getByTestId('review-card-answer')).toHaveTextContent(
      'Use context and word parts to choose the precise meaning of a word.',
    );

    await fireEvent.press(screen.getByTestId('review-got-it'));
    await waitFor(async () => {
      const stored = await repositories.review.getById(id);
      expect(stored?.reviews).toBe(1);
      expect(stored?.intervalDays).toBe(policy.review.gotItIntervalDays[3]);
      expect(stored?.lapses).toBe(1);
    });
  });

  it('sends an Again back to the examiner rather than pretending it stuck', async () => {
    const { db, repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary', { lapses: 1 });
    await mastered(repositories, 'vocabulary');

    await renderReview(db, '/review-session', 'review-card');
    await fireEvent.press(screen.getByTestId('review-card-face'));
    await fireEvent.press(screen.getByTestId('review-again'));

    await waitFor(async () => {
      const stored = await repositories.review.getById(id);
      expect(stored?.lapses).toBe(2);
      expect(stored?.intervalDays).toBe(policy.review.againIntervalDays);
      expect(stored?.reviews).toBe(0);
    });

    // The deck ends either way: the schedule already knows when to bring it back.
    await waitFor(() => expect(screen.getByTestId('review-complete')).toBeOnTheScreen());
    expect(screen.getByTestId('review-complete-title')).toHaveTextContent('Nice work.');
    expect(screen.getByText('1 item will come back sooner.')).toBeOnTheScreen();
  });

  it('walks every card once and clears the deck', async () => {
    const { db, repositories } = await seed();
    // Oldest due first, which is what puts the longest-waiting concept at the top.
    await schedule(repositories, 'vocabulary', { dueAt: daysAgo(3) });
    await schedule(repositories, 'grammar-and-usage', { dueAt: daysAgo(2) });

    await renderReview(db, '/review-session', 'review-card');
    expect(screen.getByText('Card 1 of 2')).toBeOnTheScreen();
    expect(screen.getByTestId('review-remaining')).toHaveTextContent('2 left');

    for (const [index, conceptName] of ['Vocabulary', 'Grammar and Usage'].entries()) {
      await waitFor(() =>
        expect(screen.getByTestId('review-card-prompt')).toHaveTextContent(conceptName, {
          exact: false,
        }),
      );
      const face = screen.getByTestId('review-card-face');
      await fireEvent.press(face);
      await fireEvent.press(screen.getByTestId('review-got-it'));
      void index;
    }

    await waitFor(() => expect(screen.getByTestId('review-complete')).toBeOnTheScreen());
    expect(screen.getByTestId('review-complete-title')).toHaveTextContent('Review cleared.');
  });

  it('opens the concept a card is about', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');

    await renderReview(db, '/review-session', 'review-card');
    await fireEvent.press(screen.getByTestId('review-open-concept'));

    await waitFor(() => expect(screen.getByTestId('screen-concept')).toBeOnTheScreen());
    expect((await screen.findAllByText('Vocabulary')).length).toBeGreaterThan(0);
  });

  it('reports an empty deck honestly if it is opened with nothing due', async () => {
    const { db } = await seed();

    await renderReview(db, '/review-session', 'review-complete');

    expect(screen.getByTestId('review-complete-title')).toHaveTextContent('Review cleared.');
    expect(screen.getByText('Nothing was due.')).toBeOnTheScreen();
  });
});

describe('Review lists', () => {
  it('shows a mistake with its subject and when it returns', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary', { dueAt: daysAgo(1), lapses: 2 });

    await renderReview(db, '/review-list?kind=mistakes', 'review-list');

    expect(screen.getByTestId('screen-review-list')).toBeOnTheScreen();
    expect(screen.getByTestId('review-list-row-review-vocabulary')).toHaveTextContent(
      'Verbal Ability · Due today · Missed 2 times',
      { exact: false },
    );
  });

  it('shows a saved question with the answer and the reason', async () => {
    const { db, repositories } = await seed();
    const question = pack.questions[0];
    expect(question).toBeDefined();
    if (question === undefined) return;
    await repositories.savedQuestions.save({
      questionId: question.id,
      examId: exam.id,
      savedAt: daysAgo(1),
    });

    await renderReview(db, '/review-list?kind=saved', 'review-list');

    const row = screen.getByTestId(`review-list-row-${question.id}`);
    expect(row).toHaveTextContent('The answer was:', { exact: false });
    expect(row).toHaveTextContent(question.explanation.slice(0, 30), { exact: false });
  });

  it('says a list is empty rather than showing a blank screen', async () => {
    const { db } = await seed();

    await renderReview(db, '/review-list?kind=saved', 'review-list-empty');

    expect(screen.getByTestId('screen-review-list')).toBeOnTheScreen();
    expect(screen.getByText('Nothing saved yet')).toBeOnTheScreen();
  });

  it('treats an unknown list as mistakes instead of failing', async () => {
    const { db, repositories } = await seed();
    await schedule(repositories, 'vocabulary');

    await renderReview(db, '/review-list?kind=nonsense', 'review-list');

    expect(screen.getByText('Mistakes')).toBeOnTheScreen();
    expect(screen.getByTestId('review-list-row-review-vocabulary')).toBeOnTheScreen();
  });

  it('opens the concept behind a revisit row', async () => {
    const { db, repositories } = await seed();
    await repositories.mastery.save({
      conceptId: 'reading-comprehension',
      examId: exam.id,
      correctCount: 1,
      wrongCount: 3,
      level: 0,
      streak: 0,
      lastAnsweredAt: daysAgo(1),
      updatedAt: daysAgo(1),
    });

    await renderReview(db, '/review-list?kind=revisit', 'review-list');
    await fireEvent.press(screen.getByTestId('review-list-open-reading-comprehension'));

    await waitFor(() => expect(screen.getByTestId('screen-concept')).toBeOnTheScreen());
  });
});
