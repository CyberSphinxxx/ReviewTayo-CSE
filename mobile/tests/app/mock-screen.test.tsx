import type { ReactNode } from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import MockScreen from '../../app/mock';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Mock exam integration.
 *
 * The whole paper through the real router over a real database: the facts before it
 * starts, answering and marking inside it, pausing and picking it up again, submitting it
 * and reading the result — and the one thing a mock must never do, which is tell the
 * learner whether an answer was right before the paper is over.
 */

const pack = loadCsePack();
const exam = pack.exam;

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
  mock: MockScreen,
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

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

const seed = async (): Promise<{
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}> => {
  const { db, repositories } = await createMigratedDatabase();
  await repositories.profile.save({
    examId: 'cse',
    trackId: 'professional',
    startingPoint: 'beginner',
    examDate: null,
    studyDays: ['Mon', 'Thu'],
    sessionLength: 'regular',
    dailyGoal: 10,
    onboardingCompletedAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  });
  return { db, repositories };
};

const renderMock = async (
  database: DatabasePort,
  waitForTestId = 'mock-setup',
  initialUrl = '/mock',
): Promise<void> => {
  const handle = renderRouter(routes, { initialUrl, wrapper: buildWrapper(database) });
  await handle;
  // `screen-mock` is on the shell from the first paint, so the wait has to be for content
  // the model can only show once the local database is ready.
  await screen.findByTestId(waitForTestId);
};

/** Starts a paper through the screen, so the test drives what the learner drives. */
const startPaper = async (): Promise<void> => {
  await fireEvent.press(screen.getByTestId('mock-start'));
  await screen.findByTestId('mock-stem');
};

