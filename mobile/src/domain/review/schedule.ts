import { toIsoDate } from '@/domain/study-plan';
import type { ConceptId, ReviewPolicy } from '@/domain/exams/types';

/**
 * Review scheduling.
 *
 * The arithmetic behind Again and Got it, in one place. An answer that comes back
 * correct in practice and a card the learner says "Got it" to are the same event as far
 * as the schedule is concerned, so the two callers — the answer writer in
 * `services/practice` and the review deck — must not each carry their own copy of it.
 * A learner who reviews a concept in the deck and answers it in a drill a minute later
 * has one due date, not two.
 *
 * Intervals come from the exam's own `ReviewPolicy`: `gotItIntervalDays` is a ladder
 * indexed by mastery, so a concept the learner is strong on is asked again far less
 * often than one they are still learning. The arithmetic is pure and every input is
 * passed in, which is what makes "Again then Got it then leave it a week" testable.
 */

/** What the learner said about a card. */
export type ReviewOutcome = 'again' | 'got-it';

/**
 * A scheduled item, structurally.
 *
 * The domain takes the shape it needs rather than the repository's row type, exactly as
 * mastery evidence does: a stored item can be passed straight in, and the schedule can
 * be reasoned about — and tested — without a database.
 */
export interface ScheduledReviewItem {
  readonly id: string;
  readonly conceptId: ConceptId;
  readonly dueAt: string;
  readonly intervalDays: number;
  readonly lapses: number;
  readonly reviews: number;
  readonly lastReviewedAt: string | null;
}

export interface ReviewSchedule {
  readonly intervalDays: number;
  readonly dueAt: string;
  /** The mastery rung the interval was taken from. */
  readonly easeLevel: number;
  readonly lapses: number;
  readonly reviews: number;
}

export const MS_PER_DAY = 86_400_000;

/** An ISO timestamp `days` local days from `now`; never in the past. */
export const isoDaysFromNow = (now: Date, days: number): string =>
  new Date(now.getTime() + Math.max(0, days) * MS_PER_DAY).toISOString();

/**
 * The interval a `Got it` earns at this mastery level.
 *
 * Past the end of the ladder the longest interval stands rather than falling back to
 * the shortest: a policy with three rungs and a learner on the top one should space
 * their work out further, not treat them like a beginner.
 */
export const gotItIntervalDays = (policy: ReviewPolicy, levelIndex: number): number => {
  const intervals = policy.gotItIntervalDays;
  if (intervals.length === 0) return Math.max(0, policy.againIntervalDays);
  const index = Math.max(0, Math.min(Math.floor(levelIndex), intervals.length - 1));
  const interval = intervals[index];
  return interval === undefined ? Math.max(0, policy.againIntervalDays) : Math.max(0, interval);
};

export interface ScheduleInput {
  readonly policy: ReviewPolicy;
  readonly outcome: ReviewOutcome;
  /** The concept's mastery rank; it picks the rung of the interval ladder. */
  readonly levelIndex: number;
  /** Reviews completed so far; `0` for a card that has never been reviewed. */
  readonly reviews?: number;
  /** Lapses so far; `0` for a card that has never been missed. */
  readonly lapses?: number;
  readonly now: Date;
}

export const RELEASE_AGAIN: ReviewOutcome = 'again';
export const RELEASE_GOT_IT: ReviewOutcome = 'got-it';

/**
 * The next schedule for a card.
 *
 * A lapse is counted, a review is counted, and only a lapse resets the interval —
 * saying "Again" is the learner telling us the concept did not stick, and the policy's
 * own `againIntervalDays` is how long the app waits before asking again.
 */
export const nextReviewSchedule = ({
  policy,
  outcome,
  levelIndex,
  reviews = 0,
  lapses = 0,
  now,
}: ScheduleInput): ReviewSchedule => {
  const intervalDays =
    outcome === 'again'
      ? Math.max(0, policy.againIntervalDays)
      : gotItIntervalDays(policy, levelIndex);

  return {
    intervalDays,
    dueAt: isoDaysFromNow(now, intervalDays),
    easeLevel: Math.max(0, Math.floor(levelIndex)),
    lapses: Math.max(0, Math.floor(lapses)) + (outcome === 'again' ? 1 : 0),
    reviews: Math.max(0, Math.floor(reviews)) + (outcome === 'got-it' ? 1 : 0),
  };
};

/** Whether a stored due date has arrived, compared as timestamps rather than days. */
export const isDueAt = (dueAtIso: string, nowIso: string): boolean => dueAtIso <= nowIso;

/** Local-calendar-day number of an instant, so "tomorrow" survives a clock change. */
const localDayNumber = (iso: string): number => {
  const [year, month, day] = toIsoDate(new Date(iso))
    .split('-')
    .map((part) => Number.parseInt(part, 10));
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / MS_PER_DAY;
};

/** Local calendar days from one instant's day to another's; negative going back. */
export const localDaysBetween = (fromIso: string, toIso: string): number =>
  Math.round(localDayNumber(toIso) - localDayNumber(fromIso));

/** Local days until the due date; `0` for today and negative when overdue. */
export const daysUntilDue = (dueAtIso: string, now: Date): number =>
  localDaysBetween(now.toISOString(), dueAtIso);

/** `Due today`, `Due tomorrow`, `Due in 5 days`, `Due in 2 weeks`. */
export const describeDueAt = (dueAtIso: string, now: Date): string => {
  const days = daysUntilDue(dueAtIso, now);
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due in ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? 'Due in a week' : `Due in ${weeks} weeks`;
};

/** `today`, `tomorrow`, `in 7 days` — what a schedule now says, said plainly. */
export const describeInterval = (intervalDays: number): string => {
  const days = Math.max(0, Math.round(intervalDays));
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};
