import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import {
  createOnboardingDraft,
  withAppearance,
  withDailyGoal,
  withExamDate,
  withReminders,
  withStartingPoint,
  withTrack,
  type OnboardingDraft,
} from '@/domain/onboarding';
import { loadAppSettings, saveAppSettings } from '@/services/app-settings';
import {
  commitOnboarding,
  hasCompletedOnboarding,
  loadOnboardingContext,
} from '@/services/onboarding';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Onboarding service tests.
 *
 * These run against a real migrated SQLite database, so "committed" means the rows
 * a later screen will actually read: profile, settings and an active study plan
 * with its tasks.
 */

const pack = loadCsePack();
const exam = pack.exam;
const NOW = new Date('2026-10-06T08:00:00.000Z');

const buildDraft = (overrides?: Partial<OnboardingDraft>): OnboardingDraft => ({
  ...createOnboardingDraft({ exam }),
  ...overrides,
});

describe('onboarding service', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  it('loads defaults on a fresh install', async () => {
    const context = await loadOnboardingContext(repositories, exam);

    expect(context.completedAt).toBeNull();
    expect(context.draft).toMatchObject({
      examId: 'cse',
      trackId: 'professional',
      dailyGoal: 10,
      themePreference: 'device',
      textSize: 'standard',
    });
    expect(await hasCompletedOnboarding(repositories)).toBe(false);
  });

  it('commits the profile, settings and first weekly plan together', async () => {
    const draft = withReminders(
      withAppearance(
        withStartingPoint(
          withExamDate(withDailyGoal(withTrack(buildDraft(), 'subprofessional'), 20), '2026-12-01'),
          'beginner',
        ),
        { themePreference: 'dark', textSize: 'large' },
      ),
      true,
    );

    const committed = await commitOnboarding(repositories, { exam, draft, now: NOW });

    const profile = await repositories.profile.get();
    expect(profile).toMatchObject({
      examId: 'cse',
      trackId: 'subprofessional',
      startingPoint: 'beginner',
      examDate: '2026-12-01',
      studyDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      sessionLength: 'regular',
      dailyGoal: 20,
      onboardingCompletedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
    });

    const settings = await repositories.settings.get();
    expect(settings).toMatchObject({
      themePreference: 'dark',
      textSize: 'large',
      remindersEnabled: true,
      reminderTime: '19:00',
      updatedAt: NOW.toISOString(),
    });
    expect(settings?.reminderTimezone).not.toBeNull();

    const active = await repositories.studyPlans.getActive('cse');
    expect(active?.id).toBe(committed.plan.id);
    expect(active?.weekStart).toBe('2026-10-05');
    expect(active?.isActive).toBe(true);
    expect(active?.payload).toMatchObject({ generatedBy: 'onboarding', account: 'guest' });

    const tasks = await repositories.studyPlans.listTasks(committed.plan.id);
    expect(tasks.map((task) => task.kind)).toEqual(['learn', 'practice', 'review', 'practice']);
    expect(tasks.map((task) => task.day)).toEqual([
      '2026-10-05',
      '2026-10-07',
      '2026-10-09',
      '2026-10-10',
    ]);
    expect(tasks.every((task) => task.status === 'pending' && task.completedCount === 0)).toBe(
      true,
    );

    expect(await hasCompletedOnboarding(repositories)).toBe(true);
  });

  it('reopens the flow with the committed answers', async () => {
    await commitOnboarding(repositories, { exam, draft: buildDraft(), now: NOW });
    const context = await loadOnboardingContext(repositories, exam);

    expect(context.completedAt).toBe(NOW.toISOString());
    expect(context.draft).toMatchObject({
      examId: 'cse',
      trackId: 'professional',
      startingPoint: 'reviewing',
      studyDays: [0, 2, 4, 5],
      dailyGoal: 10,
      themePreference: 'device',
      textSize: 'standard',
    });
  });

  it("keeps createdAt and regenerates this week's plan when onboarding is rerun", async () => {
    const first = await commitOnboarding(repositories, { exam, draft: buildDraft(), now: NOW });
    const later = new Date('2026-10-07T08:00:00.000Z');
    const second = await commitOnboarding(repositories, {
      exam,
      draft: withDailyGoal(buildDraft(), 25),
      now: later,
    });

    expect(second.profile.createdAt).toBe(first.profile.createdAt);
    expect(second.profile.updatedAt).toBe(later.toISOString());
    expect(second.profile.dailyGoal).toBe(25);

    // One plan per exam per week: the same week's plan is replaced in place.
    expect(second.plan.id).toBe(first.plan.id);
    const plans = await repositories.studyPlans.listPlans('cse');
    expect(plans).toHaveLength(1);

    const active = await repositories.studyPlans.getActive('cse');
    expect(active?.id).toBe(second.plan.id);
    const tasks = await repositories.studyPlans.listTasks(second.plan.id);
    expect(tasks).toHaveLength(4);
    expect(tasks.every((task) => task.targetCount === 25)).toBe(true);
  });

  it("deactivates the previous week's plan when a new week is planned", async () => {
    const first = await commitOnboarding(repositories, { exam, draft: buildDraft(), now: NOW });
    const nextWeek = new Date('2026-10-13T08:00:00.000Z');
    const second = await commitOnboarding(repositories, {
      exam,
      draft: withDailyGoal(buildDraft(), 15),
      now: nextWeek,
    });

    expect(second.plan.id).not.toBe(first.plan.id);
    expect(second.plan.weekStart).toBe('2026-10-12');
    expect((await repositories.studyPlans.getById(first.plan.id))?.isActive).toBe(false);
    expect((await repositories.studyPlans.getActive('cse'))?.id).toBe(second.plan.id);
    expect(await repositories.studyPlans.listPlans('cse')).toHaveLength(2);
  });

  it('drops tasks for study days removed by an edit', async () => {
    await commitOnboarding(repositories, { exam, draft: buildDraft(), now: NOW });
    await commitOnboarding(repositories, {
      exam,
      draft: { ...buildDraft(), studyDays: [0] },
      now: NOW,
    });

    const active = await repositories.studyPlans.getActive('cse');
    expect(active).not.toBeNull();
    if (active === null) return;
    const tasks = await repositories.studyPlans.listTasks(active.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.day).toBe('2026-10-05');
  });

  it('loads stored appearance without completing onboarding', async () => {
    await saveAppSettings(repositories, { themePreference: 'dark', textSize: 'extra' });

    expect(await hasCompletedOnboarding(repositories)).toBe(false);
    const context = await loadOnboardingContext(repositories, exam);
    expect(context.draft.themePreference).toBe('dark');
    expect(context.draft.textSize).toBe('extra');
  });

  it('falls back to defaults for a settings row that was never written', async () => {
    const settings = await loadAppSettings(repositories, NOW);
    expect(settings).toMatchObject({
      themePreference: 'device',
      textSize: 'standard',
      remindersEnabled: false,
      reminderTime: '19:00',
      reminderTimezone: null,
    });
  });
});
