import type { SubjectId } from '@/domain/exams/types';
import type { StudyTaskKind, StudyTaskStatus } from '@/domain/study-plan';

/**
 * Home shapes.
 *
 * These describe what Home needs to read, not where it comes from. The stored
 * records are structurally larger, so a repository row can be passed straight in
 * while the domain stays free of the data layer.
 */

/** One planned activity for a day, as Home reads it. */
export interface HomeTask {
  readonly day: string;
  readonly kind: StudyTaskKind;
  readonly label: string;
  readonly targetCount: number;
  readonly completedCount: number;
  readonly status: StudyTaskStatus;
}

/** One calendar day of study activity, as Home reads it. */
export interface ActivityDay {
  /** Local `YYYY-MM-DD`. */
  readonly day: string;
  readonly questionsAnswered: number;
  readonly correctCount: number;
  readonly goalMet: boolean;
}

/** Accuracy for one subject across every answer source. */
export interface SubjectAccuracyRow {
  readonly subjectId: SubjectId;
  readonly answered: number;
  readonly correct: number;
}

/** An unfinished session the learner can pick up where they left off. */
export interface ResumeCandidate {
  readonly kind: 'mock' | 'practice';
  readonly answeredCount: number;
  readonly totalCount: number;
  readonly updatedAt: string;
}
