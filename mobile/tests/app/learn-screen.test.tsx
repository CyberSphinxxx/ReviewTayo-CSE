import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LearnScreen from '../../app/(tabs)/learn';
import HomeScreen from '../../app/(tabs)/home';
import PracticeScreen from '../../app/(tabs)/practice';
import ProgressScreen from '../../app/(tabs)/progress';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import ConceptScreen from '../../app/concept';
import GuideScreen from '../../app/guide';
import MockScreen from '../../app/mock';
import QuizScreen from '../../app/quiz';
import SettingsScreen from '../../app/settings';
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
 * Learn integration.
 *
 * Learn is the "understand it first" tab, and everything on it is derived: which
 * concept to read next, how far into each subject the learner is, and what the
 * guides contain. These tests seed a real database — a profile on a chosen track,
 * answers, and mastery evidence — then render the real router and read the screen.
 * The track is a parameter, so the differences between CSE Professional and
 * Sub-Professional are exercised for real rather than asserted from a fixture.
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
  '(tabs)/learn': LearnScreen,
  '(tabs)/practice': PracticeScreen,
  '(tabs)/home': HomeScreen,
  '(tabs)/review': ReviewScreen,
  '(tabs)/progress': ProgressScreen,
  concept: ConceptScreen,
  guide: GuideScreen,
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

interface LearnRender {
  readonly getPathname: () => string;
  readonly getSearchParams: () => Record<string, string | string[]>;
}

