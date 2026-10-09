import {
  buildReviewDeck,
  buildReviewHistory,
  describeDeckCompletion,
  describeDueAt,
  describeHistoryLine,
  describeInterval,
  describeLapses,
  describeReviewedWhen,
  describeReviewCount,
  gotItIntervalDays,
  isoDaysFromNow,
  localDaysBetween,
  nextReviewSchedule,
  revisitConcepts,
  type ScheduledReviewItem,
} from '@/domain/review';
import { describeAccuracyPercent, type ConceptEvidence } from '@/domain/sessions';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Review domain.
 *
 * The scheduling arithmetic, the deck and the two derivations behind Review's lists.
 * These are asserted here rather than through a screen because a wrong interval is a
 * product fault however it is drawn: it decides when a concept the learner already
 * missed comes back, and there is no screen a learner could use to notice it was two
 * days too late.
 */

const { exam } = loadCsePack();
const policy = exam.studyPolicy;
const TRACK = 'professional';
/**
 * Instants are built in local time on purpose: every date here is compared as a local
 * calendar day, so a UTC literal would make the assertions true in Manila and false in
 * Los Angeles for no reason the code cares about.
 */
const at = (day: number, hour = 9, month = 10): Date =>
  new Date(2026, month - 1, day, hour, 0, 0, 0);
const NOW = at(8);

const item = (overrides: Partial<ScheduledReviewItem> = {}): ScheduledReviewItem => ({
  id: 'review-1',
  conceptId: 'vocabulary',
  dueAt: '2026-10-06T09:00:00.000Z',
  intervalDays: 1,
  lapses: 0,
  reviews: 0,
  lastReviewedAt: null,
  ...overrides,
});

const evidence = (
  conceptId: string,
  correctCount: number,
  wrongCount: number,
): ConceptEvidence => ({
  conceptId,
  correctCount,
  wrongCount,
  lastAnsweredAt: null,
});

describe('review scheduling', () => {
  it('takes an Again back to the policy’s shortest interval and counts the lapse', () => {
    const schedule = nextReviewSchedule({
      policy: policy.review,
      outcome: 'again',
      levelIndex: 3,
      reviews: 4,
      lapses: 1,
      now: NOW,
    });

    expect(schedule.intervalDays).toBe(policy.review.againIntervalDays);
    expect(schedule.dueAt).toBe(isoDaysFromNow(NOW, policy.review.againIntervalDays));
    expect(schedule.lapses).toBe(2);
    // A lapse is not a review: the learner looked, and it did not stick.
    expect(schedule.reviews).toBe(4);
    expect(schedule.easeLevel).toBe(3);
  });

  it('climbs the exam’s own ladder for a Got it', () => {
    for (const [levelIndex, expected] of policy.review.gotItIntervalDays.entries()) {
      const schedule = nextReviewSchedule({
        policy: policy.review,
        outcome: 'got-it',
        levelIndex,
        now: NOW,
      });
      expect(schedule.intervalDays).toBe(expected);
      expect(schedule.reviews).toBe(1);
      expect(schedule.lapses).toBe(0);
    }
  });

  it('keeps the longest interval for a mastery level past the end of the ladder', () => {
    const last = policy.review.gotItIntervalDays.at(-1) ?? 0;
    expect(gotItIntervalDays(policy.review, policy.review.gotItIntervalDays.length + 4)).toBe(last);
    expect(gotItIntervalDays(policy.review, -3)).toBe(policy.review.gotItIntervalDays[0]);
  });

  it('falls back to the Again interval when an exam declares no ladder at all', () => {
    const bare = { gotItIntervalDays: [], againIntervalDays: 4, dailyDueLimit: 10 };
    expect(gotItIntervalDays(bare, 2)).toBe(4);
    expect(
      nextReviewSchedule({ policy: bare, outcome: 'got-it', levelIndex: 2, now: NOW }).intervalDays,
    ).toBe(4);
  });

  it('never schedules a card into the past', () => {
    const schedule = nextReviewSchedule({
      policy: policy.review,
      outcome: 'got-it',
      levelIndex: 0,
      now: NOW,
    });
    expect(new Date(schedule.dueAt).getTime()).toBeGreaterThan(NOW.getTime());
    expect(isoDaysFromNow(NOW, -5)).toBe(NOW.toISOString());
  });

  it('counts whole local days between two instants', () => {
    expect(localDaysBetween(NOW.toISOString(), at(8, 23).toISOString())).toBe(0);
    expect(localDaysBetween(NOW.toISOString(), at(9, 1).toISOString())).toBe(1);
    expect(localDaysBetween(at(6).toISOString(), NOW.toISOString())).toBe(2);
  });

  it('says when a card is due in words a learner would use', () => {
    const due = (date: Date) => describeDueAt(date.toISOString(), NOW);
    expect(due(at(8, 1))).toBe('Due today');
    expect(due(at(1))).toBe('Due today');
    expect(due(at(9))).toBe('Due tomorrow');
    expect(due(at(12))).toBe('Due in 4 days');
    expect(due(at(15))).toBe('Due in a week');
    expect(due(at(29))).toBe('Due in 3 weeks');
  });

  it('describes an interval the same way it describes a due date', () => {
    expect(describeInterval(0)).toBe('today');
    expect(describeInterval(1)).toBe('tomorrow');
    expect(describeInterval(16)).toBe('in 16 days');
    expect(describeInterval(-2)).toBe('today');
  });
});

