import type { ReactNode } from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ConceptScreen from '../../app/concept';
import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import MockScreen from '../../app/mock';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ProgressListScreen from '../../app/progress-list';
import QuizScreen from '../../app/quiz';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider, type ThemePreference } from '@/theme';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Progress integration.
 *
 * The tab and its drill-down, driven through the real router over a real database.
 * Progress is the one screen that claims to measure the learner, so what is asserted is
 * what the evidence behind each number is: that the score moves with answers, that the
 * week counts the work of the week, that the subject called out is the one the answers
 * are wrong about, and that every row leads somewhere true.
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
  mock: MockScreen,
  'progress-list': ProgressListScreen,
  quiz: QuizScreen,
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

/** Local `YYYY-MM-DD` for a day offset, so activity lands on the day the screen reads. */
const localDay = (days: number): string => {
  const date = new Date(Date.now() - days * 86_400_000);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const seed = async (
  options: { readonly examDate?: string } = {},
): Promise<{
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}> => {
  const { db, repositories } = await createMigratedDatabase();
  await repositories.profile.save({
    examId: 'cse',
    trackId: 'professional',
    startingPoint: 'beginner',
    examDate: options.examDate ?? null,
    studyDays: ['Mon', 'Thu'],
    sessionLength: 'regular',
    dailyGoal: 10,
    onboardingCompletedAt: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  });
  return { db, repositories };
};

let answerCount = 0;

/** A recorded answer, as the practice loop would have written it. */
const recordAnswer = async (
  repositories: Repositories,
  input: {
    readonly subjectId: string;
    readonly conceptId: string;
    readonly isCorrect: boolean;
    readonly daysAgo: number;
  },
): Promise<void> => {
  answerCount += 1;
  await repositories.answers.record({
    id: `answer-${answerCount}`,
    sessionId: null,
    questionId: `question-${answerCount}`,
    examId: exam.id,
    subjectId: input.subjectId,
    conceptIds: [input.conceptId],
    chosenChoiceId: 'choice-a',
    correctChoiceId: input.isCorrect ? 'choice-a' : 'choice-b',
    isCorrect: input.isCorrect,
    source: 'practice',
    answeredAt: daysAgo(input.daysAgo),
    timeSpentSeconds: 25,
  });
};

/** The mastery row an answer would have written. */
const recordMastery = async (
  repositories: Repositories,
  conceptId: string,
  correctCount: number,
  wrongCount: number,
  level: number,
): Promise<void> => {
  await repositories.mastery.save({
    conceptId,
    examId: exam.id,
    correctCount,
    wrongCount,
    level,
    streak: correctCount,
    lastAnsweredAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });
};

const recordActivity = async (
  repositories: Repositories,
  days: number,
  questions: number,
  correct: number,
): Promise<void> => {
  for (let index = 0; index < questions; index += 1) {
    await repositories.activity.recordQuestion({
      day: localDay(days),
      examId: exam.id,
      correct: index < correct,
      updatedAt: new Date(Date.now() - days * 86_400_000).toISOString(),
    });
  }
};

/** A learner with a week of steady, correct work behind them. */
const studyWeek = async (repositories: Repositories): Promise<void> => {
  const studied = [
    ['verbal-ability', 'vocabulary'],
    ['verbal-ability', 'grammar-and-usage'],
    ['numerical-ability', 'number-series'],
    ['numerical-ability', 'fractions-and-decimals'],
    ['analytical-ability', 'logical-deduction'],
    ['analytical-ability', 'data-interpretation'],
    ['general-information', 'philippine-constitution'],
  ] as const;

  for (const [index, [subjectId, conceptId]] of studied.entries()) {
    await recordAnswer(repositories, { subjectId, conceptId, isCorrect: true, daysAgo: index });
    await recordActivity(repositories, index, 2, 2);
  }
};

const renderProgress = async (
  database: DatabasePort,
  initialUrl = '/(tabs)/progress',
  waitForTestId = 'progress-title',
  themePreference: ThemePreference = 'light',
): Promise<void> => {
  const handle = renderRouter(routes, {
    initialUrl,
    wrapper: buildWrapper(database, themePreference),
  });
  await handle;
  await screen.findByTestId(waitForTestId);
};

/** Leaves the tab and comes back, which is what makes Progress re-read everything. */
const revisit = async (): Promise<void> => {
  await fireEvent.press(screen.getByLabelText('Learn tab'));
  await screen.findByTestId('learn-title');
  await fireEvent.press(screen.getByLabelText('Progress tab'));
  await screen.findByTestId('progress-title');
};

describe('Progress screen', () => {
  it('draws the score, its trend and every section the learner can act on', async () => {
    const { db, repositories } = await seed();
    await studyWeek(repositories);

    await renderProgress(db);

    expect(screen.getByTestId('progress-eyebrow')).toHaveTextContent('Progress');
    expect(screen.getByTestId('progress-score-value')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-score-trend')).toHaveTextContent('Improving', {
      exact: false,
    });
    expect(screen.getByTestId('progress-sparkline')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-subjects')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-mastery-row')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-journey')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-week')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-mock')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-mock-empty')).toBeOnTheScreen();
  });

  it('reads the score from the answers, not from the days the app was opened', async () => {
    const { db, repositories } = await seed();

    await renderProgress(db);
    expect(screen.getByTestId('progress-score-value')).toHaveTextContent('0');
    expect(screen.getByTestId('progress-score-trend')).toHaveTextContent('Not enough history yet');

    await studyWeek(repositories);
    await revisit();

    await waitFor(() =>
      expect(screen.getByTestId('progress-score-value')).not.toHaveTextContent('0'),
    );
  });

  it('shows each subject\u2019s own accuracy', async () => {
    const { db, repositories } = await seed();
    await recordAnswer(repositories, {
      subjectId: 'numerical-ability',
      conceptId: 'number-series',
      isCorrect: true,
      daysAgo: 0,
    });
    await recordAnswer(repositories, {
      subjectId: 'numerical-ability',
      conceptId: 'number-series',
      isCorrect: false,
      daysAgo: 0,
    });

    await renderProgress(db);

    expect(screen.getByTestId('progress-subject-percent-numerical-ability')).toHaveTextContent(
      '50%',
    );
    expect(screen.getByTestId('progress-subject-percent-verbal-ability')).toHaveTextContent('0%');
  });

  it('names the subject that needs attention once it can honestly tell', async () => {
    const { db, repositories } = await seed();

    await renderProgress(db);
    // No answers at all: the section is absent rather than guessed.
    expect(screen.queryByTestId('progress-needs-attention')).toBeNull();

    for (let index = 0; index < policy.weakestAreaMinimumAttempts; index += 1) {
      await recordAnswer(repositories, {
        subjectId: 'analytical-ability',
        conceptId: 'logical-deduction',
        isCorrect: false,
        daysAgo: 0,
      });
    }
    await revisit();

    await waitFor(() =>
      expect(screen.getByTestId('progress-needs-attention-subject')).toHaveTextContent(
        'Analytical Ability',
      ),
    );
    expect(screen.getByTestId('progress-needs-attention-line')).toHaveTextContent('0% accuracy', {
      exact: false,
    });
  });

  it('starts the drill the Practice tab would have started for that subject', async () => {
    const { db, repositories } = await seed();
    for (let index = 0; index < policy.weakestAreaMinimumAttempts; index += 1) {
      await recordAnswer(repositories, {
        subjectId: 'analytical-ability',
        conceptId: 'logical-deduction',
        isCorrect: false,
        daysAgo: 0,
      });
    }

    await renderProgress(db);
    await waitFor(() =>
      expect(screen.getByTestId('progress-needs-attention-subject')).toHaveTextContent(
        'Analytical Ability',
      ),
    );

    await fireEvent.press(screen.getByTestId('progress-needs-attention-practice'));

    // The quiz route names the mode it was opened with, so arriving at Weakest Area is
    // the whole journey, filter included.
    await screen.findByTestId('screen-quiz');
    expect(screen.getByText('Weakest Area')).toBeOnTheScreen();
  });

  it('opens one subject\u2019s concepts from its accuracy row', async () => {
    const { db, repositories } = await seed();
    await recordAnswer(repositories, {
      subjectId: 'verbal-ability',
      conceptId: 'vocabulary',
      isCorrect: true,
      daysAgo: 1,
    });
    await recordMastery(repositories, 'vocabulary', 12, 1, 3);

    await renderProgress(db);
    await fireEvent.press(screen.getByTestId('progress-subject-verbal-ability'));

    await screen.findByTestId('progress-mastery-list');
    expect(screen.getByTestId('screen-progress-list')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-mastery-list-row-vocabulary')).toHaveTextContent(
      'Vocabulary',
      { exact: false },
    );
    expect(screen.getByTestId('progress-mastery-level-vocabulary')).toHaveTextContent('Mastered');
    expect(screen.getByTestId('progress-mastery-list-summary')).toHaveTextContent(
      '1 of 5 mastered · 1 started',
    );
    // The other subject's concepts are not in this subject's list.
    expect(screen.queryByTestId('progress-mastery-list-row-number-series')).toBeNull();
  });

  it('opens the whole syllabus from the mastery row and one concept from a row', async () => {
    const { db } = await seed();

    await renderProgress(db);
    await fireEvent.press(screen.getByTestId('progress-mastery-row'));

    await screen.findByTestId('progress-mastery-list');
    expect(screen.getByTestId('progress-mastery-list-summary')).toHaveTextContent(
      '18 concepts · not started yet',
    );

    await fireEvent.press(screen.getByTestId('progress-mastery-open-number-series'));

    await screen.findByTestId('screen-concept');
  });

  it('counts this week\u2019s work in the bars and against the learner\u2019s own goal', async () => {
    const { db, repositories } = await seed();
    await recordActivity(repositories, 0, 6, 5);
    await recordActivity(repositories, 1, 4, 4);

    await renderProgress(db);

    expect(screen.getByTestId(`progress-week-day-${localDay(0)}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(/6 questions, today/)).toBeOnTheScreen();
    expect(screen.getByTestId('progress-week-line')).toHaveTextContent('questions', {
      exact: false,
    });
    expect(screen.getByTestId('progress-week-target')).toHaveTextContent('/ 20 questions', {
      exact: false,
    });
    expect(screen.getByTestId('progress-week-goal')).toHaveTextContent('study days', {
      exact: false,
    });
  });

  it('places the learner on the CSE journey from their exam date', async () => {
    const { db } = await seed({ examDate: localDay(-45) });

    await renderProgress(db);

    expect(screen.getByTestId('progress-journey-line')).toHaveTextContent('Accuracy Phase', {
      exact: false,
    });
    expect(screen.getByTestId('progress-journey-status-accuracy')).toHaveTextContent('Now');
    expect(screen.getByTestId('progress-journey-status-foundation')).toHaveTextContent('Done');
    expect(screen.getByTestId('progress-journey-description')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-journey-status-speed')).toBeNull();
  });

  it('asks for a mock exam rather than showing a score it does not have', async () => {
    const { db } = await seed();

    await renderProgress(db);
    await fireEvent.press(screen.getByTestId('progress-mock-empty'));

    await screen.findByTestId('screen-mock');
  });

  it('reports the last completed mock with its score', async () => {
    const { db, repositories } = await seed();
    await repositories.mock.create(
      {
        id: 'mock-1',
        examId: exam.id,
        trackId: 'professional',
        status: 'completed',
        totalItems: 170,
        answeredCount: 170,
        correctCount: 116,
        startedAt: daysAgo(3),
        updatedAt: daysAgo(3),
        completedAt: daysAgo(3),
        expiresAt: daysAgo(3),
        pausedAt: null,
        remainingSeconds: null,
        payload: null,
      },
      [],
    );

    await renderProgress(db);

    expect(await screen.findByText('Full mock · 3 days ago')).toBeOnTheScreen();
    expect(screen.getByText('Professional · 68%')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('progress-mock-row'));
    await screen.findByTestId('screen-mock');
  });

  it('renders in the dark theme', async () => {
    const { db, repositories } = await seed();
    await studyWeek(repositories);

    await renderProgress(db, '/(tabs)/progress', 'progress-title', 'dark');

    expect(screen.getByTestId('progress-score-value')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-week')).toBeOnTheScreen();
  });
});