const renderLearn = async (
  database: DatabasePort,
  themePreference: ThemePreference = 'light',
  initialUrl = '/(tabs)/learn',
  waitForTestId = 'learn-title',
): Promise<LearnRender> => {
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

/** The resolved colour of a styled primitive, whose style prop is an array. */
const canvasOf = (testID: string): unknown =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

interface SeedOptions {
  readonly trackId?: string;
  /** Answers recorded per subject, as `[subjectId, correct, wrong]`. */
  readonly answers?: readonly (readonly [string, number, number])[];
  /** Mastery evidence per concept, as `[conceptId, correct, wrong, answeredAt]`. */
  readonly mastery?: readonly (readonly [string, number, number, string?])[];
}

/**
 * Seeds a profile plus the answers and mastery evidence Learn reads. Answers and
 * mastery are seeded together on purpose: Learn reads accuracy from answers and
 * mastery from its own store, and the two must come from the same history.
 */
const seed = async ({
  trackId = 'professional',
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
    dailyGoal: 10,
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

  for (const [conceptId, correct, wrong, answeredAt] of mastery) {
    await repositories.mastery.save({
      conceptId,
      examId: 'cse',
      correctCount: correct,
      wrongCount: wrong,
      level: 0,
      streak: 0,
      lastAnsweredAt: answeredAt ?? NOW,
      updatedAt: NOW,
    });
  }

  return { db, repositories };
};

describe('Learn', () => {
  it('leads with the editorial title and the lesson to read next', async () => {
    const { db } = await seed();
    await renderLearn(db);

    expect(screen.getByTestId('learn-eyebrow')).toHaveTextContent('Learn');
    expect(screen.getByTestId('learn-title')).toHaveTextContent('Understand it first.');

    // A learner with no history is told where to start rather than shown nothing.
    expect(screen.getByTestId('learn-continue-eyebrow')).toHaveTextContent('Start here');
    expect(screen.getByTestId('learn-continue-concept')).toHaveTextContent('Vocabulary');
    expect(screen.getByTestId('learn-continue-lesson')).toHaveTextContent('Lesson 1 of 5');
    expect(screen.getByTestId('learn-continue-subject')).toHaveTextContent('Verbal Ability');
  });

  it('resumes the concept the learner is partway through', async () => {
    const { db } = await seed({
      mastery: [['sentence-completion', 2, 1, '2026-10-05T09:00:00.000Z']],
    });
    await renderLearn(db);

    expect(screen.getByTestId('learn-continue-eyebrow')).toHaveTextContent('Continue learning');
    expect(screen.getByTestId('learn-continue-concept')).toHaveTextContent('Sentence Completion');
    expect(screen.getByTestId('learn-continue-lesson')).toHaveTextContent('Lesson 3 of 5');
    expect(screen.getByTestId('learn-continue-mastery')).toHaveTextContent('Developing');
  });

  it('never greets a learner with a mastery claim they have not earned', async () => {
    const { db } = await seed({ mastery: [['vocabulary', 1, 0]] });
    await renderLearn(db);

    // One right answer is early progress, not a level.
    expect(screen.getByTestId('learn-continue-mastery')).toHaveTextContent('Learning');
  });

  it('offers a quick sheet per subject and opens the concept behind it', async () => {
    const { db } = await seed();
    const result = await renderLearn(db);

    for (const conceptId of [
      'vocabulary',
      'basic-operations',
      'number-series',
      'philippine-constitution',
    ]) {
      expect(screen.getByTestId(`learn-quick-sheet-${conceptId}`)).toBeOnTheScreen();
    }
    expect(screen.getAllByText('2 min read')).toHaveLength(4);

    await fireEvent.press(screen.getByTestId('learn-quick-sheet-vocabulary'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/concept');
    });
    expect(result.getSearchParams()).toMatchObject({ conceptId: 'vocabulary' });

    // The concept page carries the content's own summary, not placeholder text.
    expect(screen.getByTestId('concept-summary')).toHaveTextContent(/context and word parts/);
  });

  it('shows every subject of the learner\u2019s track with the accuracy it earned', async () => {
    const { db } = await seed({
      answers: [['verbal-ability', 3, 1]],
      mastery: [['vocabulary', 6, 0]],
    });
    await renderLearn(db);

    expect(screen.getByTestId('learn-subject-verbal-ability')).toBeOnTheScreen();
    expect(screen.getByTestId('learn-subject-numerical-ability')).toBeOnTheScreen();
    expect(screen.getByTestId('learn-subject-analytical-ability')).toBeOnTheScreen();
    expect(screen.getByTestId('learn-subject-general-information')).toBeOnTheScreen();

    expect(screen.getByTestId('learn-subject-meta-verbal-ability')).toHaveTextContent(
      '75% accuracy · 1 of 5 mastered',
    );
    // A subject nobody has touched says so rather than reporting a confident zero.
    expect(screen.getByTestId('learn-subject-meta-numerical-ability')).toHaveTextContent(
      '5 concepts · not started',
    );

    const bar = screen.getByTestId('learn-subject-progress-verbal-ability');
    expect(bar.props.accessibilityValue).toMatchObject({ now: 75 });
  });

  it('follows the track the learner chose, not the default one', async () => {
    const { db } = await seed({ trackId: 'subprofessional' });
    await renderLearn(db);

    // Clerical Ability is examined by Sub-Professional only; Analytical is not.
    expect(screen.getByTestId('learn-subject-clerical-ability')).toBeOnTheScreen();
    expect(screen.queryByTestId('learn-subject-analytical-ability')).toBeNull();
    expect(screen.getByTestId('learn-quick-sheet-alphabetizing-and-filing')).toBeOnTheScreen();
    expect(screen.queryByTestId('learn-quick-sheet-number-series')).toBeNull();
  });

  it('never puts Review Due back into Learn', async () => {
    const { db } = await seed({
      answers: [['verbal-ability', 3, 1]],
      mastery: [['sentence-completion', 2, 1]],
    });
    await renderLearn(db);

    expect(screen.queryByText(/review due/i)).toBeNull();
    expect(screen.queryByTestId('learn-review')).toBeNull();
  });

  it('routes a subject to its guide and a lesson to its concept', async () => {
    const { db } = await seed();
    const result = await renderLearn(db);

    await fireEvent.press(screen.getByTestId('learn-subject-numerical-ability'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/guide');
    });
    expect(result.getSearchParams()).toMatchObject({ subjectId: 'numerical-ability' });

    // The guide is the subject's own lessons, in order.
    expect(screen.getByTestId('guide-section-numerical-ability')).toBeOnTheScreen();
    expect(screen.getByTestId('guide-concept-basic-operations')).toBeOnTheScreen();
    expect(screen.queryByTestId('guide-concept-vocabulary')).toBeNull();
    expect(screen.getByText('Numerical Ability')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('guide-concept-percentages'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/concept');
    });
    expect(result.getSearchParams()).toMatchObject({ conceptId: 'percentages' });
    expect(screen.getByTestId('concept-summary')).toHaveTextContent(/percent/);
  });

  it('opens the whole study guide when every subject is asked for', async () => {
    const { db } = await seed({ trackId: 'subprofessional' });
    const result = await renderLearn(db);

    expect(screen.getByTestId('learn-guides-line')).toHaveTextContent('4 subjects · 18 concepts');
    expect(screen.getByText('Every subject')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('learn-guides-all'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/guide');
    });
    expect(screen.getByTestId('guide-section-verbal-ability')).toBeOnTheScreen();
    expect(screen.getByTestId('guide-section-clerical-ability')).toBeOnTheScreen();
    expect(screen.queryByTestId('guide-section-analytical-ability')).toBeNull();
  });

  it('renders as the light and the dark theme', async () => {
    const light = await seed();
    await renderLearn(light.db, 'light');
    expect(canvasOf('screen-learn')).toBe(lightTheme.colors.canvas);
    expect(lightTheme.colors.canvas).not.toBe(darkTheme.colors.canvas);

    const dark = await seed();
    await renderLearn(dark.db, 'dark');
    expect(canvasOf('screen-learn')).toBe(darkTheme.colors.canvas);
  });

  it('tells the learner when a concept is not part of their exam', async () => {
    const { db } = await seed();
    await renderLearn(db, 'light', '/concept?conceptId=not-a-concept', 'screen-concept');

    expect(await screen.findByText('Concept not found')).toBeOnTheScreen();
  });
});
