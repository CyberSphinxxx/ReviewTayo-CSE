import { importContentPack } from '@/data/local/content-import';
import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import { daysUntilDue, isDueAt } from '@/domain/review';
import { submitAnswer } from '@/services/practice';
import {
  gradeReviewItem,
  isReviewListKind,
  loadReviewList,
  loadReviewOverview,
  loadReviewQueue,
} from '@/services/review';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Review service.
 *
 * The queue, the grading and the four lists, run against a real database. What is
 * asserted here is what a learner would notice: how many cards they are shown, that an
 * Again really does come back sooner than a Got it, and that the lists behind Review
 * say what they claim to.
 */

const pack = loadCsePack();
const exam = pack.exam;
const policy = exam.studyPolicy;
const TRACK = 'professional';
const NOW = new Date();

interface Fixture {
  readonly repositories: Repositories;
}

const seed = async (): Promise<Fixture> => {
  const { repositories } = await createMigratedDatabase();
  await importContentPack(repositories, pack);
  return { repositories };
};

const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

/** A concept-level item, as an answer would have written it. */
const schedule = async (
  repositories: Repositories,
  conceptId: string,
  options: { readonly dueAt?: string; readonly lapses?: number; readonly source?: 'mistake' } = {},
): Promise<string> => {
  const id = `review-${conceptId}`;
  await repositories.review.upsert({
    id,
    examId: exam.id,
    conceptId,
    questionId: null,
    source: options.source ?? 'mistake',
    dueAt: options.dueAt ?? daysAgo(2),
    intervalDays: 1,
    easeLevel: 0,
    lapses: options.lapses ?? 1,
    reviews: 0,
    lastReviewedAt: null,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  });
  return id;
};

const mastered = async (repositories: Repositories, conceptId: string): Promise<void> => {
  await repositories.mastery.save({
    conceptId,
    examId: exam.id,
    correctCount: 12,
    wrongCount: 1,
    level: 3,
    streak: 6,
    lastAnsweredAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });
};

