import type { MasteryPolicy } from './types';

/**
 * Mastery.
 *
 * A concept's mastery is derived from the evidence stored about it — how many
 * answers were right and how many were wrong — rather than trusted from a stored
 * number. The exam's own `MasteryPolicy` supplies the increments and the band
 * boundaries, so changing a policy reinterprets the same history instead of
 * invalidating it (see `architecture/SYNC-ENGINE.md`: mastery must be derived from
 * canonical answer history, never blind last-write-wins).
 *
 * Nothing here is CSE-specific: every exam that declares mastery thresholds gets
 * the same ladder, and Learn, Progress and Review all read it from this one place.
 */

/** The ladder a policy's `levelCount` indexes into, weakest first. */
export const MASTERY_LADDER = ['Learning', 'Developing', 'Strong', 'Mastered'] as const;
export type MasteryLevel = (typeof MASTERY_LADDER)[number];

/**
 * How many answers make mastery an evidence-led claim. Below this the score is
 * scaled down proportionally, so one lucky answer reads as early progress rather
 * than as mastery of a concept.
 */
export const MASTERY_EVIDENCE_FLOOR = 5;

/** The stored counters a mastery level is derived from. */
export interface MasteryEvidence {
  readonly correctCount: number;
  readonly wrongCount: number;
}

const nonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/**
 * Thresholds are decimal fractions, so the score is quantised to three of them
 * before it is compared. Without this, `2/3 * 0.6` lands one ulp under `0.4` and a
 * concept sits a whole level lower for no reason a learner could ever explain.
 */
const quantise = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * A 0–1 weighted accuracy, damped by how much evidence there is.
 *
 * `correctDelta` and `wrongDelta` let an exam weight a wrong answer more heavily
 * than a right one; the confidence ramp keeps a small sample from reading as
 * certainty.
 */
export const masteryScore = (evidence: MasteryEvidence, policy: MasteryPolicy): number => {
  const correct = nonNegative(evidence.correctCount);
  const wrong = nonNegative(evidence.wrongCount);
  const weightedCorrect = correct * nonNegative(policy.correctDelta);
  const weightedWrong = wrong * nonNegative(policy.wrongDelta);
  const weightedTotal = weightedCorrect + weightedWrong;
  if (weightedTotal <= 0) return 0;

  const accuracy = weightedCorrect / weightedTotal;
  const confidence = Math.min(1, (correct + wrong) / MASTERY_EVIDENCE_FLOOR);
  return quantise(accuracy * confidence);
};

/**
 * Position on the ladder, 0-based, clamped to the policy's own level count.
 *
 * Thresholds are read in ascending order from the policy, so an exam with fewer
 * bands describes mastery in its own terms rather than in CSE's.
 */
export const masteryLevelIndex = (score: number, policy: MasteryPolicy): number => {
  const clamped = Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
  const below = [
    clamped < policy.developingThreshold,
    clamped < policy.strongThreshold,
    clamped < policy.masteredThreshold,
  ];
  const firstUnsatisfied = below.indexOf(true);
  const index = firstUnsatisfied === -1 ? MASTERY_LADDER.length - 1 : firstUnsatisfied;
  return Math.max(0, Math.min(index, Math.max(0, policy.levelCount - 1)));
};

/** The learner-facing label for a piece of evidence. */
export const masteryLevelFor = (evidence: MasteryEvidence, policy: MasteryPolicy): MasteryLevel => {
  const index = masteryLevelIndex(masteryScore(evidence, policy), policy);
  return MASTERY_LADDER[index] ?? 'Learning';
};

/** Whether the concept has been answered at all — `Learning` can mean untouched. */
export const isMasteryStarted = (evidence: MasteryEvidence): boolean =>
  nonNegative(evidence.correctCount) + nonNegative(evidence.wrongCount) > 0;
