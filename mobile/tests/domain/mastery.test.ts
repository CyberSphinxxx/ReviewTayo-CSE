import {
  isMasteryStarted,
  MASTERY_EVIDENCE_FLOOR,
  MASTERY_LADDER,
  masteryLevelFor,
  masteryLevelIndex,
  masteryScore,
} from '@/domain/exams/mastery';
import type { MasteryPolicy } from '@/domain/exams/types';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Mastery derivation.
 *
 * Mastery is what Learn and Progress use to describe how well a concept is known,
 * so these tests pin the claims it makes: it is derived from answer history, it
 * needs evidence before it says "mastered", and it follows the exam's own policy
 * rather than a hard-coded ladder.
 */

const policy = (overrides: Partial<MasteryPolicy> = {}): MasteryPolicy => ({
  levelCount: 4,
  developingThreshold: 0.4,
  strongThreshold: 0.6,
  masteredThreshold: 0.85,
  correctDelta: 1,
  wrongDelta: 1,
  ...overrides,
});

const evidence = (correctCount: number, wrongCount: number) => ({ correctCount, wrongCount });

describe('mastery score', () => {
  it('is zero for a concept with no answers', () => {
    expect(masteryScore(evidence(0, 0), policy())).toBe(0);
    expect(isMasteryStarted(evidence(0, 0))).toBe(false);
  });

  it('damps a small sample so one lucky answer is not mastery', () => {
    const one = masteryScore(evidence(1, 0), policy());
    expect(one).toBe(1 / MASTERY_EVIDENCE_FLOOR);
    expect(one).toBeLessThan(policy().developingThreshold);
  });

  it('reaches the evidence floor at the floor and stops growing there', () => {
    expect(masteryScore(evidence(MASTERY_EVIDENCE_FLOOR, 0), policy())).toBe(1);
    expect(masteryScore(evidence(50, 0), policy())).toBe(1);
  });

  it('reads a wrong-heavy concept as untouched-level mastery', () => {
    expect(masteryScore(evidence(0, 6), policy())).toBe(0);
    expect(masteryScore(evidence(1, 5), policy())).toBeCloseTo(1 / 6, 3);
  });

  it('honours an exam that weights a wrong answer more heavily', () => {
    const weighted = policy({ wrongDelta: 2 });
    // Four right and one wrong: 4/6 rather than 4/5. Scores are quantised to three
    // decimals so a threshold comparison never turns on floating-point noise.
    expect(masteryScore(evidence(4, 1), weighted)).toBeCloseTo(4 / 6, 3);
    expect(masteryScore(evidence(4, 1), policy())).toBeCloseTo(0.8, 6);
  });

  it('refuses to read nonsense as progress', () => {
    expect(masteryScore(evidence(Number.NaN, 3), policy())).toBe(0);
    expect(masteryScore(evidence(-4, 0), policy())).toBe(0);
    expect(masteryScore(evidence(0, -2), policy())).toBe(0);
  });

  it('treats a policy with no increments as no evidence rather than a crash', () => {
    const inert = policy({ correctDelta: 0, wrongDelta: 0 });
    expect(masteryScore(evidence(9, 9), inert)).toBe(0);
  });
});

describe('mastery ladder', () => {
  it('climbs the approved ladder as evidence accumulates', () => {
    const p = policy();
    expect(masteryLevelFor(evidence(0, 0), p)).toBe('Learning');
    expect(masteryLevelFor(evidence(1, 0), p)).toBe('Learning');
    expect(masteryLevelFor(evidence(2, 0), p)).toBe('Developing');
    expect(masteryLevelFor(evidence(3, 0), p)).toBe('Strong');
    expect(masteryLevelFor(evidence(4, 0), p)).toBe('Strong');
    expect(masteryLevelFor(evidence(5, 0), p)).toBe('Mastered');
  });

  it('never loses a level as the same evidence grows', () => {
    const p = policy();
    const rows = [
      evidence(0, 0),
      evidence(1, 0),
      evidence(1, 1),
      evidence(2, 1),
      evidence(2, 2),
      evidence(3, 2),
      evidence(4, 2),
      evidence(6, 1),
      evidence(10, 0),
    ];
    const scores = rows.map((row) => masteryScore(row, p));
    const sorted = [...scores].sort((a, b) => a - b);
    expect(scores).toEqual(sorted);
  });

  it('clamps the index to the policy it was given', () => {
    const two = policy({ levelCount: 2 });
    expect(masteryLevelIndex(1, two)).toBe(1);
    expect(masteryLevelFor(evidence(20, 0), two)).toBe('Developing');
    expect(masteryLevelIndex(Number.NaN, policy())).toBe(0);
    expect(masteryLevelIndex(2, policy())).toBe(3);
  });

  it('accepts a policy whose thresholds are far outside the queries', () => {
    const strict = policy({
      developingThreshold: 0.9,
      strongThreshold: 0.95,
      masteredThreshold: 1,
    });
    expect(masteryLevelFor(evidence(50, 0), strict)).toBe('Mastered');
    expect(masteryLevelFor(evidence(4, 1), strict)).toBe('Learning');
  });

  it('keeps four approved labels in the ladder', () => {
    expect(MASTERY_LADDER).toEqual(['Learning', 'Developing', 'Strong', 'Mastered']);
  });
});

describe('mastery against the bundled CSE policy', () => {
  it('reads the thresholds from the pack rather than from the code', () => {
    const { exam } = loadCsePack();
    const p = exam.studyPolicy.mastery;
    expect(p.levelCount).toBe(MASTERY_LADDER.length);
    expect(masteryLevelFor(evidence(6, 0), p)).toBe('Mastered');
    expect(masteryLevelFor(evidence(0, 0), p)).toBe('Learning');
    // A concept the learner keeps getting wrong stays where it is.
    expect(masteryLevelFor(evidence(1, 4), p)).toBe('Learning');
  });
});
