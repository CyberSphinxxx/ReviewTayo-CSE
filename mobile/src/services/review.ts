import type { Repositories, ReviewItemRecord } from '@/data/repositories';
import { getConcept, getSubject } from '@/domain/exams';
import { masteryLevelIndex, masteryScore } from '@/domain/exams/mastery';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  buildReviewDeck,
  buildReviewHistory,
  describeDueAt,
  describeInterval,
  describeLapses,
  describeReviewedWhen,
  nextReviewSchedule,
  revisitConcepts,
  type RevisitConcept,
  type ReviewDeck,
  type ReviewHistory,
  type ReviewOutcome,
} from '@/domain/review';
import { describeAccuracyPercent, reviewDueSpec } from '@/domain/sessions';

/**
 * Review.
 *
 * The one place the due queue is read and a card is graded. Reading is deliberately
 * split by screen: the tab needs counts and a duration, the deck needs cards, and the
 * four lists need rows — and all of them are derived here from the same rows, so the
 * badge, Home's Review Due line and the deck's own count cannot drift apart.
 *
 * Grading a card changes the schedule and nothing else. Mastery stays derived from
 * answers (D-029): a learner who recognises a concept's definition has proved they can
 * read it, not that they can answer a question about it, and crediting mastery for a
 * flashcard would quietly inflate the one number Progress trusts.
 */

export interface ReviewQueue {
  readonly deck: ReviewDeck;
  /** Every item due, before the exam's own daily limit is applied. */
  readonly dueCount: number;
  /** The exam's cap on how much review one day holds. */
  readonly limit: number;
}

export interface LoadReviewInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly now?: Date;
}

export const loadReviewQueue = async ({
  repositories,
  exam,
  now = new Date(),
}: LoadReviewInput): Promise<ReviewQueue> => {
  const limit = Math.max(1, exam.studyPolicy.review.dailyDueLimit);
  const nowIso = now.toISOString();
  const [dueCount, items] = await Promise.all([
    repositories.review.countDue(exam.id, nowIso),
    repositories.review.listDue(exam.id, nowIso, limit),
  ]);

  return { deck: buildReviewDeck({ exam, items }), dueCount, limit };
};

/** How many weak concepts the Review tab names before it stops listing them. */
export const REVISIT_LIMIT = 6;

export interface ReviewOverview extends ReviewQueue {
  readonly mistakeCount: number;
  readonly savedCount: number;
  readonly revisit: readonly RevisitConcept[];
  readonly history: ReviewHistory;
  /** The duration line Home quotes for the same items. */
  readonly meta: string;
}

export const loadReviewOverview = async ({
  repositories,
  exam,
  trackId,
  now = new Date(),
}: LoadReviewInput & { readonly trackId: string }): Promise<ReviewOverview> => {
  const [queue, items, savedCount, mastery] = await Promise.all([
    loadReviewQueue({ repositories, exam, now }),
    repositories.review.listAll(exam.id),
    repositories.savedQuestions.count(exam.id),
    repositories.mastery.listByExam(exam.id),
  ]);

  return {
    ...queue,
    mistakeCount: items.filter((item) => item.source === 'mistake').length,
    savedCount,
    revisit: revisitConcepts({
      exam,
      trackId,
      evidence: mastery,
      policy: exam.studyPolicy.mastery,
      limit: REVISIT_LIMIT,
    }),
    history: buildReviewHistory({ exam, items, now }),
    meta: reviewDueSpec(queue.dueCount, exam.studyPolicy).meta,
  };
};

export interface GradedReview {
  readonly item: ReviewItemRecord;
  /** The mastery rung the new interval came from. */
  readonly levelIndex: number;
}

/**
 * Records an Again or a Got it against one card and returns its new schedule.
 *
 * `null` when the item is no longer on the device — a deck left open across a sync or a
 * cleared database is not an error worth failing a whole session over, but the caller
 * is told so it can stop showing a card that no longer exists.
 */
export const gradeReviewItem = async ({
  repositories,
  exam,
  itemId,
  outcome,
  now = new Date(),
}: LoadReviewInput & {
  readonly itemId: string;
  readonly outcome: ReviewOutcome;
}): Promise<GradedReview | null> => {
  const existing = await repositories.review.getById(itemId);
  if (existing === null) return null;

  const nowIso = now.toISOString();
  const evidence = await repositories.mastery.get(existing.conceptId);
  const levelIndex =
    evidence === null
      ? 0
      : masteryLevelIndex(
          masteryScore(evidence, exam.studyPolicy.mastery),
          exam.studyPolicy.mastery,
        );

  const schedule = nextReviewSchedule({
    policy: exam.studyPolicy.review,
    outcome,
    levelIndex,
    reviews: existing.reviews,
    lapses: existing.lapses,
    now,
  });

  const item: ReviewItemRecord = {
    ...existing,
    dueAt: schedule.dueAt,
    intervalDays: schedule.intervalDays,
    easeLevel: schedule.easeLevel,
    lapses: schedule.lapses,
    reviews: schedule.reviews,
    lastReviewedAt: outcome === 'got-it' ? nowIso : existing.lastReviewedAt,
    updatedAt: nowIso,
  };

  await repositories.review.upsert(item);
  return { item, levelIndex };
};

