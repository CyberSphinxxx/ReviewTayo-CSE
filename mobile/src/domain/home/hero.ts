import { subjectsForTrack } from '@/domain/exams';
import type { ExamPhase } from '@/domain/exams/journey';
import type { ExamRuleConfig, ExamTrackId } from '@/domain/exams/types';

import type { SubjectAccuracyRow } from './types';

/**
 * Home hero copy.
 *
 * The hero makes one recommendation and says why, in the learner's own terms. It
 * names a subject only when there is enough evidence to name one, and it never
 * exposes how the recommendation was assembled — no weights, scores or algorithm
 * details reach the screen.
 */

export const DONE_HEADLINE = "You're done for today.";
export const DONE_CONTEXT = 'Come back tomorrow. Your brain files things while you rest.';
export const BALANCED_CONTEXT = 'A balanced set across your subjects today.';
export const DRILL_META_UNDER = 'Personalized from your recent practice';

/** `Accuracy Phase · 43 days left`, or the phase alone when no date is set. */
export const phasePill = (phase: ExamPhase): string =>
  phase.daysRemaining === null
    ? phase.phase.name
    : `${phase.phase.name} · ${phase.daysRemaining} ${phase.daysRemaining === 1 ? 'day' : 'days'} left`;

export const smartDrillHeadline = (questionCount: number): string =>
  `Your next ${questionCount} are ready.`;

/**
 * The subject that needs attention: the lowest accuracy among the track's subjects
 * that have been attempted enough to judge, and only when it is actually below the
 * policy's attention threshold. Otherwise the learner gets a neutral line rather
 * than a claim the data does not support.
 */
export const needsAttentionLine = (
  exam: ExamRuleConfig,
  trackId: ExamTrackId,
  accuracy: readonly SubjectAccuracyRow[],
  policy: { readonly weakestAreaMinimumAttempts: number; readonly needsAttentionAccuracy: number },
): string => {
  const needsAttention = subjectsForTrack(exam, trackId)
    .map((subject) => {
      const row = accuracy.find((entry) => entry.subjectId === subject.id);
      if (row === undefined || row.answered < policy.weakestAreaMinimumAttempts) {
        return { name: subject.name, accuracy: Number.NaN };
      }
      return { name: subject.name, accuracy: row.correct / row.answered };
    })
    .filter(
      (entry) => Number.isFinite(entry.accuracy) && entry.accuracy < policy.needsAttentionAccuracy,
    )
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakest = needsAttention[0];
  if (weakest === undefined) return BALANCED_CONTEXT;
  return `${weakest.name} needs a little love today.`;
};
