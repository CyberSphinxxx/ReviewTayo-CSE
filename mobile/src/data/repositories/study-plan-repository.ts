import type { ExamId, ExamTrackId } from '@/domain/exams/types';
import type { StudyTaskKind, StudyTaskStatus } from '@/domain/study-plan';

import type { WriteOptions } from './types';

// Task vocabulary is owned by the domain (see `@/domain/study-plan`); re-exported
// so repository consumers keep one import site.
export {
  STUDY_TASK_KINDS,
  STUDY_TASK_STATUSES,
  type StudyTaskKind,
  type StudyTaskStatus,
} from '@/domain/study-plan';

export interface StudyPlanRecord {
  readonly id: string;
  readonly examId: ExamId;
  readonly trackId: ExamTrackId;
  /** Monday of the planned week, `YYYY-MM-DD`. */
  readonly weekStart: string;
  readonly generatedAt: string;
  readonly isActive: boolean;
  /** The generator's full output, retained so a plan can be reopened faithfully. */
  readonly payload: unknown;
}

export interface StudyTaskRecord {
  readonly id: string;
  readonly planId: string;
  readonly day: string;
  readonly kind: StudyTaskKind;
  readonly label: string;
  readonly targetCount: number;
  readonly completedCount: number;
  readonly status: StudyTaskStatus;
  readonly position: number;
}

export interface StudyPlanRepository {
  getById(id: string): Promise<StudyPlanRecord | null>;
  /** The plan the learner is currently following for an exam. */
  getActive(examId: ExamId): Promise<StudyPlanRecord | null>;
  /** The plan covering a week; a rerun within the week replaces it in place. */
  getByWeek(examId: ExamId, weekStart: string): Promise<StudyPlanRecord | null>;
  listTasks(planId: string): Promise<StudyTaskRecord[]>;
  /**
   * Persists a plan and its tasks atomically and deactivates the previous active
   * plan for the exam, so there is never more than one active plan. Tasks are
   * replaced wholesale: an edited plan that drops a study day must not leave the
   * removed day's task behind.
   */
  savePlan(
    plan: StudyPlanRecord,
    tasks: readonly StudyTaskRecord[],
    options?: WriteOptions,
  ): Promise<void>;
  updateTask(
    taskId: string,
    patch: { completedCount?: number; status?: StudyTaskStatus },
    options?: WriteOptions,
  ): Promise<void>;
  listPlans(examId: ExamId, limit?: number): Promise<StudyPlanRecord[]>;
}
