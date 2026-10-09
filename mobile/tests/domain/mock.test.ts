import {
  MOCK_LOW_TIME_SECONDS,
  answeredCount,
  buildMockResult,
  correctCount,
  describeMockFlagged,
  describeMockProgress,
  describeMockScore,
  describeMockSkipped,
  describeRemaining,
  describeRemainingRough,
  firstUnansweredIndex,
  flaggedCount,
  isExpired,
  isLowOnTime,
  remainingSeconds,
  type MockClock,
  type MockItemState,
  type MockOutcomeItem,
} from '@/domain/mock';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Mock exam domain.
 *
 * Where the paper stands, how much of the exam's clock is left, and what the finished
 * paper says. These are asserted here because the clock decides whether a learner still
 * has time and the result decides what they are told about their own performance — a
 * wrong answer in either is a product fault however it is drawn.
 */

const { exam } = loadCsePack();
const TRACK = 'professional';

const item = (position: number, overrides: Partial<MockItemState> = {}): MockItemState => ({
  questionId: `q-${position}`,
  position,
  chosenChoiceId: null,
  isCorrect: null,
  flagged: false,
  ...overrides,
});

const clock = (overrides: Partial<MockClock> = {}): MockClock => ({
  expiresAt: new Date(2026, 9, 8, 15).toISOString(),
  pausedAt: null,
  remainingSeconds: null,
  ...overrides,
});

const NOW = new Date(2026, 9, 8, 15);

const outcome = (
  subjectId: string,
  answered: boolean,
  isCorrect: boolean | null,
): MockOutcomeItem => ({ subjectId, answered, isCorrect });

describe('mock paper progress', () => {
  const items = [
    item(0, { chosenChoiceId: 'a', isCorrect: true, flagged: true }),
    item(1, { chosenChoiceId: 'b', isCorrect: false }),
    item(2),
    item(3),
  ];

  it('counts what is answered, right and marked', () => {
    expect(answeredCount(items)).toBe(2);
    expect(correctCount(items)).toBe(1);
    expect(flaggedCount(items)).toBe(1);
    expect(describeMockProgress(items)).toBe('2 of 4 answered');
    expect(describeMockFlagged(items)).toBe('1 marked for review');
    expect(describeMockFlagged([item(0)])).toBe('No questions marked');
  });

  it('opens a resumed paper on the first question without an answer', () => {
    expect(firstUnansweredIndex(items)).toBe(2);
    expect(firstUnansweredIndex([item(0, { chosenChoiceId: 'a' })])).toBe(0);
    expect(firstUnansweredIndex([])).toBe(0);
  });
});

describe('mock paper clock', () => {
  it('reads the time left from the paper’s own deadline', () => {
    expect(remainingSeconds(clock(), NOW)).toBe(0);
    expect(
      remainingSeconds(clock({ expiresAt: new Date(2026, 9, 8, 15, 30).toISOString() }), NOW),
    ).toBe(30 * 60);
  });

  it('reads a paused paper from what it stored, not from the deadline', () => {
    const paused = clock({
      pausedAt: new Date(2026, 9, 8, 14).toISOString(),
      remainingSeconds: 600,
    });
    expect(remainingSeconds(paused, NOW)).toBe(600);
    expect(isExpired(paused, NOW)).toBe(false);
  });

  it('expires an unpaused paper whose deadline has passed, and never goes negative', () => {
    const past = clock({ expiresAt: new Date(2026, 9, 8, 14).toISOString() });
    expect(remainingSeconds(past, NOW)).toBe(0);
    expect(isExpired(past, NOW)).toBe(true);
    expect(isExpired(clock(), NOW)).toBe(true);
    expect(isExpired(clock({ expiresAt: new Date(2026, 9, 8, 15, 1).toISOString() }), NOW)).toBe(
      false,
    );
  });

  it('writes the clock the way the exam does', () => {
    expect(describeRemaining(3 * 3600 + 10 * 60)).toBe('3:10:00');
    expect(describeRemaining(59)).toBe('00:59');
    expect(describeRemainingRough(70 * 60)).toBe('1h 10m left');
    expect(describeRemainingRough(90)).toBe('2m left');
    expect(isLowOnTime(MOCK_LOW_TIME_SECONDS)).toBe(true);
    expect(isLowOnTime(MOCK_LOW_TIME_SECONDS + 1)).toBe(false);
  });
});

