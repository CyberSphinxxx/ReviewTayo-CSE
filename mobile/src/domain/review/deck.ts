import { getConcept, getSubject } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';

import type { ScheduledReviewItem } from './schedule';

/**
 * The review deck.
 *
 * Review Due is a deck of cards, not another quiz: a due item is a concept the learner
 * has already missed once, so the question worth asking is "do you still know it?" —
 * which is a thing you answer about yourself, not a thing four options can answer. The
 * front of a card is the concept's name and the back is its own summary, so the material
 * being reviewed is the same material Learn teaches rather than a second corpus.
 *
 * A due item belongs to an exam, not to a track: the queue is what the learner got
 * wrong, and switching tracks does not make yesterday's mistakes irrelevant. That is
 * also what keeps the tab's badge and the deck counting the same rows.
 */

export interface ReviewCard {
  readonly itemId: string;
  readonly conceptId: string;
  readonly conceptName: string;
  readonly subjectId: string;
  readonly subjectName: string;
  /** What the learner is asked; the concept's own name. */
  readonly prompt: string;
  /** What is revealed; `''` when the concept has no summary written yet. */
  readonly answer: string;
  readonly dueAt: string;
  readonly intervalDays: number;
  readonly lapses: number;
  readonly reviews: number;
}

export interface ReviewDeck {
  readonly cards: readonly ReviewCard[];
  readonly count: number;
}

/**
 * How long a deck takes is `reviewDueSpec`'s answer, not this module's: Home already
 * quotes a duration for the same items, and two estimates of the same work is one too
 * many.
 */
export const buildReviewDeck = ({
  exam,
  items,
}: {
  readonly exam: ExamRuleConfig;
  readonly items: readonly ScheduledReviewItem[];
}): ReviewDeck => {
  const cards: ReviewCard[] = [];

  for (const item of items) {
    const concept = getConcept(exam, item.conceptId);
    if (concept === null) continue;
    const subject = getSubject(exam, concept.subjectId);
    cards.push({
      itemId: item.id,
      conceptId: concept.id,
      conceptName: concept.name,
      subjectId: concept.subjectId,
      subjectName: subject?.name ?? 'This exam',
      prompt: concept.name,
      answer: concept.summary ?? '',
      dueAt: item.dueAt,
      intervalDays: item.intervalDays,
      lapses: item.lapses,
      reviews: item.reviews,
    });
  }

  return { cards, count: cards.length };
};

export const describeReviewCount = (count: number): string =>
  `${count} ${count === 1 ? 'item' : 'items'}`;

/** `Missed twice`, `Missed once`, or nothing at all for a card never missed. */
export const describeLapses = (lapses: number): string => {
  if (lapses <= 0) return '';
  return lapses === 1 ? 'Missed once' : `Missed ${lapses} times`;
};

export interface DeckTally {
  /** Cards the learner said "Again" to; the schedule brings them back sooner. */
  readonly again: number;
  /** Due items the deck could not cover, because the exam caps one day of review. */
  readonly leftover: number;
}

export interface DeckCompletion {
  readonly title: string;
  readonly description: string;
}

/**
 * The end of a deck.
 *
 * Both numbers are said out loud, because both are true and neither is a failure: the
 * cards said "Again" to are already scheduled to come back, and the items the exam's
 * daily cap kept out of the deck are still waiting. Only a deck with neither —
 * everything known, nothing left — is allowed to call itself cleared.
 */
export const describeDeckCompletion = ({ again, leftover }: DeckTally): DeckCompletion => {
  const missed = Math.max(0, Math.floor(again));
  const waiting = Math.max(0, Math.floor(leftover));

  if (missed === 0 && waiting === 0) {
    return {
      title: 'Review cleared.',
      description: 'Next items are due tomorrow.',
    };
  }

  const parts: string[] = [];
  if (missed > 0) parts.push(`${describeReviewCount(missed)} will come back sooner.`);
  if (waiting > 0) {
    parts.push(
      `${describeReviewCount(waiting)} ${waiting === 1 ? 'is' : 'are'} waiting for tomorrow.`,
    );
  }

  return { title: 'Nice work.', description: parts.join(' ') };
};
