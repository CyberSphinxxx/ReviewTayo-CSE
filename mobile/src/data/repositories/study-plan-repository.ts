import type { ExamId, ExamTrackId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

export const STUDY_TASK_KINDS = ['learn', 'practice', 'review', 'mock', 'checkpoint'] as const;
export type StudyTaskKind = (typeof STUDY_TASK_KINDS)[number];

export const STUDY_TASK_STATUSES = ['pending', 'in-progress', 'completed', 'skipped'] as const;
export type StudyTaskStatus = (typeof STUDY_TASK_STATUSES)[number];

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
  listTasks(planId: string): Promise<StudyTaskRecord[]>;
  /**
   * Persists a new plan and its tasks atomically and deactivates the previous
   * active plan for the exam, so there is never more than one active plan.
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
