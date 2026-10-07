import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
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
 * Practice integration.
 *
 * Practice decides what is worth drilling and hands it to the quiz route. These tests
 * seed a real database — a profile on a track, answers and mastery — then render the
 * real router and read the screen, including the two picker screens behind it.
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

interface PracticeRender {
  readonly getPathname: () => string;
  readonly getSearchParams: () => Record<string, string | string[]>;
}

const renderPractice = async (
  database: DatabasePort,
  themePreference: ThemePreference = 'light',
  initialUrl = '/(tabs)/practice',
  waitForTestId = 'practice-title',
): Promise<PracticeRender> => {
  const handle = renderRouter(routes, {
    initialUrl,
    wrapper: buildWrapper(database, themePreference),
  });
  await handle;
  await screen.findByTestId(waitForTestId);
  return {
    getPathname: () => handle.getPathname(),
    getSearchParams: () => handle.getSearchParams(),
  };
};

interface SeedOptions {
  readonly trackId?: string;
  readonly dailyGoal?: number;
  /** `[subjectId, answered, correct]` — enough answers to earn a weakest area. */
  readonly answers?: readonly (readonly [string, number, number])[];
  readonly mastery?: readonly (readonly [string, number, number])[];
}

const seed = async ({
  trackId = 'professional',
  dailyGoal = 10,
  answers = [],
  mastery = [],
}: SeedOptions = {}): Promise<{ db: DatabasePort; repositories: Repositories }> => {
  const { db, repositories } = await createMigratedDatabase();

  await repositories.profile.save({
    examId: 'cse',
    trackId,
    startingPoint: 'beginner',
    examDate: null,
    studyDays: ['Mon', 'Wed', 'Fri'],
    sessionLength: 'regular',
    dailyGoal,
    onboardingCompletedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  });

  let index = 0;
  for (const [subjectId, correct, wrong] of answers) {
    for (let count = 0; count < correct + wrong; count += 1) {
      await repositories.answers.record({
        id: `answer-${index}`,
        sessionId: null,
        questionId: `question-${index}`,
        examId: 'cse',
        subjectId,
        conceptIds: [],
        chosenChoiceId: 'a',
        correctChoiceId: count < correct ? 'a' : 'b',
        isCorrect: count < correct,
        source: 'practice',
        answeredAt: NOW,
        timeSpentSeconds: 20,
      });
      index += 1;
    }
  }

  for (const [conceptId, correct, wrong] of mastery) {
    await repositories.mastery.save({
      conceptId,
      examId: 'cse',
      correctCount: correct,
      wrongCount: wrong,
      level: 0,
      streak: 0,
      lastAnsweredAt: NOW,
      updatedAt: NOW,
    });
  }

  return { db, repositories };
};

const canvasOf = (testID: string): unknown =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