/** The four lists behind Review's rows. */
export const REVIEW_LIST_KINDS = ['mistakes', 'saved', 'revisit', 'history'] as const;
export type ReviewListKind = (typeof REVIEW_LIST_KINDS)[number];

export const isReviewListKind = (value: string): value is ReviewListKind =>
  (REVIEW_LIST_KINDS as readonly string[]).includes(value);

export interface ReviewListItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly meta: string;
  /** A longer line shown under the row, or `null`. */
  readonly detail: string | null;
  readonly conceptId: string | null;
}

export interface ReviewList {
  readonly kind: ReviewListKind;
  readonly title: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly items: readonly ReviewListItem[];
}

const LIST_COPY: Readonly<
  Record<ReviewListKind, { readonly title: string; readonly empty: [string, string] }>
> = {
  mistakes: {
    title: 'Mistakes',
    empty: ['No mistakes queued', 'Every concept you have missed has been reviewed.'],
  },
  saved: {
    title: 'Saved questions',
    empty: ['Nothing saved yet', 'Tap the bookmark on any question to keep it here.'],
  },
  revisit: {
    title: 'Concepts to revisit',
    empty: ['Nothing to revisit', 'Your started concepts are all holding up.'],
  },
  history: {
    title: 'Review history',
    empty: ['Nothing reviewed yet', 'Concepts you review this week show up here.'],
  },
};

export const loadReviewList = async ({
  repositories,
  exam,
  trackId,
  kind,
  now = new Date(),
}: LoadReviewInput & {
  readonly trackId: string;
  readonly kind: ReviewListKind;
}): Promise<ReviewList> => {
  const copy = LIST_COPY[kind];
  const items = await loadListItems({ repositories, exam, trackId, kind, now });
  return {
    kind,
    title: copy.title,
    emptyTitle: copy.empty[0],
    emptyDescription: copy.empty[1],
    items,
  };
};

const loadListItems = async ({
  repositories,
  exam,
  trackId,
  kind,
  now = new Date(),
}: LoadReviewInput & {
  readonly trackId: string;
  readonly kind: ReviewListKind;
}): Promise<readonly ReviewListItem[]> => {
  if (kind === 'mistakes') {
    const items = await repositories.review.listAll(exam.id);
    return items
      .filter((item) => item.source === 'mistake')
      .map((item) => {
        const concept = getConcept(exam, item.conceptId);
        const subject = concept === null ? null : getSubject(exam, concept.subjectId);
        return {
          id: item.id,
          title: concept?.name ?? 'A concept from this exam',
          subtitle: subject?.name ?? 'This exam',
          meta: [describeDueAt(item.dueAt, now), describeLapses(item.lapses)]
            .filter((part) => part !== '')
            .join(' · '),
          detail: null,
          conceptId: concept?.id ?? null,
        };
      });
  }

  if (kind === 'saved') {
    const saved = await repositories.savedQuestions.list(exam.id);
    const questions = await repositories.questions.getByIds(saved.map((row) => row.questionId));
    return questions.map((question) => {
      const subject = getSubject(exam, question.subjectId);
      const concept = getConcept(exam, question.conceptIds[0] ?? '');
      const correct = question.choices.find((choice) => choice.id === question.correctChoiceId);
      return {
        id: question.id,
        title: question.stem,
        subtitle: subject?.name ?? 'This exam',
        meta: concept?.name ?? 'Saved question',
        detail: `${correct === undefined ? '' : `The answer was: ${correct.text}. `}${
          question.explanation
        }`,
        conceptId: concept?.id ?? null,
      };
    });
  }

  if (kind === 'revisit') {
    const mastery = await repositories.mastery.listByExam(exam.id);
    return revisitConcepts({
      exam,
      trackId,
      evidence: mastery,
      policy: exam.studyPolicy.mastery,
      limit: Number.MAX_SAFE_INTEGER,
    }).map((concept) => ({
      id: concept.conceptId,
      title: concept.conceptName,
      subtitle: concept.subjectName,
      meta: `${concept.level} · ${describeAccuracyPercent(concept.accuracy)} accuracy · ${
        concept.attempts
      } answered`,
      detail: null,
      conceptId: concept.conceptId,
    }));
  }

  const all = await repositories.review.listAll(exam.id);
  const history = buildReviewHistory({ exam, items: all, now, limit: Number.MAX_SAFE_INTEGER });
  return history.entries.map((entry) => ({
    id: entry.itemId,
    title: entry.conceptName,
    subtitle: entry.subjectName,
    meta: `Reviewed ${describeReviewedWhen(entry.reviewedAt, now)} · next ${describeInterval(
      entry.intervalDays,
    )}`,
    detail: describeLapses(entry.lapses) === '' ? null : describeLapses(entry.lapses),
    conceptId: entry.conceptId,
  }));
};
