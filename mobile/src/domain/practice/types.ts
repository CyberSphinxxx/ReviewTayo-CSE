import type { ConceptId, QuestionDifficulty, SessionMode, SubjectId } from '@/domain/exams';

/**
 * Practice shapes.
 *
 * Practice answers "what should I drill?". Everything the screen offers is one of
 * these actions, and an action carries the whole request — count, subjects,
 * concepts, difficulties — so starting a session is a parameter, not a branch.
 */

/** Why a concept was ranked where it was; used for tests and future explanations. */
export type DrillReason = 'weakness' | 'due-review' | 'unseen' | 'low-coverage' | 'recent-lesson';

/** One ranked concept: its score and the reasons that produced it. */
export interface ConceptWeight {
  readonly conceptId: ConceptId;
  readonly subjectId: SubjectId;
  readonly score: number;
  readonly attempts: number;
  readonly reasons: readonly DrillReason[];
}

/** A practice mode as the tab presents it. */
export interface PracticeAction {
  /** Stable key; also the testID suffix and the route's `mode` param. */
  readonly id: string;
  readonly mode: SessionMode;
  readonly title: string;
  /** The one-line size of the session: `10 questions · ~10 min`. */
  readonly meta: string;
  /** Why this action exists / what it will do. */
  readonly description: string;
  readonly count: number;
  readonly subjectIds?: readonly SubjectId[];
  readonly conceptIds?: readonly ConceptId[];
  readonly difficulties?: readonly QuestionDifficulty[];
  /** Wall-clock budget, only for modes that are actually timed. */
  readonly timeLimitMinutes?: number;
}

/** The Practice tab, grouped the way the approved prototype presents it. */
export interface PracticeCatalogue {
  /** The single dominant action. */
  readonly primary: PracticeAction;
  /** Targeted practice: what to fix, and under a clock. */
  readonly targeted: readonly PracticeAction[];
  /** Everything else, behind one disclosure. */
  readonly more: readonly PracticeAction[];
}
