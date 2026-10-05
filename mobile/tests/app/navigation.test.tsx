import { screen } from '@testing-library/react-native';

import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { HOME_TAB_INDEX, TAB_DEFINITIONS, TabBarIcon, countDueReviews } from '@/navigation';
import type { TabRoute } from '@/navigation';

import { createMigratedDatabase } from '@tests/utils/database';
import { renderWithProviders } from '@tests/utils/render';

/**
 * Navigation shell tests.
 *
 * The product contract is fixed here: five destinations, Home centred, every tab
 * labelled for screen readers, and the Review badge fed from the real local review
 * queue rather than a hard-coded number.
 */

const NOW = '2026-10-06T08:00:00.000Z';

const profile = (examId: string) => ({
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

describe('tab configuration', () => {
  it('fixes the five-tab order with Home centred', () => {
    expect(TAB_DEFINITIONS.map((tab) => tab.route)).toEqual([
      'learn',
      'practice',
      'home',
      'review',
      'progress',
    ]);
    expect(HOME_TAB_INDEX).toBe(2);
  });

  it('gives every tab a readable label and accessibility label', () => {
    for (const tab of TAB_DEFINITIONS) {
      expect(tab.title.length).toBeGreaterThan(0);
      expect(tab.accessibilityLabel).toMatch(/^[A-Z][a-z]+ tab$/);
      expect(tab.icon).toBeDefined();
    }
  });
});

describe('tab bar icons', () => {
  const routes = TAB_DEFINITIONS.map((tab) => tab.route);

  // The icon subtree is deliberately hidden from accessibility (the tab item
  // carries the label), so queries must opt into hidden elements.
  const icon = (route: TabRoute) =>
    screen.getByTestId(`tab-icon-${route}`, { includeHiddenElements: true });

  it.each(routes)('renders the %s icon', async (route: TabRoute) => {
    await renderWithProviders(<TabBarIcon route={route} focused={false} color="#000000" />);
    expect(icon(route)).toBeOnTheScreen();
  });

  it('keeps the Home owl visible when active', async () => {
    await renderWithProviders(<TabBarIcon route="home" focused color="#000000" />);
    expect(icon('home')).toBeOnTheScreen();
  });

  it('renders in the dark theme as well', async () => {
    await renderWithProviders(<TabBarIcon route="review" focused color="#F2A9B8" />, {
      themePreference: 'dark',
    });
    expect(icon('review')).toBeOnTheScreen();
  });
});

describe('review due count', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  it('is zero while no exam profile exists', async () => {
    await repositories.review.upsert({
      id: 'review-1',
      examId: 'cse',
      conceptId: 'vocabulary',
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

    expect(await countDueReviews(repositories, NOW)).toBe(0);
  });

  it('counts only items that are due for the stored profile exam', async () => {
    await repositories.profile.save(profile('cse'));
    await repositories.review.upsert({
      id: 'review-due',
      examId: 'cse',
      conceptId: 'vocabulary',
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
    await repositories.review.upsert({
      id: 'review-future',
      examId: 'cse',
      conceptId: 'grammar',
      questionId: null,
      source: 'mistake',
      dueAt: '2026-11-01T00:00:00.000Z',
      intervalDays: 3,
      easeLevel: 1,
      lapses: 0,
      reviews: 1,
      lastReviewedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await repositories.review.upsert({
      id: 'review-other-exam',
      examId: 'fixture-exam',
      conceptId: 'concept-a',
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

    expect(await countDueReviews(repositories, NOW)).toBe(1);
  });
});
