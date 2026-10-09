/**
 * Conflict policies.
 *
 * Sync is not one rule applied to everything: an answer history is a set of facts
 * that can only grow, saved questions are a set whose membership is the truth, a
 * setting is whatever the learner last asked for, and mastery is not sent at all
 * because it is derived from the answers that are. Writing these down — and
 * testing the merge itself — is what keeps two devices from arguing.
 */

export const CONFLICT_POLICIES = [
  'append-only',
  'latest-intent-wins',
  'set-merge',
  'derive-from-answers',
  'unsupported',
] as const;
export type ConflictPolicy = (typeof CONFLICT_POLICIES)[number];

const POLICIES_BY_ENTITY: Readonly<Record<string, ConflictPolicy>> = {
  answer: 'append-only',
  settings: 'latest-intent-wins',
  'saved-question': 'set-merge',
  mastery: 'derive-from-answers',
};

/**
 * The policy for an entity type this build knows, or `unsupported` — an unknown
 * entity is never merged by a guess.
 */
export const policyFor = (entityType: string): ConflictPolicy =>
  POLICIES_BY_ENTITY[entityType] ?? 'unsupported';

export const POLICY_DESCRIPTIONS: Readonly<Record<ConflictPolicy, string>> = {
  'append-only': 'Answers are facts: they are added, never overwritten, and deduplicated by id.',
  'latest-intent-wins': 'Settings take the most recent change, whichever device made it.',
  'set-merge': 'Saved questions are a set; saving and unsaving are both remembered.',
  'derive-from-answers': 'Mastery is recomputed from answers rather than copied between devices.',
  unsupported: 'This build does not know how to merge this kind of change.',
};

export const describePolicy = (policy: ConflictPolicy): string => POLICY_DESCRIPTIONS[policy];

/** A value with the moment the learner last meant it. */
export interface DirectedValue<T> {
  readonly value: T;
  readonly updatedAt: string;
}

/**
 * The newer of two settings values, or whichever exists. Ties go to the local
 * value: the learner is looking at this device.
 */
export const resolveLatestIntent = <T>(
  local: DirectedValue<T> | null,
  remote: DirectedValue<T> | null,
): T | null => {
  if (local === null) return remote?.value ?? null;
  if (remote === null) return local.value;
  return remote.updatedAt > local.updatedAt ? remote.value : local.value;
};

export interface SavedQuestionChange {
  readonly questionId: string;
  readonly saved: boolean;
  readonly changedAt: string;
}

/**
 * Set merge: for each question, the newest intent wins; ties go to the local
 * device. The result is sorted by question id so two devices converge on exactly
 * the same list.
 */
export const mergeSavedQuestions = (
  local: readonly SavedQuestionChange[],
  remote: readonly SavedQuestionChange[],
): SavedQuestionChange[] => {
  const merged = new Map<string, SavedQuestionChange>();
  for (const change of [...remote, ...local]) {
    const existing = merged.get(change.questionId);
    if (existing === undefined || change.changedAt >= existing.changedAt) {
      merged.set(change.questionId, change);
    }
  }
  return [...merged.values()].sort((a, b) => a.questionId.localeCompare(b.questionId));
};

export interface AnswerLike {
  readonly id: string;
  readonly answeredAt: string;
}

/**
 * Append-only: both sides are kept, duplicates by id collapse to one, and the
 * result is ordered by when the answer happened.
 */
export const mergeAnswers = <T extends AnswerLike>(
  local: readonly T[],
  remote: readonly T[],
): T[] => {
  const byId = new Map<string, T>();
  for (const answer of [...local, ...remote]) {
    if (!byId.has(answer.id)) byId.set(answer.id, answer);
  }
  return [...byId.values()].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
};
