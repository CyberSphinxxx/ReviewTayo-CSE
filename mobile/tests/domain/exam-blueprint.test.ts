import { bundledContentPacks } from '@content/exams';
import {
  blueprintTotalItems,
  formatClock,
  formatDuration,
  planAllocation,
  resolveBlueprint,
  resolveScoring,
  resolveTiming,
  sectionsForTrack,
  summarizeMock,
} from '@/domain/exams/blueprint';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamContentPack } from '@/domain/exams/types';

/**
 * Blueprint resolution.
 *
 * Item counts and durations must come from config for every track — these tests pin
 * the CSE Professional (170 items / 3h 10m) and Sub-Professional (165 / 2h 40m)
 * figures and prove that allocation degrades honestly when content is thin.
 */

const pack: ExamContentPack = (() => {
  const raw = bundledContentPacks[0];
  if (raw === undefined) throw new Error('CSE pack missing');
  const result = validateContentPack(raw);
  if (result.pack === null) throw new Error('CSE pack invalid');
  return result.pack;
})();

const { exam, questions } = pack;

const countAvailable = (subjectId: string): number =>
  questions.filter(
    (question) =>
      question.subjectId === subjectId &&
      question.trackIds.includes('professional') &&
      question.status === 'published',
  ).length;

describe('per-track blueprint resolution', () => {
  it('uses the Professional override', () => {
    expect(blueprintTotalItems(exam, 'professional')).toBe(170);
    expect(resolveTiming(exam, 'professional').totalMinutes).toBe(190);
  });

  it('uses the Sub-Professional override', () => {
    expect(blueprintTotalItems(exam, 'subprofessional')).toBe(165);
    expect(resolveTiming(exam, 'subprofessional').totalMinutes).toBe(160);
  });

  it('falls back to the exam-level blueprint for an unknown track', () => {
    expect(resolveBlueprint(exam, 'no-such-track')).toEqual(exam.blueprint);
  });

  it('excludes subjects the track does not examine', () => {
    expect(sectionsForTrack(exam, 'professional').map((section) => section.subjectId)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'analytical-ability',
      'general-information',
    ]);
    expect(sectionsForTrack(exam, 'subprofessional').map((section) => section.subjectId)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'clerical-ability',
      'general-information',
    ]);
  });

  it('keeps scoring config-driven, with CSE using raw correct answers', () => {
    const scoring = resolveScoring(exam, 'professional');
    expect(scoring.mode).toBe('raw-correct');
    expect(scoring.penaltyPerWrong).toBe(0);
    expect(scoring.pointsPerCorrect).toBe(1);
    expect(scoring.passingPercent).toBe(0.8);
  });
});

describe('summarizeMock', () => {
  it('describes the Professional mock from config', () => {
    const summary = summarizeMock(exam, 'professional');
    expect(summary.totalItems).toBe(170);
    expect(summary.durationLabel).toBe('3h 10m');
    expect(summary.allowPause).toBe(true);
  });

  it('describes the Sub-Professional mock from config', () => {
    const summary = summarizeMock(exam, 'subprofessional');
    expect(summary.totalItems).toBe(165);
    expect(summary.durationLabel).toBe('2h 40m');
  });
});

describe('formatDuration', () => {
  it.each([
    [45, '45m'],
    [60, '1h'],
    [120, '2h'],
    [160, '2h 40m'],
    [190, '3h 10m'],
    [0, '0m'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [65, '01:05'],
    [600, '10:00'],
    [11_400, '3:10:00'],
    [-5, '00:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe('planAllocation', () => {
  it('reports a shortfall when the content bank cannot fill the blueprint', () => {
    const plan = planAllocation(exam, 'professional', countAvailable);

    expect(plan.requestedTotal).toBe(170);
    expect(plan.plannedTotal).toBeLessThan(170);
    expect(plan.shortfall).toBe(true);
  });

  it('never plans more than is available per subject', () => {
    const plan = planAllocation(exam, 'professional', countAvailable);
    for (const allocation of plan.allocations) {
      expect(allocation.planned).toBeLessThanOrEqual(countAvailable(allocation.subjectId));
      expect(allocation.planned).toBeLessThanOrEqual(allocation.requested);
    }
  });

  it('reports no shortfall when enough questions exist', () => {
    const plan = planAllocation(exam, 'professional', () => 10_000);

    expect(plan.plannedTotal).toBe(170);
    expect(plan.shortfall).toBe(false);
  });

  it('plans zero for a subject with no content', () => {
    const plan = planAllocation(exam, 'professional', () => 0);

    expect(plan.plannedTotal).toBe(0);
    expect(plan.allocations.every((entry) => entry.planned === 0)).toBe(true);
  });
});