describe('review deck', () => {
  it('builds one card per due item from the concept’s own material', () => {
    const deck = buildReviewDeck({
      exam,
      items: [
        item({ id: 'a', conceptId: 'vocabulary', lapses: 2 }),
        item({ id: 'b', conceptId: 'grammar-and-usage' }),
      ],
    });

    expect(deck.count).toBe(2);
    const first = deck.cards[0];
    expect(first?.itemId).toBe('a');
    expect(first?.prompt).toBe('Vocabulary');
    expect(first?.answer).toBe(
      'Use context and word parts to choose the precise meaning of a word.',
    );
    expect(first?.subjectName).toBe('Verbal Ability');
    expect(first?.lapses).toBe(2);
  });

  it('skips an item whose concept is not part of the exam content', () => {
    const deck = buildReviewDeck({
      exam,
      items: [item({ id: 'ghost', conceptId: 'a-concept-that-does-not-exist' })],
    });
    expect(deck.count).toBe(0);
  });

  it('counts items one at a time in the copy', () => {
    expect(describeReviewCount(1)).toBe('1 item');
    expect(describeReviewCount(4)).toBe('4 items');
    expect(describeLapses(0)).toBe('');
    expect(describeLapses(1)).toBe('Missed once');
    expect(describeLapses(3)).toBe('Missed 3 times');
  });

  it('ends a deck by saying exactly what is left over', () => {
    expect(describeDeckCompletion({ again: 0, leftover: 0 })).toEqual({
      title: 'Review cleared.',
      description: 'Next items are due tomorrow.',
    });
    expect(describeDeckCompletion({ again: 1, leftover: 0 })).toEqual({
      title: 'Nice work.',
      description: '1 item will come back sooner.',
    });
    expect(describeDeckCompletion({ again: 0, leftover: 6 })).toEqual({
      title: 'Nice work.',
      description: '6 items are waiting for tomorrow.',
    });
    expect(describeDeckCompletion({ again: 2, leftover: 1 })).toEqual({
      title: 'Nice work.',
      description: '2 items will come back sooner. 1 item is waiting for tomorrow.',
    });
  });
});

