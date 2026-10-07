import type { StudyTaskStatus } from './types';

/**
 * Task completion.
 *
 * A task is finished when it is completed or deliberately skipped: a learner who
 * skips today's review has still answered the plan. Treating `skipped` as
 * outstanding would leave Home asking for the same work forever.
 */

export interface CompletableTask {
  readonly status: StudyTaskStatus;
}

export const isTaskComplete = (task: CompletableTask): boolean =>
  task.status === 'completed' || task.status === 'skipped';

/** Fraction of a day's tasks that are finished, 0–1; `0` for a day with no tasks. */
export const completedTaskRatio = (tasks: readonly CompletableTask[]): number => {
  if (tasks.length === 0) return 0;
  return tasks.filter(isTaskComplete).length / tasks.length;
};
