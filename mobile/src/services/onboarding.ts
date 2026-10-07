import type {
  AppSettingsRecord,
  Repositories,
  StudyPlanRecord,
  StudyTaskRecord,
  UserExamProfileRecord,
} from '@/data/repositories';
import {
  createOnboardingDraft,
  studyDayLabelsFor,
  type OnboardingDraft,
} from '@/domain/onboarding';
import type { ExamRuleConfig } from '@/domain/exams/types';
import { buildWeeklyPlan } from '@/domain/study-plan';
import { createId } from '@/services/ids';

import { DEFAULT_REMINDER_TIME, deviceTimezone, loadAppSettings } from './app-settings';

/**
 * Onboarding service.
 *
 * The flow edits a draft; nothing is written until the learner finishes. This
 * service is the only place that turns a draft into committed state, and it writes
 * the profile, the settings row and the generated study plan in one transaction so
 * a partially onboarded install cannot exist.
 */

export interface OnboardingContext {
  readonly exam: ExamRuleConfig;
  readonly draft: OnboardingDraft;
  /** `null` when the learner has never completed the flow. */
  readonly completedAt: string | null;
}

/** Loads stored answers into a draft, or sensible defaults on a fresh install. */
export const loadOnboardingContext = async (
  repositories: Repositories,
  exam: ExamRuleConfig,
): Promise<OnboardingContext> => {
  const [profile, settings] = await Promise.all([
    repositories.profile.get(),
    repositories.settings.get(),
  ]);

  const draft = createOnboardingDraft({
    exam,
    trackId: profile?.trackId,
    startingPoint: profile?.startingPoint,
    examDate: profile?.examDate,
    studyDays: profile?.studyDays,
    sessionLength: profile?.sessionLength,
    dailyGoal: profile?.dailyGoal,
    themePreference: settings?.themePreference,
    textSize: settings?.textSize,
    remindersEnabled: settings?.remindersEnabled,
  });

  return { exam, draft, completedAt: profile?.onboardingCompletedAt ?? null };
};

export const hasCompletedOnboarding = async (repositories: Repositories): Promise<boolean> => {
  const profile = await repositories.profile.get();
  return (
    typeof profile?.onboardingCompletedAt === 'string' && profile.onboardingCompletedAt.length > 0
  );
};

export interface CommitOnboardingInput {
  readonly exam: ExamRuleConfig;
  readonly draft: OnboardingDraft;
  readonly now?: Date;
}

export interface CommittedOnboarding {
  readonly profile: UserExamProfileRecord;
  readonly settings: AppSettingsRecord;
  readonly plan: StudyPlanRecord;
  readonly tasks: readonly StudyTaskRecord[];
}

const planPayload = (draft: OnboardingDraft, plan: unknown, nowIso: string) => ({
  generatedBy: 'onboarding',
  generatedAt: nowIso,
  account: draft.account,
  sessionLength: draft.sessionLength,
  examDate: draft.examDate.trim() === '' ? null : draft.examDate,
  plan,
});

/**
 * Commits a finished draft: profile, settings and the first weekly plan. Rerunning
 * onboarding (an edit from Settings) keeps the original `createdAt`, deactivates
 * the previous plan and replaces it, so history stays intelligible.
 */
export const commitOnboarding = async (
  repositories: Repositories,
  { exam, draft, now = new Date() }: CommitOnboardingInput,
): Promise<CommittedOnboarding> => {
  const nowIso = now.toISOString();
  const [existingProfile, existingSettings] = await Promise.all([
    repositories.profile.get(),
    loadAppSettings(repositories, now),
  ]);

  const weekly = buildWeeklyPlan(
    exam,
    {
      trackId: draft.trackId,
      startingPoint: draft.startingPoint,
      studyDays: draft.studyDays,
      dailyGoal: draft.dailyGoal,
    },
    now,
  );

  // Re-running onboarding inside the same week regenerates that week's plan in
  // place — the schema keeps one plan per exam per week, and replacing it keeps
  // the plan the learner is already following from splitting in two.
  const existingWeekPlan = await repositories.studyPlans.getByWeek(exam.id, weekly.weekStart);
  const planId = existingWeekPlan?.id ?? createId('plan');
  const plan: StudyPlanRecord = {
    id: planId,
    examId: exam.id,
    trackId: draft.trackId,
    weekStart: weekly.weekStart,
    generatedAt: nowIso,
    isActive: true,
    payload: planPayload(draft, weekly, nowIso),
  };

  const tasks: StudyTaskRecord[] = weekly.days.flatMap((day, dayIndex) =>
    day.tasks.map((task, taskIndex) => ({
      id: createId('task'),
      planId,
      day: day.day,
      kind: task.kind,
      label: task.label,
      targetCount: task.targetCount,
      completedCount: 0,
      status: 'pending',
      position: dayIndex * 10 + taskIndex,
    })),
  );

  const profile: UserExamProfileRecord = {
    examId: exam.id,
    trackId: draft.trackId,
    startingPoint: draft.startingPoint,
    examDate: draft.examDate.trim() === '' ? null : draft.examDate,
    studyDays: studyDayLabelsFor(draft.studyDays),
    sessionLength: draft.sessionLength,
    dailyGoal: draft.dailyGoal,
    onboardingCompletedAt: nowIso,
    createdAt: existingProfile?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  const settings: AppSettingsRecord = {
    ...existingSettings,
    themePreference: draft.themePreference,
    textSize: draft.textSize,
    remindersEnabled: draft.remindersEnabled,
    reminderTime: existingSettings.reminderTime || DEFAULT_REMINDER_TIME,
    reminderTimezone: draft.remindersEnabled
      ? (existingSettings.reminderTimezone ?? deviceTimezone())
      : existingSettings.reminderTimezone,
    updatedAt: nowIso,
  };

  await repositories.transaction(async (transaction) => {
    await repositories.profile.save(profile, { transaction });
    await repositories.settings.save(settings, { transaction });
    await repositories.studyPlans.savePlan(plan, tasks, { transaction });
  });

  return { profile, settings, plan, tasks };
};