describe('Mock exam screen', () => {
  it('states the paper’s facts, including what the bank cannot serve', async () => {
    const { db } = await seed();
    await renderMock(db);

    expect(screen.getByTestId('mock-setup')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-fact-items')).toHaveTextContent('170', { exact: false });
    expect(screen.getByTestId('mock-fact-duration')).toHaveTextContent('3h 10m', { exact: false });
    expect(screen.getByTestId('mock-fact-sections')).toHaveTextContent('4', { exact: false });
    expect(screen.getByTestId('mock-section-verbal-ability')).toHaveTextContent('Verbal Ability');
    expect(screen.getByTestId('mock-shortfall')).toHaveTextContent('72 of the 170', {
      exact: false,
    });
    expect(screen.getByTestId('mock-pause-note')).toHaveTextContent('pause', { exact: false });
  });

  it('starts the paper on the first question with the exam’s clock running', async () => {
    const { db, repositories } = await seed();
    await renderMock(db);
    await startPaper();

    expect(screen.getByTestId('mock-stem')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('Question 1 of 72', {
      exact: false,
    });
    expect(screen.getByTestId('mock-clock')).toHaveTextContent('left', { exact: false });
    // Nothing about the answer is revealed inside the paper.
    expect(screen.queryByTestId('mock-feedback')).toBeNull();

    const stored = await repositories.mock.findResumable(exam.id);
    expect(stored?.status).toBe('in-progress');
    expect(stored?.totalItems).toBe(72);
  });

  it('records the answer and the mark, and lets the answer change', async () => {
    const { db, repositories } = await seed();
    await renderMock(db);
    await startPaper();

    const session = await repositories.mock.findResumable(exam.id);
    const items = await repositories.mock.listItems(session?.id ?? '');
    const first = items[0];
    const question = await repositories.questions.getByIds([first?.questionId ?? '']);
    const choices = question[0]?.choices ?? [];
    const wrong = choices.find((choice) => choice.id !== question[0]?.correctChoiceId);

    await fireEvent.press(screen.getByTestId(`mock-choice-${choices[0]?.id ?? ''}`));
    await fireEvent.press(screen.getByTestId(`mock-choice-${wrong?.id ?? ''}`));
    await fireEvent.press(screen.getByTestId('mock-flag'));

    await waitFor(async () => {
      const stored = (await repositories.mock.listItems(session?.id ?? ''))[0];
      expect(stored?.chosenChoiceId).toBe(wrong?.id);
      expect(stored?.isCorrect).toBe(false);
      expect(stored?.flagged).toBe(true);
    });
    expect(screen.getByTestId('mock-flag')).toHaveTextContent('Marked');
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('1 of 72 answered', {
      exact: false,
    });
  });

  it('walks the paper with Next, Previous and the grid', async () => {
    const { db } = await seed();
    await renderMock(db);
    await startPaper();

    await fireEvent.press(screen.getByTestId('mock-next'));
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('Question 2 of 72', {
      exact: false,
    });

    await fireEvent.press(screen.getByTestId('mock-previous'));
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('Question 1 of 72', {
      exact: false,
    });

    await fireEvent.press(screen.getByTestId('mock-grid-toggle'));
    expect(await screen.findByTestId('mock-grid')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('mock-grid-cell-5'));
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('Question 5 of 72', {
      exact: false,
    });
    expect(screen.queryByTestId('mock-grid')).toBeNull();
  });

  it('stops the clock when paused and starts it again from what was left', async () => {
    const { db, repositories } = await seed();
    await renderMock(db);
    await startPaper();

    await fireEvent.press(screen.getByTestId('mock-pause'));
    await screen.findByTestId('mock-paused');
    const paused = await repositories.mock.findResumable(exam.id);
    expect(paused?.status).toBe('paused');
    expect(paused?.remainingSeconds).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('mock-resume'));
    await screen.findByTestId('mock-stem');
    const resumed = await repositories.mock.findResumable(exam.id);
    expect(resumed?.status).toBe('in-progress');
    expect(resumed?.remainingSeconds).toBeNull();
  });

  it('asks before submitting, then reports the score, the sections and the next step', async () => {
    const { db, repositories } = await seed();
    await renderMock(db);
    await startPaper();

    const session = await repositories.mock.findResumable(exam.id);
    const items = await repositories.mock.listItems(session?.id ?? '');
    const question = await repositories.questions.getByIds([items[0]?.questionId ?? '']);
    await fireEvent.press(screen.getByTestId(`mock-choice-${question[0]?.correctChoiceId ?? ''}`));

    await fireEvent.press(screen.getByTestId('mock-submit'));
    expect(await screen.findByTestId('mock-submit-confirm')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-submit-summary')).toHaveTextContent('71 items are unanswered', {
      exact: false,
    });

    await fireEvent.press(screen.getByTestId('mock-submit-confirm-action'));

    await screen.findByTestId('mock-result');
    expect(screen.getByTestId('mock-score')).toHaveTextContent('1');
    expect(screen.getByTestId('mock-score-caption')).toHaveTextContent('1 of 72 items', {
      exact: false,
    });
    expect(screen.getByTestId('mock-passing')).toHaveTextContent('Passing mark 80%', {
      exact: false,
    });
    expect(screen.getByTestId('mock-skipped')).toHaveTextContent('71 skipped');
    expect(screen.getByTestId('mock-breakdown')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-subject-verbal-ability')).toBeOnTheScreen();
    // One answered item out of 72 is not a measurement, and the result says so.
    expect(screen.getByTestId('mock-recommendation-title')).toHaveTextContent(
      'Sit a full simulation',
    );

    const stored = await repositories.mock.getById(session?.id ?? '');
    expect(stored?.status).toBe('completed');
    expect(await repositories.answers.listBySession(session?.id ?? '')).toHaveLength(1);
  });

  it('submits a paper whose time ran out while the app was closed', async () => {
    const { db, repositories } = await seed();
    const sessionId = 'mock-expired';
    await repositories.mock.create(
      {
        id: sessionId,
        examId: exam.id,
        trackId: 'professional',
        status: 'in-progress',
        totalItems: 1,
        answeredCount: 1,
        correctCount: 1,
        startedAt: daysAgo(1),
        updatedAt: daysAgo(1),
        completedAt: null,
        expiresAt: daysAgo(1),
        pausedAt: null,
        remainingSeconds: null,
        payload: null,
      },
      [
        {
          mockSessionId: sessionId,
          questionId: 'never-loaded',
          position: 0,
          chosenChoiceId: 'choice-a',
          isCorrect: true,
          flagged: false,
          answeredAt: daysAgo(1),
        },
      ],
    );

    await renderMock(db, 'mock-result');

    expect(screen.getByTestId('mock-score')).toHaveTextContent('100');
    expect((await repositories.mock.getById(sessionId))?.status).toBe('expired');
  });

  it('leaves a half-answered paper resumable for Home to bring the learner back to', async () => {
    const { db, repositories } = await seed();
    await renderMock(db);
    await startPaper();

    const session = await repositories.mock.findResumable(exam.id);
    const items = await repositories.mock.listItems(session?.id ?? '');
    const questions = await repositories.questions.getByIds(items.map((item) => item.questionId));
    const byId = new Map(questions.map((question) => [question.id, question]));
    const first = byId.get(items[0]?.questionId ?? '');
    const second = byId.get(items[1]?.questionId ?? '');

    await fireEvent.press(screen.getByTestId(`mock-choice-${first?.correctChoiceId ?? ''}`));
    await fireEvent.press(screen.getByTestId('mock-next'));
    await fireEvent.press(screen.getByTestId(`mock-choice-${second?.correctChoiceId ?? ''}`));

    // Leaving the paper is allowed at any point, and the paper stays exactly as it was.
    await fireEvent.press(screen.getByLabelText('Leave the exam'));

    await screen.findByTestId('screen-home');
    expect(await screen.findByTestId('home-resume')).toBeOnTheScreen();
    expect(screen.getByText('Continue mock exam')).toBeOnTheScreen();
    expect(screen.getByTestId('home-resume-progress')).toHaveTextContent('2 / 72');

    const reopened = await repositories.mock.findResumable(exam.id);
    expect(reopened?.id).toBe(session?.id);
    expect(reopened?.status).toBe('in-progress');
    expect(await repositories.mock.listRecent(exam.id)).toHaveLength(1);
  });

  it('offers a fresh paper when the recommendation is to sit one again', async () => {
    const { db } = await seed();
    await renderMock(db);
    await startPaper();
    await fireEvent.press(screen.getByTestId('mock-submit'));
    await fireEvent.press(await screen.findByTestId('mock-submit-confirm-action'));
    await screen.findByTestId('mock-result');

    await fireEvent.press(screen.getByTestId('mock-recommendation-action'));

    await screen.findByTestId('mock-stem');
    expect(screen.getByTestId('mock-progress')).toHaveTextContent('Question 1 of 72', {
      exact: false,
    });
  });
});
