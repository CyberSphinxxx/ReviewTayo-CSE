import type { ReactNode } from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Redirect } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ProgressScreen from '../../app/(tabs)/progress';
import HomeScreen from '../../app/(tabs)/home';
import LearnScreen from '../../app/(tabs)/learn';
import PracticeScreen from '../../app/(tabs)/practice';
import ReviewScreen from '../../app/(tabs)/review';
import TabsLayout from '../../app/(tabs)/_layout';
import { createLocalRepositories } from '@/data/local/repositories';
import type { DatabasePort } from '@/data/local/database-port';
import { runMigrations } from '@/data/local/migration-runner';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import { ok } from '@/domain/result';
import { LocalDataProvider } from '@/store/LocalDataProvider';
import { ThemeProvider } from '@/theme';

import { loadFixturePack } from '@tests/utils/exam-fixtures';

/**
 * Router shell integration.
 *
 * Runs the real Expo Router with the real tab layout over a real seeded SQLite
 * database, so the things the product fixes in place are verified end to end:
 * the bootstrap route lands on Home, all five destinations are present with Home
 * centred, switching tabs works, and the Review badge reflects the actual due
 * count rather than a placeholder.
 */

const NOW = '2026-10-06T08:00:00.000Z';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const seedDatabase = async (examId: string): Promise<DatabasePort> => {
  const db = await openNodeDatabase();
  await runMigrations(db);
  const repositories = createLocalRepositories(db);

  await repositories.profile.save({
    examId,
    trackId: 'professional',
    startingPoint: 'beginner',
    examDate: null,
    studyDays: ['mon'],
    sessionLength: 'standard',
    dailyGoal: 10,
    onboardingCompletedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  });

  for (let index = 0; index < 3; index += 1) {
    await repositories.review.upsert({
      id: `review-${index}`,
      examId,
      conceptId: `concept-${index}`,
      questionId: null,
      source: 'mistake',
      dueAt: '2026-10-05T00:00:00.000Z',
      intervalDays: 1,
      easeLevel: 0,
      lapses: 0,
      reviews: 0,
      lastReviewedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  return db;
};

describe('tab shell routing', () => {
  it('redirects the bootstrap route to Home and renders every destination', async () => {
    const pack = loadFixturePack();
    const database = await seedDatabase(pack.exam.id);

    const Wrapper = ({ children }: { readonly children: ReactNode }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider preference="light" textSize="standard">
          <LocalDataProvider openDatabase={async () => database} loadPacks={() => ok([pack])}>
            {children}
          </LocalDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    const result = renderRouter(
      {
        index: () => <Redirect href="/(tabs)/home" />,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/learn': LearnScreen,
        '(tabs)/practice': PracticeScreen,
        '(tabs)/home': HomeScreen,
        '(tabs)/review': ReviewScreen,
        '(tabs)/progress': ProgressScreen,
      },
      { initialUrl: '/', wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.getPathname()).toBe('/home');
    });

    // Tab labels are asserted for presence here; exact order is fixed and unit
    // tested in navigation.test.tsx. `getAllByText` is used because a screen
    // title can match its own tab label ("Home").
    for (const label of ['Learn', 'Practice', 'Home', 'Review', 'Progress']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    // The Review tab carries the real due count from the seeded database, both in its
    // badge and in its accessibility label — asserted through the label because the
    // Review screen itself now draws the same number, in a larger size.
    await waitFor(() => {
      expect(screen.getByLabelText('Review tab, 3 items due')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByLabelText('Review tab, 3 items due'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/review');
    });
    expect(screen.getByTestId('screen-review')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Progress tab'));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/progress');
    });
    expect(screen.getByTestId('screen-progress')).toBeOnTheScreen();
  });
});
