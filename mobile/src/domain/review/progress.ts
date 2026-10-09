import { conceptsForTrack, getConcept, getSubject } from '@/domain/exams';
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

import { localDaysBetween, type ScheduledReviewItem } from './schedule';

/**
 * What Review says about the learner rather than about their queue.
 *
 * Two of Review's sections are deliberately not the queue: "concepts to revisit" is
 * read from mastery evidence, and "review history" is read from the schedule itself.
 * Keeping them separate is the point — "what I got wrong" and "what I am weak at" are
 * different questions, and a screen that answers both with one list is answering
 * neither.
 */

export interface RevisitConcept {
  readonly conceptId: string;
  readonly conceptName: string;
  readonly subjectName: string;
  readonly level: MasteryLevel;
  /** 0–1, exact; the screen formats it. */
  readonly accuracy: number;
  readonly attempts: number;
}

/**
 * The level below which a concept is worth revisiting.
 *
 * `Strong` is where the exam's own thresholds say the learner is getting it right
 * most of the time; anything under that is worth another look, and anything at or
 * above it is not something to send someone back to.
 */
export const REVISIT_BELOW: MasteryLevel = 'Strong';

export interface RevisitInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly evidence: readonly ConceptEvidence[];
  readonly policy: MasteryPolicy;
  readonly limit?: number;
}

/**
 * The track's concepts that are started and still below `Strong`, weakest first.
 *
 * A concept nobody has answered is not here: "revisit" means something was seen and
 * did not stick, and untouched material belongs to Learn. Ordering is by the derived
 * mastery score, then by the track's own order, so the list is stable between visits.
 */
export const revisitConcepts = ({
  exam,
  trackId,
  evidence,
  policy,
  limit = 10,
}: RevisitInput): readonly RevisitConcept[] => {
  const byConcept = new Map(evidence.map((entry) => [entry.conceptId, entry]));
  const ceiling = Math.max(0, MASTERY_LADDER.indexOf(REVISIT_BELOW));

  return conceptsForTrack(exam, trackId)
    .map((concept, index) => ({ concept, index }))
    .flatMap(({ concept, index }) => {
      const own = byConcept.get(concept.id);
      if (own === undefined || !isMasteryStarted(own)) return [];
      if (masteryLevelIndex(masteryScore(own, policy), policy) >= ceiling) return [];
      const subject = getSubject(exam, concept.subjectId);
      return [
        {
          concept: {
            conceptId: concept.id,
            conceptName: concept.name,
            subjectName: subject?.name ?? 'This exam',
            level: masteryLevelFor(own, policy),
            accuracy: evidenceAccuracy(own),
            attempts: attemptsOf(own),
          } satisfies RevisitConcept,
          score: masteryScore(own, policy),
          index,
        },
      ];
    })
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map((entry) => entry.concept);
};

/** `64%` — accuracy as the screen shows it. */
export const describeAccuracyPercent = (accuracy: number): string =>
  `${Math.round(Math.max(0, Math.min(1, accuracy)) * 100)}%`;

export interface ReviewHistoryEntry {
  readonly itemId: string;
  readonly conceptId: string;
  readonly conceptName: string;
  readonly subjectName: string;
  readonly reviewedAt: string;
  readonly intervalDays: number;
  readonly reviews: number;
  readonly lapses: number;
}

export interface ReviewHistory {
  /** Distinct concepts reviewed inside the window — the "this week" number. */
  readonly reviewedThisWeek: number;
  readonly entries: readonly ReviewHistoryEntry[];
}

/**
 * How far back "this week" reaches.
 *
 * The count is of concepts, not of reviews: a concept reviewed three times in a week is
 * one concept learned, and a number that grew every time the learner pressed a button
 * would reward repetition rather than progress. It is read from each item's own
 * `lastReviewedAt`, so nothing new has to be stored to answer it.
 */
export const HISTORY_WINDOW_DAYS = 7;

export interface HistoryInput {
  readonly exam: ExamRuleConfig;
  readonly items: readonly ScheduledReviewItem[];
  readonly now: Date;
  readonly limit?: number;
}

export const buildReviewHistory = ({
  exam,
  items,
  now,
  limit = 20,
}: HistoryInput): ReviewHistory => {
  const cutoff = now.getTime() - HISTORY_WINDOW_DAYS * 86_400_000;

  const reviewed = items
    .filter((item) => item.lastReviewedAt !== null)
    .map((item) => ({ item, reviewedAt: item.lastReviewedAt ?? '' }))
    .filter((entry) => new Date(entry.reviewedAt).getTime() >= cutoff)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

  const entries: ReviewHistoryEntry[] = [];
  for (const { item, reviewedAt } of reviewed) {
    const concept = getConcept(exam, item.conceptId);
    if (concept === null) continue;
    const subject = getSubject(exam, concept.subjectId);
    entries.push({
      itemId: item.id,
      conceptId: concept.id,
      conceptName: concept.name,
      subjectName: subject?.name ?? 'This exam',
      reviewedAt,
      intervalDays: item.intervalDays,
      reviews: item.reviews,
      lapses: item.lapses,
    });
  }

  return {
    reviewedThisWeek: entries.length,
    entries: entries.slice(0, Math.max(0, Math.floor(limit))),
  };
};

/** `today` / `yesterday` / `4 days ago` — when a card was last seen. */
export const describeReviewedWhen = (reviewedAtIso: string, now: Date): string => {
  const days = localDaysBetween(reviewedAtIso, now.toISOString());
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

/** `12 concepts this week` / `1 concept this week` / `Nothing reviewed yet`. */
export const describeHistoryLine = (reviewedThisWeek: number): string => {
  const count = Math.max(0, Math.floor(reviewedThisWeek));
  if (count === 0) return 'Nothing reviewed yet';
  return `${count} ${count === 1 ? 'concept' : 'concepts'} this week`;
};
