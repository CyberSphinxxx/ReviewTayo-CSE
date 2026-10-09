import {
  DEFAULT_JOURNEY_PHASE,
  describeExamPhase,
  journeyTimeline,
  resolveExamPhase,
} from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';

/**
 * The CSE Journey, as Progress draws it.
 *
 * The phase itself is never stored — `domain/exams` derives it from the exam date —
 * and this module does the one thing a screen needs on top of that: it walks the
 * exam's own phase list in presentation order and marks which stops are behind the
 * learner, which one they are on, and which are still ahead. A phase list is content,
 * so an exam with three phases or seven gets a correct timeline without a code change.
 */

export type JourneyStatus = 'done' | 'current' | 'upcoming';

export interface JourneyStop {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: JourneyStatus;
}

export interface Journey {
  readonly stops: readonly JourneyStop[];
  /** The id of the active stop, or `null` when no exam date places the learner. */
  readonly activeId: string | null;
  readonly activeName: string | null;
  /** `Accuracy Phase · 44 days left`, or the nudge to set a date. */
  readonly line: string;
  readonly daysRemaining: number | null;
}

export const NO_EXAM_DATE_LINE = 'Set your exam date to see where you are.';

export interface JourneyInput {
  readonly exam: ExamRuleConfig;
  readonly examDate: string | null;
  readonly now: Date;
}

export const journeyProgress = ({ exam, examDate, now }: JourneyInput): Journey => {
  const resolved = resolveExamPhase(exam, examDate, now);
  const timeline = journeyTimeline(exam);
  const activeIndex = timeline.findIndex((phase) => phase.id === resolved.phase.id);
  const hasDate = resolved.daysRemaining !== null;

  const stops: JourneyStop[] = timeline.map((phase, index) => ({
    id: phase.id,
    name: phase.name,
    description: phase.description,
    status:
      activeIndex === -1
        ? 'upcoming'
        : index < activeIndex
          ? 'done'
          : index === activeIndex
            ? 'current'
            : 'upcoming',
  }));

  const active = stops.find((stop) => stop.status === 'current') ?? null;

  return {
    stops,
    activeId: active?.id ?? null,
    activeName: active?.name ?? null,
    line:
      hasDate || resolved.phase.id !== DEFAULT_JOURNEY_PHASE.id
        ? describeExamPhase(resolved)
        : NO_EXAM_DATE_LINE,
    daysRemaining: resolved.daysRemaining,
  };
};
