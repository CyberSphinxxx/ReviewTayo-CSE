import { formatClock } from '@/domain/exams';

/**
 * A mock exam in progress.
 *
 * The runner needs three things from the domain and nothing else: where the learner is
 * inside the paper, how much of the clock is left, and whether a question is marked for
 * review. Everything is derived from the stored items and the session's own deadline,
 * so closing the app, backgrounding it or pausing all come back to the same numbers.
 *
 * Time is read from a stored deadline rather than counted down in a component (the same
 * rule timed practice follows, D-038): a throttled timer or a backgrounded app cannot
 * silently gift the learner extra minutes, and an examination that runs out of time is a
 * result, not a crash.
 */

/** Marks for one question of the paper, structurally compatible with a stored item. */
export interface MockItemState {
  readonly questionId: string;
  readonly position: number;
  readonly chosenChoiceId: string | null;
  readonly isCorrect: boolean | null;
  readonly flagged: boolean;
}

/** The session's own timing fields; the structural subset the clock needs. */
export interface MockClock {
  readonly expiresAt: string;
  readonly pausedAt: string | null;
  readonly remainingSeconds: number | null;
}

/** Below five minutes the header starts warning; the paper is nearly over. */
export const MOCK_LOW_TIME_SECONDS = 300;

export const isAnswered = (item: MockItemState): boolean => item.chosenChoiceId !== null;

export const answeredCount = (items: readonly MockItemState[]): number =>
  items.filter(isAnswered).length;

export const correctCount = (items: readonly MockItemState[]): number =>
  items.filter((item) => item.isCorrect === true).length;

export const flaggedCount = (items: readonly MockItemState[]): number =>
  items.filter((item) => item.flagged).length;

/**
 * Where a resumed paper should open: the first question without an answer, or the last
 * one when the learner has already reached the end.
 */
export const firstUnansweredIndex = (items: readonly MockItemState[]): number => {
  const index = items.findIndex((item) => !isAnswered(item));
  return index === -1 ? Math.max(0, items.length - 1) : index;
};

/** `12 of 170 answered` */
export const describeMockProgress = (items: readonly MockItemState[]): string =>
  `${answeredCount(items)} of ${items.length} answered`;

/** `3 marked for review` / `No questions marked` */
export const describeMockFlagged = (items: readonly MockItemState[]): string => {
  const count = flaggedCount(items);
  return count === 0 ? 'No questions marked' : `${count} marked for review`;
};

/**
 * Seconds left on the paper.
 *
 * A paused paper is not running, so its stored remainder is the answer; an unpaused one
 * is read against its deadline. A negative result is clamped to zero, which is what makes
 * a paper left open past its deadline expire rather than resume with time it never had.
 */
export const remainingSeconds = (session: MockClock, now: Date): number => {
  if (session.pausedAt !== null) return Math.max(0, Math.floor(session.remainingSeconds ?? 0));
  const expires = Date.parse(session.expiresAt);
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.floor((expires - now.getTime()) / 1000));
};

/** True when an unpaused paper has run out of time and must be submitted. */
export const isExpired = (session: MockClock, now: Date): boolean =>
  session.pausedAt === null && remainingSeconds(session, now) <= 0;

/** `2:59:00` — the exam's own clock format. */
export const describeRemaining = (seconds: number): string => formatClock(seconds);

export const isLowOnTime = (seconds: number): boolean => seconds <= MOCK_LOW_TIME_SECONDS;

/** `1h 20m left` for the setup screen's copy. */
export const describeRemainingRough = (seconds: number): string => {
  const minutes = Math.ceil(Math.max(0, seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m left`;
  if (rest === 0) return `${hours}h left`;
  return `${hours}h ${rest}m left`;
};
