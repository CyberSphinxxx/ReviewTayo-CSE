import type { ExamTrackId } from '@/domain/exams/types';

/**
 * Study plan vocabulary and shapes.
 *
 * The task kinds and statuses are domain vocabulary: the database stores them, the
 * generator emits them and the UI renders them. Defining them here (and re-exporting
 * from the repository) is what keeps a stored plan and a generated plan the same
 * thing.
 */

export const STUDY_TASK_KINDS = ['learn', 'practice', 'review', 'mock', 'checkpoint'] as const;
export type StudyTaskKind = (typeof STUDY_TASK_KINDS)[number];

export const STUDY_TASK_STATUSES = ['pending', 'in-progress', 'completed', 'skipped'] as const;
export type StudyTaskStatus = (typeof STUDY_TASK_STATUSES)[number];

/** One activity the learner is asked to complete on a planned day. */
export interface PlannedStudyTask {
  readonly kind: StudyTaskKind;
  readonly label: string;
  readonly targetCount: number;
}

/** A single planned day (`weekday` is Monday-first, 0 = Monday). */
export interface PlannedStudyDay {
  /** Local `YYYY-MM-DD`. */
  readonly day: string;
  readonly weekday: number;
  readonly tasks: readonly PlannedStudyTask[];
}

/** The generator's output, retained as the stored plan payload. */
export interface WeeklyStudyPlan {
  readonly version: 1;
  /** Monday of the planned week, local `YYYY-MM-DD`. */
  readonly weekStart: string;
  readonly trackId: ExamTrackId;
  readonly studyDays: readonly number[];
  readonly dailyGoal: number;
  readonly days: readonly PlannedStudyDay[];
}