describe('Review service', () => {
  it('reads only what is due, oldest first', async () => {
    const { repositories } = await seed();
    await schedule(repositories, 'vocabulary', { dueAt: daysAgo(4) });
    await schedule(repositories, 'grammar-and-usage', { dueAt: daysAgo(2) });
    await schedule(repositories, 'reading-comprehension', { dueAt: daysAgo(1) });
    await schedule(repositories, 'sentence-completion', {
      dueAt: new Date(NOW.getTime() + 3 * 86_400_000).toISOString(),
    });

    const queue = await loadReviewQueue({ repositories, exam, now: NOW });

    expect(queue.dueCount).toBe(3);
    expect(queue.deck.count).toBe(3);
    expect(queue.deck.cards.map((card) => card.conceptId)).toEqual([
      'vocabulary',
      'grammar-and-usage',
      'reading-comprehension',
    ]);
    expect(queue.limit).toBe(policy.review.dailyDueLimit);
  });

  it('honours the exam’s own cap on one day of review', async () => {
    const { repositories } = await seed();
    for (const conceptId of ['vocabulary', 'grammar-and-usage', 'reading-comprehension']) {
      await schedule(repositories, conceptId);
    }
    const capped: ExamRuleConfig = {
      ...exam,
      studyPolicy: {
        ...policy,
        review: { ...policy.review, dailyDueLimit: 2 },
      },
    };

    const queue = await loadReviewQueue({ repositories, exam: capped, now: NOW });

    expect(queue.dueCount).toBe(3);
    expect(queue.deck.count).toBe(2);
  });

  it('takes an Again back to the start of the ladder and counts the lapse', async () => {
    const { repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary', { lapses: 1 });
    await mastered(repositories, 'vocabulary');

    const graded = await gradeReviewItem({
      repositories,
      exam,
      itemId: id,
      outcome: 'again',
      now: NOW,
    });

    expect(graded).not.toBeNull();
    expect(graded?.item.lapses).toBe(2);
    expect(graded?.item.intervalDays).toBe(policy.review.againIntervalDays);
    expect(daysUntilDue(graded?.item.dueAt ?? '', NOW)).toBe(policy.review.againIntervalDays);
    // Looking at a card is not the same as reviewing it: the review count is the
    // learner's own claim that they knew it.
    expect(graded?.item.reviews).toBe(0);
    expect(graded?.item.lastReviewedAt).toBeNull();
  });

  it('earns a Got it the interval the concept’s mastery has reached', async () => {
    const { repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary');
    await mastered(repositories, 'vocabulary');

    const graded = await gradeReviewItem({
      repositories,
      exam,
      itemId: id,
      outcome: 'got-it',
      now: NOW,
    });

    // Mastered, so the top rung of the exam's ladder — far longer than Again's day.
    expect(graded?.levelIndex).toBe(3);
    expect(graded?.item.intervalDays).toBe(policy.review.gotItIntervalDays[3]);
    expect(graded?.item.intervalDays).toBeGreaterThan(policy.review.againIntervalDays);
    expect(graded?.item.reviews).toBe(1);
    expect(graded?.item.lastReviewedAt).toBe(NOW.toISOString());
    expect(isDueAt(graded?.item.dueAt ?? '', NOW.toISOString())).toBe(false);
  });

  it('leaves mastery to the answers and does not credit it for a flashcard', async () => {
    const { repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary');
    await mastered(repositories, 'vocabulary');

    await gradeReviewItem({ repositories, exam, itemId: id, outcome: 'got-it', now: NOW });

    const mastery = await repositories.mastery.get('vocabulary');
    expect(mastery?.correctCount).toBe(12);
    expect(mastery?.wrongCount).toBe(1);
  });

  it('reports an item that is no longer on the device', async () => {
    const { repositories } = await seed();
    expect(
      await gradeReviewItem({
        repositories,
        exam,
        itemId: 'review-that-never-existed',
        outcome: 'got-it',
        now: NOW,
      }),
    ).toBeNull();
  });

  it('moves the same due date an answer would have', async () => {
    const { repositories } = await seed();
    const [question] = await repositories.questions.listPublished({
      examId: exam.id,
      trackId: TRACK,
    });
    expect(question).toBeDefined();
    if (question === undefined) return;
    const wrong = question.choices.find((choice) => choice.id !== question.correctChoiceId);
    if (wrong === undefined) throw new Error('Question has no incorrect choice.');

    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: wrong.id,
      dailyGoal: 10,
      now: NOW,
    });

    const conceptId = question.conceptIds[0];
    expect(conceptId).toBeDefined();
    if (conceptId === undefined) return;
    const scheduled = await repositories.review.findByConcept(exam.id, conceptId, null);
    expect(scheduled).not.toBeNull();
    expect(scheduled?.lapses).toBe(1);
    expect(scheduled?.intervalDays).toBe(policy.review.againIntervalDays);
    if (scheduled === null) return;

    // The deck and the answer writer share one schedule: saying "Got it" to the card
    // the miss just created takes it along the same ladder rather than resetting it.
    const graded = await gradeReviewItem({
      repositories,
      exam,
      itemId: scheduled.id,
      outcome: 'got-it',
      now: NOW,
    });
    expect(graded?.item.intervalDays).toBe(policy.review.gotItIntervalDays[0]);
    expect(graded?.item.lapses).toBe(1);
    expect(graded?.item.reviews).toBe(1);
  });

  it('counts what the four rows claim, in one read', async () => {
    const { repositories } = await seed();
    await schedule(repositories, 'vocabulary');
    await schedule(repositories, 'grammar-and-usage');
    await repositories.mastery.save({
      conceptId: 'reading-comprehension',
      examId: exam.id,
      correctCount: 1,
      wrongCount: 4,
      level: 0,
      streak: 0,
      lastAnsweredAt: daysAgo(1),
      updatedAt: daysAgo(1),
    });
    const [question] = await repositories.questions.listPublished({
      examId: exam.id,
      trackId: TRACK,
    });
    if (question === undefined) return;
    await repositories.savedQuestions.save({
      questionId: question.id,
      examId: exam.id,
      savedAt: NOW.toISOString(),
    });
    const gradedId = await schedule(repositories, 'sentence-completion');
    await gradeReviewItem({ repositories, exam, itemId: gradedId, outcome: 'got-it', now: NOW });

    const overview = await loadReviewOverview({
      repositories,
      exam,
      trackId: TRACK,
      now: NOW,
    });

    expect(overview.mistakeCount).toBe(3);
    expect(overview.savedCount).toBe(1);
    expect(overview.revisit.map((entry) => entry.conceptId)).toContain('reading-comprehension');
    expect(overview.history.reviewedThisWeek).toBe(1);
    // Home quotes the same duration for the same items.
    expect(overview.meta).toBe('2 items · 1 minute');
    expect(overview.dueCount).toBe(2);
  });

  it('names the four lists and refuses anything else', () => {
    expect(isReviewListKind('mistakes')).toBe(true);
    expect(isReviewListKind('saved')).toBe(true);
    expect(isReviewListKind('revisit')).toBe(true);
    expect(isReviewListKind('history')).toBe(true);
    expect(isReviewListKind('everything')).toBe(false);
    expect(isReviewListKind('')).toBe(false);
  });

  it('lists mistakes with the concept, its subject and when it returns', async () => {
    const { repositories } = await seed();
    await schedule(repositories, 'vocabulary', { dueAt: daysAgo(1), lapses: 2 });

    const list = await loadReviewList({
      repositories,
      exam,
      trackId: TRACK,
      kind: 'mistakes',
      now: NOW,
    });

    expect(list.title).toBe('Mistakes');
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.title).toBe('Vocabulary');
    expect(list.items[0]?.subtitle).toBe('Verbal Ability');
    expect(list.items[0]?.meta).toBe('Due today · Missed 2 times');
    expect(list.items[0]?.conceptId).toBe('vocabulary');
  });

  it('lists saved questions with the answer and the reason', async () => {
    const { repositories } = await seed();
    const [question] = await repositories.questions.listPublished({
      examId: exam.id,
      trackId: TRACK,
    });
    if (question === undefined) return;
    await repositories.savedQuestions.save({
      questionId: question.id,
      examId: exam.id,
      savedAt: NOW.toISOString(),
    });

    const list = await loadReviewList({
      repositories,
      exam,
      trackId: TRACK,
      kind: 'saved',
      now: NOW,
    });

    const row = list.items[0];
    expect(row?.title).toBe(question.stem);
    expect(row?.detail).toContain('The answer was:');
    expect(row?.detail).toContain(question.explanation);
    expect(row?.conceptId).toBe(question.conceptIds[0]);
  });

  it('lists the concepts worth revisiting with their level and accuracy', async () => {
    const { repositories } = await seed();
    await repositories.mastery.save({
      conceptId: 'reading-comprehension',
      examId: exam.id,
      correctCount: 1,
      wrongCount: 3,
      level: 0,
      streak: 0,
      lastAnsweredAt: daysAgo(1),
      updatedAt: daysAgo(1),
    });

    const list = await loadReviewList({
      repositories,
      exam,
      trackId: TRACK,
      kind: 'revisit',
      now: NOW,
    });

    expect(list.items[0]?.title).toBe('Reading Comprehension');
    expect(list.items[0]?.meta).toBe('Learning · 25% accuracy · 4 answered');
  });

  it('lists the week’s reviews, and says nothing was done when that is true', async () => {
    const { repositories } = await seed();
    const id = await schedule(repositories, 'vocabulary');
    await gradeReviewItem({ repositories, exam, itemId: id, outcome: 'got-it', now: NOW });

    const list = await loadReviewList({
      repositories,
      exam,
      trackId: TRACK,
      kind: 'history',
      now: NOW,
    });

    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.title).toBe('Vocabulary');
    expect(list.items[0]?.meta).toContain('Reviewed today');

    const empty = await loadReviewList({
      repositories,
      exam,
      trackId: TRACK,
      kind: 'saved',
      now: NOW,
    });
    expect(empty.items).toEqual([]);
    expect(empty.emptyTitle).toBe('Nothing saved yet');
    expect(empty.emptyDescription).toContain('bookmark');
  });
});
