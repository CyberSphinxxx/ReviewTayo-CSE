import type { ExamRuleConfig, ExamTrackId } from '@/domain/exams/types';
import { blueprintTotalItems } from '@/domain/exams';
import type { StartingPoint } from '@/domain/onboarding';

import {
  type PlannedStudyDay,
  type PlannedStudyTask,
  type StudyTaskKind,
  type WeeklyStudyPlan,
} from './types';

/**
 * Weekly study plan generation.
 *
 * The first plan has to be honest about what it does not know: with no attempt
 * history there is nothing to adapt to, so it builds a steady weekly rhythm from
 * the learner's own answers — which days they can study, how many questions feel
 * doable, and how ready they say they are. Adaptive planning uses progress data in
 * later phases; this generator stays deterministic so the same inputs always
 * produce the same plan, which is what makes it testable.
 */

const KIND_CYCLES: Record<StartingPoint, readonly StudyTaskKind[]> = {
  beginner: ['learn', 'practice', 'review', 'practice'],
  reviewing: ['review', 'practice', 'practice', 'review'],
  practice: ['practice', 'practice', 'mock', 'review'],
};

const KIND_LABELS: Record<StudyTaskKind, string> = {
  learn: 'Guided lesson',
  practice: 'Practice set',
  review: 'Review due items',
  mock: 'Full mock',
  checkpoint: 'Weekly checkpoint',
};

export interface WeeklyPlanInput {
  readonly trackId: ExamTrackId;
  readonly startingPoint: StartingPoint;
  /** Monday-first weekdays (0 = Monday). Empty means a flexible week. */
  readonly studyDays: readonly number[];
  readonly dailyGoal: number;
}

/** Local `YYYY-MM-DD` — never UTC, so a planned day is the day the learner sees. */
export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Local `YYYY-MM-DD` for the Monday of the week containing `date`. */
export const startOfWeek = (date: Date): string => {
  const weekday = (date.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - weekday);
  return toIsoDate(monday);
};

export const addDaysToIso = (iso: string, days: number): string => {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  if (year === undefined || month === undefined || day === undefined) return iso;
  return toIsoDate(new Date(year, month - 1, day + days));
};

export const taskLabelFor = (kind: StudyTaskKind): string => KIND_LABELS[kind];

const targetCountFor = (
  kind: StudyTaskKind,
  exam: ExamRuleConfig,
  trackId: ExamTrackId,
  dailyGoal: number,
): number => (kind === 'mock' ? blueprintTotalItems(exam, trackId) : dailyGoal);

/**
 * Builds one week of study tasks. `weekStart` may be any date in the target week;
 * the plan is normalised to its Monday. Only the learner's chosen study days
 * receive tasks: a plan that schedules work on days they said they cannot study is
 * a plan they will not follow.
 */
export const buildWeeklyPlan = (
  exam: ExamRuleConfig,
  input: WeeklyPlanInput,
  weekStartDate: Date = new Date(),
): WeeklyStudyPlan => {
  const weekStart = startOfWeek(weekStartDate);
  const cycle = KIND_CYCLES[input.startingPoint];
  const weekdays = [...new Set(input.studyDays)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);

  const days: PlannedStudyDay[] = weekdays.map((weekday, index) => {
    const kind = cycle[index % cycle.length] ?? 'practice';
    const task: PlannedStudyTask = {
      kind,
      label: KIND_LABELS[kind],
      targetCount: targetCountFor(kind, exam, input.trackId, input.dailyGoal),
    };
    return { day: addDaysToIso(weekStart, weekday), weekday, tasks: [task] };
  });

  return {
    version: 1,
    weekStart,
    trackId: input.trackId,
    studyDays: weekdays,
    dailyGoal: input.dailyGoal,
    days,
  };
};

/** `true` when the date is inside the plan's week. */
export const planCoversDate = (plan: WeeklyStudyPlan, date: Date): boolean =>
  startOfWeek(date) === plan.weekStart;
