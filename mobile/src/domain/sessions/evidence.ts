import type { ConceptId, SubjectId } from '@/domain/exams/types';

/**
 * What the learner has actually done.
 *
 * Every recommendation in the app — Home's drill size, Learn's "next concept",
 * Practice's Smart Drill, Progress's needs-attention line — is derived from these two
 * shapes and nothing else. They are deliberately structural: a repository row can be
 * passed straight in, and no layer has to know where the numbers came from.
 */

/** Accuracy for one subject across every answer source. */
export interface SubjectAccuracy {
  readonly subjectId: SubjectId;
  readonly answered: number;
  readonly correct: number;
}

/** Mastery evidence for one concept: what its level is derived from. */
export interface ConceptEvidence {
  readonly conceptId: ConceptId;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly lastAnsweredAt: string | null;
}

export const accuracyOf = (row: SubjectAccuracy | undefined): number => {
  if (row === undefined || row.answered <= 0) return 0;
  return row.correct / row.answered;
};

export const attemptsOf = (evidence: ConceptEvidence | undefined): number =>
  evidence === undefined ? 0 : Math.max(0, evidence.correctCount + evidence.wrongCount);

/** 0–1 accuracy for a concept; `0` before it has been answered at all. */
export const evidenceAccuracy = (evidence: ConceptEvidence | undefined): number => {
  const attempts = attemptsOf(evidence);
  return attempts <= 0 ? 0 : Math.max(0, evidence?.correctCount ?? 0) / attempts;
};
