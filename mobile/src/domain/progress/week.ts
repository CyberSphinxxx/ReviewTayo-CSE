import { STUDY_DAY_LABELS } from '@/domain/onboarding';
import { addDaysToIso, startOfWeek, toIsoDate } from '@/domain/study-plan';

/**
 * This week.
 *
 * Progress shows the week as seven bars, Monday first, matching the reference. Two
 * things are drawn from stored state rather than computed for looks: each bar is the
 * learner's own activity for that local day against their daily goal, and each bar
 * knows whether the learner planned to study that day — so a gap on a day they never
 * chose is not presented as a missed day.
 *
 * The weekly goal is the learner's own: their daily goal times the number of days they
 * said they would study. Nothing here invents a target for someone who has not set one.
 */

/** Monday-first single-letter labels for the bars. */
export const WEEK_BAR_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export const DAYS_IN_WEEK = 7;

/** One day of activity, structurally compatible with a stored activity row. */
export interface WeekActivityDay {
  /** Local `YYYY-MM-DD`. */
  readonly day: string;
  readonly questionsAnswered: number;
  readonly correctCount: number;
}

export interface WeekDay {
  readonly label: string;
  /** Local `YYYY-MM-DD`. */
  readonly day: string;
  readonly questions: number;
  readonly correct: number;
  /** 0–1 against the daily goal; `1` when the goal is met or exceeded. */
  readonly intensity: number;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  /** True when this was one of the learner's chosen study days. */
  readonly isPlanned: boolean;
}

export interface Week {
  readonly days: readonly WeekDay[];
  readonly questions: number;
  readonly correct: number;
  /** Days with at least one answer. */
  readonly studiedDays: number;
  /** The learner's chosen study days in this week. */
  readonly plannedDays: number;
  /** Chosen study days that have activity. */
  readonly plannedDaysMet: number;
  /** `dailyGoal × plannedDays`; `0` when there is no daily goal. */
  readonly target: number;
  /** 0–1 of the weekly target; `0` when there is no target. */
  readonly progress: number;
  readonly goalMet: boolean;
  /** `4 days studied · 63 questions` */
  readonly line: string;
  /** `3 of 5 study days` — empty when the learner has no chosen days. */
  readonly goalLine: string;
}

export interface WeekInput {
  readonly days: readonly WeekActivityDay[];
  readonly now: Date;
  readonly dailyGoal: number;
  /** The learner's chosen study days, as stored: `['Mon', 'Wed', 'Fri']`. */
  readonly studyDays: readonly string[];
}

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const buildWeek = ({ days, now, dailyGoal, studyDays }: WeekInput): Week => {
  const weekStart = startOfWeek(now);
  const today = toIsoDate(now);
  const goal = Math.max(0, Math.floor(dailyGoal));
  const byDay = new Map(days.map((entry) => [entry.day, entry]));
  const planned = new Set(
    studyDays
      .map((name) => STUDY_DAY_LABELS.indexOf(name as (typeof STUDY_DAY_LABELS)[number]))
      .filter((index) => index >= 0),
  );

  const weekDays: WeekDay[] = Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const day = addDaysToIso(weekStart, index);
    const activity = byDay.get(day);
    const questions = Math.max(0, activity?.questionsAnswered ?? 0);
    return {
      label: WEEK_BAR_LABELS[index] ?? '',
      day,
      questions,
      correct: Math.max(0, activity?.correctCount ?? 0),
      intensity: goal > 0 ? clamp01(questions / goal) : questions > 0 ? 1 : 0,
      isToday: day === today,
      isFuture: day > today,
      isPlanned: planned.has(index),
    };
  });

  const questions = weekDays.reduce((total, day) => total + day.questions, 0);
  const correct = weekDays.reduce((total, day) => total + day.correct, 0);
  const studiedDays = weekDays.filter((day) => day.questions > 0).length;
  const plannedDays = planned.size;
  const plannedDaysMet = weekDays.filter((day) => day.isPlanned && day.questions > 0).length;
  const target = goal * plannedDays;

  return {
    days: weekDays,
    questions,
    correct,
    studiedDays,
    plannedDays,
    plannedDaysMet,
    target,
    progress: target > 0 ? clamp01(questions / target) : 0,
    goalMet: target > 0 && questions >= target,
    line:
      studiedDays === 0
        ? 'No questions answered this week yet'
        : `${plural(studiedDays, 'day', 'days')} studied · ${plural(questions, 'question', 'questions')}`,
    goalLine: plannedDays > 0 ? `${plannedDaysMet} of ${plannedDays} study days` : '',
  };
};
