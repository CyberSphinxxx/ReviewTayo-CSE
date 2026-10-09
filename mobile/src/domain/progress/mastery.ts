import { conceptsForTrack, getSubject } from '@/domain/exams';
import {
  MASTERY_LADDER,
  isMasteryStarted,
  masteryLevelFor,
  masteryLevelIndex,
  masteryScore,
  type MasteryLevel,
} from '@/domain/exams/mastery';
import type { ExamRuleConfig, MasteryPolicy } from '@/domain/exams/types';
import { attemptsOf, evidenceAccuracy, type ConceptEvidence } from '@/domain/sessions';

/**
 * Concept mastery, one layer below the subject summary.
 *
 * This is the same derivation Learn and Review read — the exam's own mastery score over
 * the evidence a concept has — arranged as a list a learner can act on: least mastered
 * first, with the subject and the accuracy that produced the level. A concept nobody has
 * answered leads the list, because not knowing something is the largest gap there is;
 * the track's own order is the tie-break, so the list is stable between visits. Nothing
 * is stored and nothing is inferred beyond the answers themselves, so a concept's row
 * changes when the learner answers questions, not when they open the screen.
 *
 * Progress measures how much of the syllabus is *solid* rather than how much is merely
 * touched, so the bar and the line count `Strong` and above — the same rung Review
 * refuses to send a learner back to.
 */

export const MASTERY_SOLID: MasteryLevel = 'Strong';

export interface MasteryRow {
  readonly conceptId: string;
  readonly name: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly level: MasteryLevel;
  readonly started: boolean;
  /** 0–1 across the concept's own answers; `0` before it has been answered. */
  readonly accuracy: number;
  readonly attempts: number;
  readonly lastAnsweredAt: string | null;
}

export interface MasterySummary {
  readonly total: number;
  readonly started: number;
  readonly mastered: number;
  readonly strong: number;
  readonly developing: number;
  readonly learning: number;
  /** Concepts at `Strong` or better, as a 0–1 share of the syllabus. */
  readonly solidRatio: number;
  /** `3 of 22 mastered · 9 started` */
  readonly line: string;
}

export interface ConceptMasteryInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly evidence: readonly ConceptEvidence[];
  readonly policy: MasteryPolicy;
  /** Restricts the list to one subject, for the drill-down behind a subject row. */
  readonly subjectId?: string;
}

export const conceptMasteryRows = ({
  exam,
  trackId,
  evidence,
  policy,
  subjectId,
}: ConceptMasteryInput): readonly MasteryRow[] => {
  const byConcept = new Map(evidence.map((entry) => [entry.conceptId, entry]));
  // The track's list is the syllabus Progress measures; a subject filter narrows it
  // without changing the order, so the same concept keeps the same neighbours.
  const concepts = conceptsForTrack(exam, trackId).filter(
    (concept) => subjectId === undefined || concept.subjectId === subjectId,
  );

  return concepts
    .map((concept, index) => {
      const own = byConcept.get(concept.id);
      return {
        conceptId: concept.id,
        name: concept.name,
        subjectId: concept.subjectId,
        subjectName: getSubject(exam, concept.subjectId)?.name ?? 'This exam',
        level: own === undefined ? ('Learning' as MasteryLevel) : masteryLevelFor(own, policy),
        started: own !== undefined && isMasteryStarted(own),
        accuracy: evidenceAccuracy(own),
        attempts: attemptsOf(own),
        lastAnsweredAt: own?.lastAnsweredAt ?? null,
        levelIndex: own === undefined ? 0 : masteryLevelIndex(masteryScore(own, policy), policy),
        index,
      };
    })
    .sort(
      (a, b) =>
        a.levelIndex - b.levelIndex ||
        a.accuracy - b.accuracy ||
        a.attempts - b.attempts ||
        a.index - b.index,
    )
    .map(({ levelIndex: _levelIndex, index: _index, ...row }) => row);
};

export const summarizeMastery = (rows: readonly MasteryRow[]): MasterySummary => {
  const count = (level: MasteryLevel): number => rows.filter((row) => row.level === level).length;
  const total = rows.length;
  const started = rows.filter((row) => row.started).length;
  const mastered = count('Mastered');
  const strong = count('Strong');
  const solid = MASTERY_LADDER.indexOf(MASTERY_SOLID);

  return {
    total,
    started,
    mastered,
    strong,
    developing: count('Developing'),
    learning: count('Learning'),
    solidRatio:
      total === 0
        ? 0
        : rows.filter((row) => MASTERY_LADDER.indexOf(row.level) >= solid).length / total,
    line: describeMasteryLine({ total, started, mastered }),
  };
};

/** `3 of 22 mastered · 9 started`, or that nothing has been started yet. */
export const describeMasteryLine = ({
  total,
  started,
  mastered,
}: Pick<MasterySummary, 'total' | 'started' | 'mastered'>): string => {
  if (total === 0) return 'No concepts in this exam yet';
  if (started === 0) return `${total} ${total === 1 ? 'concept' : 'concepts'} · not started yet`;
  return `${mastered} of ${total} mastered · ${started} started`;
};

/** `64% accuracy · 12 answered`, the evidence line under a concept's level. */
export const describeMasteryEvidence = (row: MasteryRow): string =>
  row.attempts <= 0
    ? 'Not answered yet'
    : `${Math.round(row.accuracy * 100)}% accuracy · ${row.attempts} answered`;
