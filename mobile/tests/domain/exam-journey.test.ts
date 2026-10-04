import { bundledContentPacks } from '@content/exams';
import {
  daysUntil,
  describeExamPhase,
  journeyTimeline,
  resolveExamPhase,
} from '@/domain/exams/journey';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamRuleConfig } from '@/domain/exams/types';

/**
 * Journey phase resolution.
 *
 * The phase is derived from the exam date and the exam's own phase definitions, so
 * these tests pin the boundaries — including the 44-day case the reference prototype
 * displays as "Accuracy Phase".
 */

const cse: ExamRuleConfig = (() => {
  const pack = bundledContentPacks[0];
  if (pack === undefined) throw new Error('CSE pack missing');
  const result = validateContentPack(pack);
  if (result.pack === null) throw new Error('CSE pack invalid');
  return result.pack.exam;
})();

const NOW = new Date('2026-10-05T09:00:00');

const dateAfter = (days: number): string => {
  const target = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days);
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${target.getFullYear()}-${month}-${day}`;
};

describe('resolveExamPhase', () => {
  it('returns the flexible phase when no exam date is set', () => {
    const result = resolveExamPhase(cse, null, NOW);

    expect(result.phase.id).toBe('flexible');
    expect(result.daysRemaining).toBeNull();
    expect(result.isExamDayOrPast).toBe(false);
  });

  it('treats an empty date string like no date', () => {
    expect(resolveExamPhase(cse, '   ', NOW).phase.id).toBe('flexible');
  });

  it.each([
    [200, 'foundation'],
    [90, 'foundation'],
    [89, 'accuracy'],
    [44, 'accuracy'],
    [30, 'accuracy'],
    [29, 'speed'],
    [14, 'speed'],
    [13, 'mock-week'],
    [7, 'mock-week'],
    [6, 'final-review'],
    [0, 'final-review'],
  ])('maps %i days remaining to the %s phase', (days, expectedPhaseId) => {
    const result = resolveExamPhase(cse, dateAfter(days), NOW);

    expect(result.phase.id).toBe(expectedPhaseId);
    expect(result.daysRemaining).toBe(days);
  });

  it('flags exam day and past dates', () => {
    expect(resolveExamPhase(cse, dateAfter(0), NOW).isExamDayOrPast).toBe(true);
    expect(resolveExamPhase(cse, dateAfter(-3), NOW).isExamDayOrPast).toBe(true);
  });

  it('reports progress within the active phase as a fraction', () => {
    const early = resolveExamPhase(cse, dateAfter(44), NOW);
    const late = resolveExamPhase(cse, dateAfter(31), NOW);

    expect(early.progressWithinPhase).toBeGreaterThanOrEqual(0);
    expect(early.progressWithinPhase).toBeLessThanOrEqual(1);
    expect(late.progressWithinPhase).toBeGreaterThan(early.progressWithinPhase);
  });

  it('ignores an unusable date string rather than crashing', () => {
    const result = resolveExamPhase(cse, 'not-a-date', NOW);
    expect(result.daysRemaining).toBe(0);
  });
});

describe('describeExamPhase', () => {
  it('describes the phase with a countdown', () => {
    expect(describeExamPhase(resolveExamPhase(cse, dateAfter(44), NOW))).toBe(
      'Accuracy Phase · 44 days left',
    );
  });

  it('uses the singular for one day', () => {
    expect(describeExamPhase(resolveExamPhase(cse, dateAfter(1), NOW))).toBe(
      'Final Review · 1 day left',
    );
  });

  it('reports exam day', () => {
    expect(describeExamPhase(resolveExamPhase(cse, dateAfter(0), NOW))).toBe(
      'Final Review · Exam day',
    );
  });

  it('omits the countdown when no date is set', () => {
    expect(describeExamPhase(resolveExamPhase(cse, null, NOW))).toBe('Flexible Study');
  });
});

describe('daysUntil', () => {
  it('counts whole days from today, ignoring the time of day', () => {
    const lateTonight = new Date('2026-10-05T23:30:00');
    expect(daysUntil('2026-10-15', lateTonight)).toBe(10);
  });

  it('handles a month boundary', () => {
    expect(daysUntil('2026-11-04', new Date('2026-10-30T08:00:00'))).toBe(5);
  });

  it('returns a negative number after the exam date', () => {
    expect(daysUntil('2026-10-01', NOW)).toBe(-4);
  });
});

describe('journeyTimeline', () => {
  it('lists phases from the longest horizon to the shortest', () => {
    expect(journeyTimeline(cse).map((phase) => phase.id)).toEqual([
      'foundation',
      'accuracy',
      'speed',
      'mock-week',
      'final-review',
    ]);
  });

  it('is driven entirely by config, so a different exam gets different phases', () => {
    const fixtureLike: ExamRuleConfig = {
      ...cse,
      studyPolicy: {
        ...cse.studyPolicy,
        journeyPhases: [
          { id: 'only', name: 'Only Phase', minDaysRemaining: 0, description: 'single' },
        ],
      },
    };

    expect(journeyTimeline(fixtureLike).map((phase) => phase.id)).toEqual(['only']);
    expect(resolveExamPhase(fixtureLike, dateAfter(300), NOW).phase.id).toBe('only');
  });
});
