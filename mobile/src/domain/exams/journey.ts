import type { ExamRuleConfig, JourneyPhase } from './types';

/**
 * CSE Journey phase derivation.
 *
 * The phase is always computed from the target exam date and the exam's own phase
 * definitions; it is never stored. Storing it would let the phase drift away from
 * the date and would freeze exam-config changes behind user data.
 */

export const DEFAULT_JOURNEY_PHASE: JourneyPhase = {
  id: 'flexible',
  name: 'Flexible Study',
  minDaysRemaining: 0,
  description: 'No target exam date set — study at your own pace.',
};

const MS_PER_DAY = 86_400_000;

/** Whole days from `now` to `examDate`, floored. Negative means the date passed. */
export const daysUntil = (examDate: string, now: Date = new Date()): number => {
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target.getTime() - startOfToday.getTime()) / MS_PER_DAY);
};

export interface ExamPhase {
  readonly phase: JourneyPhase;
  readonly daysRemaining: number | null;
  /** Fraction through the phase, used for the Progress journey timeline. */
  readonly progressWithinPhase: number;
  readonly isExamDayOrPast: boolean;
}

const orderedPhases = (exam: ExamRuleConfig): readonly JourneyPhase[] =>
  [...exam.studyPolicy.journeyPhases].sort((a, b) => b.minDaysRemaining - a.minDaysRemaining);

/**
 * Resolves the active phase. Phases are matched from the longest horizon down, so
 * a config may define any number of phases without code changes.
 */
export const resolveExamPhase = (
  exam: ExamRuleConfig,
  examDate: string | null,
  now: Date = new Date(),
): ExamPhase => {
  if (examDate === null || examDate.trim() === '') {
    return {
      phase: DEFAULT_JOURNEY_PHASE,
      daysRemaining: null,
      progressWithinPhase: 0,
      isExamDayOrPast: false,
    };
  }

  const daysRemaining = daysUntil(examDate, now);
  const phases = orderedPhases(exam);
  const active =
    phases.find((phase) => daysRemaining >= phase.minDaysRemaining) ??
    phases[phases.length - 1] ??
    DEFAULT_JOURNEY_PHASE;

  const higherBoundary =
    phases.find((phase) => phase.minDaysRemaining > active.minDaysRemaining)?.minDaysRemaining ??
    null;

  const progressWithinPhase =
    higherBoundary === null
      ? daysRemaining <= 0
        ? 1
        : Math.min(1, active.minDaysRemaining / Math.max(1, active.minDaysRemaining + 60))
      : Math.min(
          1,
          Math.max(
            0,
            (higherBoundary - daysRemaining) /
              Math.max(1, higherBoundary - active.minDaysRemaining),
          ),
        );

  return {
    phase: active,
    daysRemaining,
    progressWithinPhase,
    isExamDayOrPast: daysRemaining <= 0,
  };
};

/** Short human summary used on Home, e.g. "Accuracy Phase · 44 days left". */
export const describeExamPhase = (examPhase: ExamPhase): string => {
  if (examPhase.daysRemaining === null) return examPhase.phase.name;
  if (examPhase.daysRemaining <= 0) return `${examPhase.phase.name} · Exam day`;
  if (examPhase.daysRemaining === 1) return `${examPhase.phase.name} · 1 day left`;
  return `${examPhase.phase.name} · ${examPhase.daysRemaining} days left`;
};

/** All phases in presentation order (longest horizon first). */
export const journeyTimeline = (exam: ExamRuleConfig): readonly JourneyPhase[] =>
  orderedPhases(exam);
