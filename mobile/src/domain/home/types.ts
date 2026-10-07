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

/**
 * Answer accuracy is shared with Practice and Progress (`@/domain/sessions`);
 * re-exported here so Home's own modules keep one import site.
 */
export type { SubjectAccuracy as SubjectAccuracyRow } from '@/domain/sessions';

/** An unfinished session the learner can pick up where they left off. */
export interface ResumeCandidate {
  readonly kind: 'mock' | 'practice';
  /** The stored session, so the card can reopen it rather than start a new one. */
  readonly sessionId: string;
  /** The mode that session was started in; it decides how it is presented again. */
  readonly mode: string;
  readonly answeredCount: number;
  readonly totalCount: number;
  readonly updatedAt: string;
}