describe('mock result', () => {
  /** 4 verbal (3 right), 2 numerical (1 right), 1 analytical skipped. */
  const items: readonly MockOutcomeItem[] = [
    outcome('verbal-ability', true, true),
    outcome('verbal-ability', true, true),
    outcome('verbal-ability', true, true),
    outcome('verbal-ability', true, false),
    outcome('numerical-ability', true, true),
    outcome('numerical-ability', true, false),
    outcome('analytical-ability', false, null),
  ];

  it('scores the paper out of every item, answered or not', () => {
    const result = buildMockResult({ exam, trackId: TRACK, items });

    expect(result.total).toBe(7);
    expect(result.answered).toBe(6);
    expect(result.skipped).toBe(1);
    expect(result.correct).toBe(4);
    expect(result.scorePercent).toBe(57);
    expect(describeMockScore(result)).toBe('57%');
    expect(result.passingPercent).toBe(80);
    expect(result.passingLabel).toBe('Passing mark 80%');
  });

  it('breaks the paper down by the exam’s own sections, in the exam’s own order', () => {
    const result = buildMockResult({ exam, trackId: TRACK, items });

    expect(result.subjects.map((row) => row.subjectId)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'analytical-ability',
    ]);
    const verbal = result.subjects[0];
    expect(verbal?.subjectName).toBe('Verbal Ability');
    expect(verbal?.total).toBe(4);
    expect(verbal?.correct).toBe(3);
    expect(verbal?.percent).toBe(75);
    expect(verbal?.isWeakest).toBe(false);
    // Analytical was left unanswered entirely, so it is not judged weakest.
    expect(result.weakestSubjectId).toBe('numerical-ability');
    expect(result.subjects.find((row) => row.subjectId === 'analytical-ability')?.percent).toBe(0);
  });

  it('asks for a proper sitting when the paper was cut short', () => {
    const expired = buildMockResult({ exam, trackId: TRACK, items, expired: true });
    expect(expired.recommendation.kind).toBe('retake');
    expect(expired.recommendation.title).toContain('full simulation');

    // A paper with more than half of its items untouched is not a measurement either.
    const halfDone = buildMockResult({
      exam,
      trackId: TRACK,
      items: [
        outcome('verbal-ability', true, true),
        outcome('verbal-ability', false, null),
        outcome('numerical-ability', false, null),
        outcome('numerical-ability', false, null),
      ],
    });
    expect(halfDone.recommendation.kind).toBe('retake');
    expect(halfDone.recommendation.description).toContain('unanswered');
  });

  it('names the weakest section when it is under the exam’s own threshold', () => {
    const result = buildMockResult({
      exam,
      trackId: TRACK,
      items: [
        outcome('verbal-ability', true, false),
        outcome('verbal-ability', true, false),
        outcome('numerical-ability', true, true),
        outcome('numerical-ability', true, true),
      ],
    });

    expect(result.recommendation.kind).toBe('weakest-area');
    expect(result.recommendation.subjectId).toBe('verbal-ability');
    expect(result.recommendation.title).toBe('Focus on Verbal Ability');
    expect(result.recommendation.count).toBe(exam.studyPolicy.drillSize);
    expect(result.recommendation.steps.includes('Review mistakes')).toBe(true);
  });

  it('sends a paper with misses to Review and a clean paper nowhere new', () => {
    const misses = buildMockResult({
      exam,
      trackId: TRACK,
      items: [
        outcome('verbal-ability', true, true),
        outcome('numerical-ability', true, true),
        outcome('analytical-ability', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, true),
        outcome('general-information', true, false),
      ],
    });
    expect(misses.recommendation.kind).toBe('review');

    const clean = buildMockResult({
      exam,
      trackId: TRACK,
      items: items.map((entry) => ({ ...entry, isCorrect: true, answered: true })),
    });
    expect(clean.recommendation.kind).toBe('progress');
    expect(clean.recommendation.title).toBe('A clean paper');
  });

  it('describes what was left out', () => {
    const result = buildMockResult({
      exam,
      trackId: TRACK,
      items: [
        outcome('verbal-ability', true, true),
        outcome('verbal-ability', true, false),
        outcome('verbal-ability', false, null),
      ],
    });
    expect(describeMockSkipped(result)).toBe('1 skipped · 1 wrong');

    const perfect = buildMockResult({
      exam,
      trackId: TRACK,
      items: [outcome('verbal-ability', true, true)],
    });
    expect(describeMockSkipped(perfect)).toBe('');
    expect(perfect.recommendation.kind).toBe('progress');
  });

  it('has nothing to score and nothing to fear from an empty paper', () => {
    const result = buildMockResult({ exam, trackId: TRACK, items: [] });
    expect(result.total).toBe(0);
    expect(result.scorePercent).toBe(0);
    expect(result.subjects).toEqual([]);
    expect(result.weakestSubjectId).toBeNull();
  });
});
