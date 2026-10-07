import type { ReactNode } from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BuildQuizScreen from '../../app/build-quiz';
import ConceptScreen from '../../app/concept';
import GuideScreen from '../../app/guide';
import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import MockScreen from '../../app/mock';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import QuizScreen from '../../app/quiz';
import ReviewScreen from '../../app/(tabs)/review';
import SettingsScreen from '../../app/settings';
import SubjectPracticeScreen from '../../app/subject-practice';
import TabsLayout from '../../app/(tabs)/_layout';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { getConcept } from '@/domain/exams';
import type { Question } from '@/domain/exams/types';
import { toIsoDate } from '@/domain/study-plan';
import { pauseSession, startSession, submitAnswer } from '@/services/practice';
import { AppearanceProvider, useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider, type ThemePreference } from '@/theme';

import { importContentPack } from '@/data/local/content-import';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

const csePack = loadCsePack();
const cseExam = csePack.exam;

/**
 * Question screen integration.
 *
 * The quiz route is where answers become history: one question at a time, checked
 * against the content, explained, and written to the database with mastery, the review
 * queue, today's activity and the plan. These tests drive the real router over a real
 * database and then read the rows back, so what is asserted is what Review and Progress
 * will later see.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const NOW = '2026-10-01T00:00:00.000Z';

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
  '(tabs)/practice': PracticeScreen,
  '(tabs)/learn': LearnScreen,
  '(tabs)/home': HomeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
  'build-quiz': BuildQuizScreen,
  'subject-practice': SubjectPracticeScreen,
  concept: ConceptScreen,
  guide: GuideScreen,
  mock: MockScreen,
  quiz: QuizScreen,
  settings: SettingsScreen,
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

interface QuizFixture {
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}

const seed = async (): Promise<QuizFixture> => {
  const { db, repositories } = await createMigratedDatabase();
  await repositories.profile.save({
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
  return { db, repositories };
};

const renderQuiz = async (
  database: DatabasePort,
  url: string,
  waitForTestId = 'quiz-question',
): Promise<void> => {
  const handle = renderRouter(routes, {
    initialUrl: url,
    wrapper: buildWrapper(database),
  });
  await handle;
  await screen.findByTestId(waitForTestId);
};

/** The session the route just created, in question order. */
const openSession = async (
  repositories: Repositories,
): Promise<{ readonly id: string; readonly questions: readonly Question[] }> => {
  let sessionId = '';
  await waitFor(async () => {
    const session = await repositories.practice.findResumable('cse');
    expect(session).not.toBeNull();
    sessionId = session?.id ?? '';
  });
  const order = await repositories.practice.listQuestions(sessionId);
  const questions = await repositories.questions.getByIds(order.map((entry) => entry.questionId));
  return { id: sessionId, questions };
};

const wrongChoiceId = (question: Question): string => {
  const wrong = question.choices.find((choice) => choice.id !== question.correctChoiceId);
  if (wrong === undefined) throw new Error('Question has no incorrect choice.');
  return wrong.id;
};

