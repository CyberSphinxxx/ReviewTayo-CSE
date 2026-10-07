import { conceptsForSubject, conceptsForTrack, getConcept, getSubject } from '@/domain/exams';
import {
  isMasteryStarted,
  masteryLevelFor,
  masteryLevelIndex,
  masteryScore,
} from '@/domain/exams/mastery';
import type { ConceptId, ExamRuleConfig, MasteryPolicy } from '@/domain/exams/types';

import type { ConceptEvidence, ContinueLearning, LearnConcept } from './types';

/**
 * Continue Learning.
 *
 * Learn's primary action is the one concept worth reading next. It is the concept
 * the learner has started but not yet mastered, most recently answered first — so
 * closing the app mid-topic and coming back lands on the same topic. A learner with
 * no history at all is pointed at the first lesson of their track instead of being
 * shown an empty screen, and the two cases are labelled differently so the app
 * never claims a history that does not exist.
 */

export const CONTINUE_EYEBROW = 'Continue learning';
export const START_EYEBROW = 'Start here';

/** Places a concept inside its subject's lesson list. */
export const learnConcept = (exam: ExamRuleConfig, conceptId: ConceptId): LearnConcept | null => {
  const concept = getConcept(exam, conceptId);
  if (concept === null) return null;
  const subject = getSubject(exam, concept.subjectId);
  if (subject === null) return null;

  const lessons = conceptsForSubject(exam, subject.id);
  const position = lessons.findIndex((lesson) => lesson.id === concept.id);

  return {
    conceptId: concept.id,
    subjectId: concept.subjectId,
    name: concept.name,
    subjectName: subject.name,
    summary: concept.summary ?? null,
    tags: concept.tags,
    lessonNumber: position === -1 ? 1 : position + 1,
    lessonCount: lessons.length,
  };
};

/** `Lesson 3 of 8`. */
export const describeLesson = (concept: LearnConcept): string =>
  `Lesson ${concept.lessonNumber} of ${concept.lessonCount}`;

/** Mastery evidence keyed by concept, for the lookups below. */
export const evidenceByConcept = (
  evidence: readonly ConceptEvidence[],
): ReadonlyMap<ConceptId, ConceptEvidence> =>
  new Map(evidence.map((entry) => [entry.conceptId, entry]));

export const continueLearning = (
  exam: ExamRuleConfig,
  trackId: string,
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
): ContinueLearning | null => {
  const byConcept = evidenceByConcept(evidence);
  const topLevel = Math.max(0, policy.levelCount - 1);
  const isUnmastered = (entry: ConceptEvidence | undefined): boolean =>
    entry === undefined ||
    !isMasteryStarted(entry) ||
    masteryLevelIndex(masteryScore(entry, policy), policy) < topLevel;
  const ordered = conceptsForTrack(exam, trackId);

  const partway = ordered
    .map((concept) => ({ conceptId: concept.id, evidence: byConcept.get(concept.id) }))
    .filter(
      (entry): entry is { conceptId: ConceptId; evidence: ConceptEvidence } =>
        entry.evidence !== undefined &&
        isMasteryStarted(entry.evidence) &&
        masteryLevelIndex(masteryScore(entry.evidence, policy), policy) < topLevel,
    )
    // Most recent first; a concept with no timestamp sorts last rather than first.
    .sort((a, b) =>
      (b.evidence.lastAnsweredAt ?? '').localeCompare(a.evidence.lastAnsweredAt ?? ''),
    );

  const resumed = partway[0];
  // Nothing partway through — either a new learner or a finished one. Point at the
  // first lesson still to be mastered, and label it `start` rather than claiming a
  // history that does not exist. Nothing to point at means nothing to show.
  const fresh = ordered.find((concept) => isUnmastered(byConcept.get(concept.id)));
  const candidateId = resumed?.conceptId ?? fresh?.id;
  if (candidateId === undefined) return null;

  const concept = learnConcept(exam, candidateId);
  if (concept === null) return null;

  const own = byConcept.get(concept.conceptId);
  return {
    kind: resumed === undefined ? 'start' : 'resume',
    eyebrow: resumed === undefined ? START_EYEBROW : CONTINUE_EYEBROW,
    concept,
    mastery: own === undefined ? 'Learning' : masteryLevelFor(own, policy),
    lessonLine: describeLesson(concept),
  };
};