describe('Practice', () => {
  it('leads with one drill, sized to the learner\u2019s own goal', async () => {
    const { db } = await seed({ dailyGoal: 6 });
    await renderPractice(db);

    expect(screen.getByTestId('practice-eyebrow')).toHaveTextContent('Practice');
    expect(screen.getByTestId('practice-title')).toHaveTextContent('Sharpen it up.');
    expect(screen.getByTestId('practice-primary-title')).toHaveTextContent('Smart Drill');
    expect(screen.getByTestId('practice-primary-meta')).toHaveTextContent('6 questions · ~6 min');
    expect(screen.getByTestId('practice-primary-description')).toHaveTextContent(/recent practice/);
    expect(screen.getByTestId('practice-primary-start')).toBeOnTheScreen();
  });

  it('names a weakest area only once there is enough evidence', async () => {
    const empty = await seed();
    await renderPractice(empty.db);
    expect(screen.queryByTestId('practice-action-weakest-area')).toBeNull();
    expect(screen.getByTestId('practice-action-timed-practice')).toBeOnTheScreen();
    expect(screen.getByText('10 questions · 8m')).toBeOnTheScreen();

    // Twelve judged answers at eight right: exactly the two thirds the row reports.
    const seeded = await seed({ answers: [['verbal-ability', 8, 4]] });
    await renderPractice(seeded.db);
    expect(screen.getByTestId('practice-action-weakest-area')).toBeOnTheScreen();
    expect(screen.getByText('Verbal Ability · 67%')).toBeOnTheScreen();
  });

  it('keeps the other modes behind one disclosure', async () => {
    const { db } = await seed();
    await renderPractice(db);

    expect(screen.queryByTestId('practice-more-list')).toBeNull();
    expect(screen.queryByTestId('practice-action-mock-exam')).toBeNull();

    await fireEvent.press(screen.getByTestId('practice-more-toggle'));
    await waitFor(() => expect(screen.getByTestId('practice-more-list')).toBeOnTheScreen());
    for (const id of [
      'random-set',
      'build-a-quiz',
      'mastery-rounds',
      'practice-by-subject',
      'mock-exam',
    ]) {
      expect(screen.getByTestId(`practice-action-${id}`)).toBeOnTheScreen();
    }

    await fireEvent.press(screen.getByTestId('practice-more-toggle'));
    await waitFor(() => expect(screen.queryByTestId('practice-more-list')).toBeNull());
  });

  it('hands the drill to the quiz route with its size and the concepts worth drilling', async () => {
    const { db } = await seed({ dailyGoal: 8 });
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-primary-start'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    const params = result.getSearchParams();
    expect(params.mode).toBe('smart-drill');
    expect(params.count).toBe('8');
    // A new learner has nothing to rank, so the drill is not narrowed to concepts.
    expect(params).not.toHaveProperty('concepts');
  });

  it('narrows the drill to the concepts that need work', async () => {
    const { db } = await seed({
      mastery: [
        ['vocabulary', 1, 3],
        ['grammar-and-usage', 9, 0],
      ],
    });
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-primary-start'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    const concepts = String(result.getSearchParams().concepts ?? '');
    expect(concepts).toContain('vocabulary');
    expect(concepts).not.toContain('grammar-and-usage');
  });

  it('sends a targeted mode straight into its own subject', async () => {
    const { db } = await seed({ answers: [['numerical-ability', 2, 12]] });
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-action-weakest-area'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    expect(result.getSearchParams()).toMatchObject({
      mode: 'weakest-area',
      subjects: 'numerical-ability',
      count: '10',
    });
  });

  it('routes the mock to the mock route rather than a drill', async () => {
    const { db } = await seed();
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-more-toggle'));
    await waitFor(() => expect(screen.getByTestId('practice-action-mock-exam')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('practice-action-mock-exam'));
    await waitFor(() => expect(result.getPathname()).toBe('/mock'));
  });

  it('lets a learner pick one subject to practise', async () => {
    const { db } = await seed({ trackId: 'subprofessional' });
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-more-toggle'));
    await waitFor(() =>
      expect(screen.getByTestId('practice-action-practice-by-subject')).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByTestId('practice-action-practice-by-subject'));
    await waitFor(() => expect(result.getPathname()).toBe('/subject-practice'));

    // The track's own subjects, each with the number of questions it really has.
    expect(screen.getByTestId('subject-practice-clerical-ability')).toBeOnTheScreen();
    expect(screen.queryByTestId('subject-practice-analytical-ability')).toBeNull();

    await fireEvent.press(screen.getByTestId('subject-practice-clerical-ability'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    expect(result.getSearchParams()).toMatchObject({
      mode: 'practice-by-subject',
      subjects: 'clerical-ability',
    });
  });

  it('builds a quiz from the subjects and length the learner chooses', async () => {
    const { db } = await seed();
    const result = await renderPractice(db);

    await fireEvent.press(screen.getByTestId('practice-more-toggle'));
    await waitFor(() =>
      expect(screen.getByTestId('practice-action-build-a-quiz')).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByTestId('practice-action-build-a-quiz'));
    await waitFor(() => expect(result.getPathname()).toBe('/build-quiz'));

    // Nothing chosen means every subject, and the hint says so.
    expect(screen.getByTestId('build-quiz-hint')).toHaveTextContent(
      'Every subject is included until you pick some.',
    );

    await fireEvent.press(screen.getByTestId('build-quiz-subject-verbal-ability'));
    await fireEvent.press(screen.getByTestId('build-quiz-subject-general-information'));
    await waitFor(() =>
      expect(screen.getByTestId('build-quiz-hint')).toHaveTextContent('2 of 4 subjects'),
    );

    await fireEvent.press(screen.getByLabelText('20'));
    await fireEvent.press(screen.getByTestId('build-quiz-start'));
    await waitFor(() => expect(result.getPathname()).toBe('/quiz'));
    const params = result.getSearchParams();
    expect(params.mode).toBe('build-a-quiz');
    expect(params.count).toBe('20');
    expect(String(params.subjects)).toBe('verbal-ability,general-information');
  });

  it('renders in the light and the dark theme', async () => {
    const light = await seed();
    await renderPractice(light.db, 'light');
    expect(canvasOf('screen-practice')).toBe(lightTheme.colors.canvas);

    const dark = await seed();
    await renderPractice(dark.db, 'dark');
    expect(canvasOf('screen-practice')).toBe(darkTheme.colors.canvas);
    expect(darkTheme.colors.canvas).not.toBe(lightTheme.colors.canvas);
  });
});