describe('Question screen', () => {
  it('checks the answer, explains it and moves the concept', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${first.correctChoiceId}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());

    expect(screen.getByTestId('quiz-feedback-headline')).toHaveTextContent('Correct.');
    expect(screen.getByTestId('quiz-feedback-explanation')).toHaveTextContent(first.explanation);
    expect(screen.queryByTestId('quiz-feedback-review')).toBeNull();
    expect(screen.getByTestId('quiz-next')).toHaveTextContent('Next question');

    // The answer is committed, with the concept's mastery and the day's activity.
    const answers = await repositories.answers.listBySession(session.id);
    expect(answers).toHaveLength(1);
    expect(answers[0]?.isCorrect).toBe(true);
    const conceptId = first.conceptIds[0];
    expect(conceptId).toBeDefined();
    if (conceptId === undefined) return;
    expect((await repositories.mastery.get(conceptId))?.correctCount).toBe(1);
    // Activity is recorded against the real local day, which is what Home reads.
    const today = toIsoDate(new Date());
    expect((await repositories.activity.get(today, 'cse'))?.questionsAnswered).toBe(1);
  });

  it('tells the learner what the answer was and queues the miss', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(first)}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());

    expect(screen.getByTestId('quiz-feedback-headline')).toHaveTextContent('Not quite.');
    const correctText = first.choices.find((choice) => choice.id === first.correctChoiceId)?.text;
    expect(screen.getByTestId('quiz-feedback-answer')).toHaveTextContent(
      new RegExp(
        String(correctText)
          .slice(0, 20)
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      ),
    );
    expect(screen.getByTestId('quiz-feedback-review')).toHaveTextContent(
      'Added to your review queue.',
    );

    const conceptId = first.conceptIds[0];
    expect(conceptId).toBeDefined();
    if (conceptId === undefined) return;
    const item = await repositories.review.findByConcept('cse', conceptId, null);
    expect(item?.source).toBe('mistake');
    expect(item?.lapses).toBe(1);
  });

  it('will not let a second answer replace the first', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(first)}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId(`quiz-choice-${first.correctChoiceId}`));

    const answers = await repositories.answers.listBySession(session.id);
    expect(answers).toHaveLength(1);
    expect(answers[0]?.isCorrect).toBe(false);
  });

  it('walks through the session and reports the score at the end', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    expect(screen.getByText('Question 1 of 3')).toBeOnTheScreen();
    const session = await openSession(repositories);

    for (const [index, question] of session.questions.entries()) {
      await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(question)}`));
      await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
      const isLast = index === session.questions.length - 1;
      expect(screen.getByTestId('quiz-next')).toHaveTextContent(
        isLast ? 'See results' : 'Next question',
      );
      await fireEvent.press(screen.getByTestId('quiz-next'));
      if (!isLast) {
        await waitFor(() =>
          expect(screen.getByText(`Question ${index + 2} of 3`)).toBeOnTheScreen(),
        );
      }
    }

    await waitFor(() => expect(screen.getByTestId('quiz-results')).toBeOnTheScreen());
    expect(screen.getByTestId('quiz-results-score')).toHaveTextContent('0/3');
    expect(screen.getByTestId('quiz-results-line')).toHaveTextContent(
      /the misses are in your review queue/,
    );

    await waitFor(async () => {
      const stored = await repositories.practice.getById(session.id);
      expect(stored?.status).toBe('completed');
      expect(stored?.completedAt).not.toBeNull();
    });
  });

  it('keeps an abandoned session resumable', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${first.correctChoiceId}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('quiz-next'));
    await waitFor(() => expect(screen.getByText('Question 2 of 3')).toBeOnTheScreen());

    // Walking away leaves the session paused rather than thrown away.
    await fireEvent.press(screen.getByLabelText('Close'));
    await waitFor(async () => {
      expect((await repositories.practice.getById(session.id))?.status).toBe('paused');
    });
    expect((await repositories.practice.findResumable('cse'))?.id).toBe(session.id);
  });

  it('picks a paused session up where it stopped', async () => {
    const { db, repositories } = await seed();
    // A session that was already started and partly answered, as a returning learner
    // would have left it. Content has to be in the database before the planner can
    // pick questions from it — the provider normally imports it on mount.
    await importContentPack(repositories, csePack);
    const started = await startSession({
      repositories,
      exam: cseExam,
      trackId: 'professional',
      mode: 'random-set',
      questionCount: 3,
    });
    const first = started.plan.questions[0];
    const second = started.plan.questions[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    await submitAnswer({
      repositories,
      exam: cseExam,
      question: first,
      sessionId: started.session.id,
      chosenChoiceId: first.correctChoiceId,
      dailyGoal: 10,
    });
    await pauseSession(repositories, started.session.id);

    await renderQuiz(db, `/quiz?sessionId=${started.session.id}`);

    expect(screen.getByText('Question 2 of 3')).toBeOnTheScreen();
    expect(screen.queryByText(first.stem)).toBeNull();
    expect(screen.getByText(second.stem)).toBeOnTheScreen();
  });

  it('says so when the request cannot be served', async () => {
    const { db } = await seed();
    // A mode on its own never restricts a session — the request does — so an empty
    // session is what an unsatisfiable filter produces.
    await renderQuiz(db, '/quiz?mode=random-set&count=3&concepts=not-a-concept', 'screen-quiz');

    expect(await screen.findByText('Could not start this session')).toBeOnTheScreen();
    expect(screen.getByText('There are no questions for this mode yet.')).toBeOnTheScreen();
  });

  it('shows the clock for a timed mode', async () => {
    const { db } = await seed();
    await renderQuiz(db, '/quiz?mode=timed-practice&count=10&minutes=8');

    expect(screen.getByTestId('quiz-clock')).toHaveTextContent('8:00');
  });

  it('starts a fresh session when the learner asks for another', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=2');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    for (const [index, question] of session.questions.entries()) {
      await fireEvent.press(screen.getByTestId(`quiz-choice-${question.correctChoiceId}`));
      await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
      await fireEvent.press(screen.getByTestId('quiz-next'));
      void index;
    }
    await waitFor(() => expect(screen.getByTestId('quiz-results')).toBeOnTheScreen());
    expect(screen.getByTestId('quiz-results-score')).toHaveTextContent('2/2');

    // A clean sheet sends the learner wider rather than deeper.
    expect(screen.getByTestId('quiz-results-recommendation')).toHaveTextContent('A clean sheet', {
      exact: false,
    });
    expect(screen.getByTestId('quiz-results-recommended')).toHaveTextContent('Try a mixed set');

    await fireEvent.press(screen.getByTestId('quiz-results-again'));
    await waitFor(() => expect(screen.getByText('Question 1 of 2')).toBeOnTheScreen());
    // A new session, not the finished one reopened.
    const reopened = await repositories.practice.findResumable('cse');
    expect(reopened?.id).not.toBe(session.id);
  });

  it('bookmarks the question on screen, and takes it back', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    expect(await repositories.savedQuestions.isSaved(first.id)).toBe(false);

    await fireEvent.press(screen.getByTestId('quiz-save'));
    await waitFor(async () => {
      expect(await repositories.savedQuestions.isSaved(first.id)).toBe(true);
    });
    expect(await repositories.savedQuestions.count('cse')).toBe(1);

    await fireEvent.press(screen.getByTestId('quiz-save'));
    await waitFor(async () => {
      expect(await repositories.savedQuestions.isSaved(first.id)).toBe(false);
    });
    expect(await repositories.savedQuestions.count('cse')).toBe(0);
  });

  it('follows a miss with another question about the same idea', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(first)}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());

    await fireEvent.press(await screen.findByTestId('quiz-try-similar'));

    // A one-question session in the follow-up mode, not a restarted drill.
    await waitFor(() => expect(screen.getByText('Question 1 of 1')).toBeOnTheScreen());
    expect(screen.getByText('Another Like This')).toBeOnTheScreen();

    const followUp = (await repositories.practice.listRecent('cse', 10)).find(
      (entry) => entry.mode === 'try-another-like-this',
    );
    expect(followUp).toBeDefined();
    if (followUp === undefined) return;
    const order = await repositories.practice.listQuestions(followUp.id);
    expect(order).toHaveLength(1);
    const asked = await repositories.questions.getById(order[0]?.questionId ?? '');
    expect(asked).not.toBeNull();
    // The missed question itself is never asked straight back.
    expect(asked?.id).not.toBe(first.id);
    expect(
      asked?.relatedQuestionGroupId === first.relatedQuestionGroupId ||
        asked?.conceptIds.some((conceptId) => first.conceptIds.includes(conceptId)),
    ).toBe(true);
  });

  it('links a miss to the concept it was about', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=3');
    const session = await openSession(repositories);
    const first = session.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const conceptId = first.conceptIds[0];
    expect(conceptId).toBeDefined();
    if (conceptId === undefined) return;

    await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(first)}`));
    await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('quiz-review-concept'));
    await waitFor(() => expect(screen.getByTestId('screen-concept')).toBeOnTheScreen());

    const concept = getConcept(cseExam, conceptId);
    expect(concept).toBeDefined();
    expect(concept?.name).toBeDefined();
    const titles = await screen.findAllByText(String(concept?.name));
    expect(titles.length).toBeGreaterThan(0);
  });

  it('sends a session of misses to Review', async () => {
    const { db, repositories } = await seed();
    await renderQuiz(db, '/quiz?mode=random-set&count=2');
    const session = await openSession(repositories);

    for (const [index, question] of session.questions.entries()) {
      await fireEvent.press(screen.getByTestId(`quiz-choice-${wrongChoiceId(question)}`));
      await waitFor(() => expect(screen.getByTestId('quiz-feedback')).toBeOnTheScreen());
      void index;
      await fireEvent.press(screen.getByTestId('quiz-next'));
    }
    await waitFor(() => expect(screen.getByTestId('quiz-results')).toBeOnTheScreen());

    // Nothing was right, so the misses — not another set — are what is worth the time.
    expect(screen.getByTestId('quiz-results-recommendation')).toHaveTextContent(
      'That set needs another pass',
      { exact: false },
    );
    expect(screen.getByTestId('quiz-results-recommendation')).toHaveTextContent(
      'concepts are waiting in Review',
      { exact: false },
    );
    const next = screen.getByTestId('quiz-results-recommended');
    expect(next).toHaveTextContent('Go to Review');

    await fireEvent.press(next);
    await waitFor(() => expect(screen.getByTestId('screen-review')).toBeOnTheScreen());
  });
});
