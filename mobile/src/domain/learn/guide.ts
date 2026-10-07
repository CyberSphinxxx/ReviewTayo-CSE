import { conceptsForSubject, getConcept, subjectsForTrack } from '@/domain/exams';
import { isMasteryStarted, masteryLevelFor, type MasteryLevel } from '@/domain/exams/mastery';
import type { ConceptId, ExamRuleConfig, MasteryPolicy } from '@/domain/exams/types';

import { evidenceByConcept, learnConcept } from './continue-learning';
import type { ConceptEvidence, LearnConcept } from './types';

/**
 * Study Guides.
 *
 * The drill-down behind Learn: a subject's lessons in order, and one concept's own
 * reference page. Both are generated from the exam's content, so every exam the
 * engine accepts has reference material without anyone writing it twice.
 */

/** One concept row inside a guide. */
export interface GuideConceptRow {
  readonly concept: LearnConcept;
  readonly mastery: MasteryLevel;
  /** False when the concept has never been answered. */
  readonly started: boolean;
}

/** One subject's lesson list. */
export interface GuideSection {
  readonly subjectId: string;
  readonly name: string;
  readonly concepts: readonly GuideConceptRow[];
}

/** A single concept's reference page. */
export interface ConceptReference {
  readonly concept: LearnConcept;
  readonly mastery: MasteryLevel;
  readonly started: boolean;
  readonly evidence: ConceptEvidence | null;
}

const masteryRow = (
  concept: LearnConcept,
  own: ConceptEvidence | undefined,
  policy: MasteryPolicy,
): GuideConceptRow => ({
  concept,
  mastery: own === undefined ? 'Learning' : masteryLevelFor(own, policy),
  started: own !== undefined && isMasteryStarted(own),
});

/** The whole guide, or one subject's section when `subjectId` is given. */
export const guideSections = (
  exam: ExamRuleConfig,
  trackId: string,
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
  subjectId?: string,
): readonly GuideSection[] => {
  const byConcept = evidenceByConcept(evidence);

  return subjectsForTrack(exam, trackId)
    .filter((subject) => subjectId === undefined || subject.id === subjectId)
    .map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      concepts: conceptsForSubject(exam, subject.id)
        .map((concept) => learnConcept(exam, concept.id))
        .filter((concept): concept is LearnConcept => concept !== null)
        .map((concept) => masteryRow(concept, byConcept.get(concept.conceptId), policy)),
    }))
    .filter((section) => section.concepts.length > 0);
};

/** One concept's reference page, or null when the id is not in this exam. */
export const conceptReference = (
  exam: ExamRuleConfig,
  conceptId: ConceptId,
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
): ConceptReference | null => {
  if (getConcept(exam, conceptId) === null) return null;
  const concept = learnConcept(exam, conceptId);
  if (concept === null) return null;
  const own = evidenceByConcept(evidence).get(conceptId);
  return {
    ...masteryRow(concept, own, policy),
    evidence: own ?? null,
  };
};
