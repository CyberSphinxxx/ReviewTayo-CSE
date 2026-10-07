import { isTaskComplete } from '@/domain/study-plan';

import type { ActivityDay, HomeTask } from './types';

/**
 * Today's plan.
 *
 * Home answers "what should I do now?", so the only questions this module answers
 * are: which of the planned tasks belong to today, how much of today's promise has
 * been kept, and whether there is anything left to do at all.
 */

export interface TodaySummary {
  /** Local `YYYY-MM-DD`. */
  readonly day: string;
  readonly tasks: readonly HomeTask[];
  readonly completedTaskCount: number;
  /** Questions answered today, from activity, not from the plan's targets. */
  readonly answered: number;
  readonly correct: number;
  readonly dailyGoal: number;
  /** 0–1 against the daily goal; the ring. */
  readonly progress: number;
  readonly goalMet: boolean;
  /** Every planned task for today is finished (and today had tasks). */
  readonly planComplete: boolean;
  /** Nothing planned is left and nothing is due for review. */
  readonly doneForToday: boolean;
}

export interface TodayInput {
  readonly day: string;
  readonly tasks: readonly HomeTask[];
  readonly activity: ActivityDay | null;
  readonly dailyGoal: number;
  readonly dueCount: number;
}

/** The tasks planned for a given local day, in the order the plan stores them. */
export const tasksForDay = (tasks: readonly HomeTask[], day: string): readonly HomeTask[] =>
  tasks.filter((task) => task.day === day);

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const summarizeToday = ({
  day,
  tasks,
  activity,
  dailyGoal,
  dueCount,
}: TodayInput): TodaySummary => {
  const planned = tasksForDay(tasks, day);
  const answered = activity?.questionsAnswered ?? 0;
  const correct = activity?.correctCount ?? 0;
  const planComplete = planned.length > 0 && planned.every(isTaskComplete);
  const goalMet = activity?.goalMet === true || (dailyGoal > 0 && answered >= dailyGoal);

  return {
    day,
    tasks: planned,
    completedTaskCount: planned.filter(isTaskComplete).length,
    answered,
    correct,
    dailyGoal,
    progress: dailyGoal > 0 ? clamp01(answered / dailyGoal) : 0,
    goalMet,
    planComplete,
    // A day counts as done when the promise made for it is kept — either the
    // planned work is finished or the daily goal is met — and nothing is waiting in
    // the review queue. Anything due means there is still something to do.
    doneForToday: (planComplete || goalMet) && dueCount === 0,
  };
};

/** `N of M questions`, the line beside the ring. */
export const describeGoalProgress = (summary: TodaySummary): string =>
  `${Math.min(summary.answered, summary.dailyGoal)} of ${summary.dailyGoal} questions`;

/** The supportive line under the ring, or the streak it protects. */
export const describeStreakLine = (streak: number): string =>
  streak > 0 ? `${streak}-day streak · small steps count` : 'One question today starts a streak.';
