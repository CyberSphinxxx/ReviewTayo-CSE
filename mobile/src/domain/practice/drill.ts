import { conceptsForTrack, subjectsForTrack } from '@/domain/exams';
import { masteryLevelFor } from '@/domain/exams/mastery';
import type { ConceptId, ExamRuleConfig, MasteryPolicy, StudyPolicy } from '@/domain/exams/types';
import {
  attemptsOf,
  evidenceAccuracy,
  type ConceptEvidence,
  type SubjectAccuracy,
} from '@/domain/sessions';

import type { ConceptWeight, DrillReason } from './types';

/**
 * Smart Drill selection.
 *
 * The drill's job is to pick what is worth practising now. It ranks concepts with the
 * exam's own weights — `SmartDrillWeights` — so an exam can decide for itself how much
 * it cares about weakness versus due review versus material never seen. Nothing here
 * exposes a score to the learner: the screen shows a drill, and the ranking stays a
 * ranking.
 *
 * A concept is judged on five things:
 *
 * - weakness: how much of what it has been asked, it got wrong
 * - due review: something about it is waiting in the review queue
 * - unseen: it has never been answered
 * - low coverage: it has been answered too few times to trust the accuracy
 * - recent lesson: the learner has just been reading it, so it is fresh
 */

/** Attempts before accuracy is trusted enough not to need remedial attention. */
export const LOW_COVERAGE_ATTEMPTS = 3;

export interface DrillInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly policy: StudyPolicy;
  readonly accuracy: readonly SubjectAccuracy[];
  readonly evidence: readonly ConceptEvidence[];
  /** Concepts with something waiting in the review queue. */
  readonly dueConceptIds?: readonly ConceptId[];
  /** Concepts the learner read or answered most recently. */
  readonly recentConceptIds?: readonly ConceptId[];
}

const weaknessOf = (evidence: ConceptEvidence | undefined): number =>
  attemptsOf(evidence) <= 0 ? 0 : 1 - evidenceAccuracy(evidence);

/**
 * Ranks every concept in the track, highest score first. Ties keep the track's own
 * order, so a drill is reproducible and a learner sees their subjects in the same
 * sequence every time.
 */
export const weightConcepts = ({
  exam,
  trackId,
  policy,
  evidence,
  dueConceptIds = [],
  recentConceptIds = [],
}: DrillInput): readonly ConceptWeight[] => {
  const byConcept = new Map(evidence.map((entry) => [entry.conceptId, entry]));
  const due = new Set(dueConceptIds);
  const recent = new Set(recentConceptIds);
  const weights = policy.smartDrillWeights;

  return conceptsForTrack(exam, trackId)
    .map((concept, index) => {
      const own = byConcept.get(concept.id);
      const attempts = attemptsOf(own);
      const reasons: DrillReason[] = [];
      let score = 0;

      const weakness = weaknessOf(own);
      if (weakness > 0) {
        score += weakness * weights.weakness;
        reasons.push('weakness');
      }
      if (due.has(concept.id)) {
        score += weights.dueReview;
        reasons.push('due-review');
      }
      if (attempts === 0) {
        score += weights.unseen;
        reasons.push('unseen');
      } else if (attempts < LOW_COVERAGE_ATTEMPTS) {
        score += (1 - attempts / LOW_COVERAGE_ATTEMPTS) * weights.lowCoverage;
        reasons.push('low-coverage');
      }
      if (recent.has(concept.id)) {
        score += weights.recentLesson;
        reasons.push('recent-lesson');
      }

      return {
        conceptId: concept.id,
        subjectId: concept.subjectId,
        score,
        attempts,
        reasons,
        index,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ index: _index, ...weight }) => weight);
};

/**
 * The concepts worth drilling, best first. An empty result means nothing stood out —
 * the caller should then drill the track as a whole rather than nothing at all.
 */
export const drillConceptIds = (input: DrillInput, limit: number): readonly ConceptId[] => {
  const capped = Math.max(0, Math.floor(limit));
  return weightConcepts(input)
    .filter((weight) => weight.score > 0)
    .slice(0, capped)
    .map((weight) => weight.conceptId);
};

/**
 * The subject that needs attention: the lowest accuracy among the track's subjects
 * that have been answered enough to judge. `null` when there is nothing to go on,
 * which is what keeps Practice from inventing a weakest area for a new learner.
 */
export const weakestSubject = (
  exam: ExamRuleConfig,
  trackId: string,
  accuracy: readonly SubjectAccuracy[],
  policy: Pick<StudyPolicy, 'weakestAreaMinimumAttempts'>,
): SubjectAccuracy | null => {
  const minimum = Math.max(1, policy.weakestAreaMinimumAttempts);
  const inTrack = new Set(subjectsForTrack(exam, trackId).map((subject) => subject.id));
  const judgeable = accuracy
    .filter((row) => row.answered >= minimum && inTrack.has(row.subjectId))
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered);

  return judgeable[0] ?? null;
};

/**
 * Concepts that are not yet mastered — what Mastery Rounds drills.
 *
 * A concept nobody has answered counts: not knowing it is exactly the reason to
 * practise it.
 */
export const unmasteredConceptIds = (
  exam: ExamRuleConfig,
  trackId: string,
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
): readonly ConceptId[] => {
  const byConcept = new Map(evidence.map((entry) => [entry.conceptId, entry]));
  return conceptsForTrack(exam, trackId)
    .filter((concept) => {
      const own = byConcept.get(concept.id);
      return own === undefined || masteryLevelFor(own, policy) !== 'Mastered';
    })
    .map((concept) => concept.id);
};