describe('concepts to revisit', () => {
  it('names started concepts that are still below Strong, weakest first', () => {
    const revisits = revisitConcepts({
      exam,
      trackId: TRACK,
      policy: policy.mastery,
      evidence: [
        evidence('grammar-and-usage', 1, 4),
        evidence('vocabulary', 2, 1),
        evidence('reading-comprehension', 9, 1),
      ],
    });

    expect(revisits.map((entry) => entry.conceptId)).toEqual(['grammar-and-usage', 'vocabulary']);
    expect(revisits[0]?.level).toBe('Learning');
    expect(revisits[0]?.accuracy).toBeCloseTo(0.2, 5);
    expect(revisits[0]?.attempts).toBe(5);
    expect(revisits[0]?.subjectName).toBe('Verbal Ability');
  });

  it('leaves untouched material to Learn and mastered material to the past', () => {
    const revisits = revisitConcepts({
      exam,
      trackId: TRACK,
      policy: policy.mastery,
      evidence: [evidence('reading-comprehension', 20, 0)],
    });
    expect(revisits).toEqual([]);
  });

  it('stays inside the learner’s own track and inside the limit', () => {
    const professional = revisitConcepts({
      exam,
      trackId: 'professional',
      policy: policy.mastery,
      limit: 2,
      evidence: exam.concepts.map((concept) => evidence(concept.id, 1, 3)),
    });
    expect(professional).toHaveLength(2);
    expect(professional.every((entry) => entry.subjectName !== 'Clerical Ability')).toBe(true);

    const clerical = revisitConcepts({
      exam,
      trackId: 'subprofessional',
      policy: policy.mastery,
      limit: 50,
      evidence: exam.concepts.map((concept) => evidence(concept.id, 1, 3)),
    });
    expect(clerical.some((entry) => entry.subjectName === 'Clerical Ability')).toBe(true);
  });

  it('formats accuracy as a whole percentage', () => {
    expect(describeAccuracyPercent(0.643)).toBe('64%');
    expect(describeAccuracyPercent(0)).toBe('0%');
    expect(describeAccuracyPercent(1.4)).toBe('100%');
  });
});

describe('review history', () => {
  const reviewed = (id: string, conceptId: string, reviewedAt: string): ScheduledReviewItem =>
    item({ id, conceptId, lastReviewedAt: reviewedAt, reviews: 1, intervalDays: 3 });

  it('counts only the concepts reviewed inside the window, newest first', () => {
    const history = buildReviewHistory({
      exam,
      now: NOW,
      items: [
        reviewed('a', 'vocabulary', at(8, 7).toISOString()),
        reviewed('b', 'grammar-and-usage', at(5, 7).toISOString()),
        reviewed('c', 'reading-comprehension', at(20, 7, 9).toISOString()),
        item({ id: 'd', conceptId: 'sentence-completion' }),
      ],
    });

    expect(history.reviewedThisWeek).toBe(2);
    expect(history.entries.map((entry) => entry.conceptId)).toEqual([
      'vocabulary',
      'grammar-and-usage',
    ]);
    expect(history.entries[0]?.subjectName).toBe('Verbal Ability');
    expect(history.entries[0]?.intervalDays).toBe(3);
  });

  it('drops rows whose concept is gone and honours the limit', () => {
    const history = buildReviewHistory({
      exam,
      now: NOW,
      limit: 1,
      items: [
        reviewed('a', 'vocabulary', at(8, 7).toISOString()),
        reviewed('b', 'grammar-and-usage', at(7, 7).toISOString()),
        reviewed('c', 'gone-for-good', at(6, 7).toISOString()),
      ],
    });

    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]?.conceptId).toBe('vocabulary');
  });

  it('says how the week went and when a card was last seen', () => {
    expect(describeHistoryLine(0)).toBe('Nothing reviewed yet');
    expect(describeHistoryLine(1)).toBe('1 concept this week');
    expect(describeHistoryLine(12)).toBe('12 concepts this week');
    expect(describeReviewedWhen(at(8, 0, 10).toISOString(), NOW)).toBe('today');
    expect(describeReviewedWhen(at(7, 23).toISOString(), NOW)).toBe('yesterday');
    expect(describeReviewedWhen(at(4).toISOString(), NOW)).toBe('4 days ago');
  });
});
