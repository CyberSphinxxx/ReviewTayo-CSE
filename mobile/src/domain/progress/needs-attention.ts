import { getSubject } from '@/domain/exams';
import type { ExamRuleConfig, StudyPolicy } from '@/domain/exams/types';
import { weakestSubject } from '@/domain/practice';
import { accuracyOf, describeAccuracyPercent, type SubjectAccuracy } from '@/domain/sessions';

/**
 * Needs attention.
 *
 * Progress must end with something to do, so the weakest-area judgement Practice
 * already makes is named here as well — from the same function, over the same
 * accuracy, with the same minimum-attempts rule, so the subject Progress points at
 * is always the subject Practice would have offered.
 *
 * A learner without enough answers gets `null`, not a guess: telling someone with
 * three answers where their weakness lies would be an invention, and the screen
 * simply leaves the section out.
 */

export interface NeedsAttention {
  readonly subjectId: string;
  readonly subjectName: string;
  /** 0–1, exact; the screen and the line both use it. */
  readonly accuracy: number;
  readonly answered: number;
  readonly correct: number;
  /** `64% accuracy` */
  readonly line: string;
  /** `16 of 25 answers right` — the evidence behind the line. */
  readonly hint: string;
  /** How many questions the drill this section starts should ask. */
  readonly count: number;
}

export interface NeedsAttentionInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly accuracy: readonly SubjectAccuracy[];
  readonly policy: StudyPolicy;
}

export const needsAttention = ({
  exam,
  trackId,
  accuracy,
  policy,
}: NeedsAttentionInput): NeedsAttention | null => {
  const weakest = weakestSubject(exam, trackId, accuracy, policy);
  if (weakest === null) return null;

  const subject = getSubject(exam, weakest.subjectId);
  if (subject === null) return null;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    accuracy: accuracyOf(weakest),
    answered: weakest.answered,
    correct: weakest.correct,
    line: `${describeAccuracyPercent(accuracyOf(weakest))} accuracy`,
    hint: `${weakest.correct} of ${weakest.answered} answers right`,
    count: Math.max(1, policy.drillSize),
  };
};

/** The action label beside the subject; the prototype's single word. */
export const NEEDS_ATTENTION_ACTION = 'Practice';
