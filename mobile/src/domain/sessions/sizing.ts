/**
 * Session sizing.
 *
 * Every mode is sized to what the learner said they can do, capped by the exam's own
 * policy — never by a number this file invents. Duration estimates are deliberately
 * rough and derived from a single constant, so the copy reads honestly ("about")
 * rather than pretending to a precision the app does not have.
 *
 * Shared by Home (which recommends a drill) and Practice (which offers one), so the
 * two can never disagree about how long ten questions take.
 */

/** Planning estimate: a CSE-style drill question takes about a minute. */
export const MINUTES_PER_DRILL_QUESTION = 1;
/** Review items are quicker than a fresh drill question. */
export const MINUTES_PER_REVIEW_ITEM = 0.5;

export interface SessionSpec {
  readonly count: number;
  readonly minutes: number;
  /** The one-line meta Home shows beside the action. */
  readonly meta: string;
}

export interface SessionPolicy {
  readonly drillSize: number;
  readonly dailyQuestionMinutes: number;
  readonly review: { readonly dailyDueLimit: number };
}

export const describeDuration = (minutes: number): string =>
  minutes <= 1 ? '1 minute' : `~${minutes} min`;

const spec = (count: number, minutes: number, unit: 'questions' | 'items'): SessionSpec => ({
  count,
  minutes,
  meta: `${count} ${unit} · ${describeDuration(minutes)}`,
});

/** The Smart Drill: the learner's daily goal, capped at the exam's drill size. */
export const smartDrillSpec = (dailyGoal: number, policy: SessionPolicy): SessionSpec => {
  const cap = Math.max(1, policy.drillSize);
  const goal = Number.isFinite(dailyGoal) ? Math.round(dailyGoal) : cap;
  const count = Math.min(cap, Math.max(1, goal));
  return spec(count, Math.max(1, Math.round(count * MINUTES_PER_DRILL_QUESTION)), 'questions');
};

/** Review Due: what is actually waiting, capped at the exam's daily due limit. */
export const reviewDueSpec = (dueCount: number, policy: SessionPolicy): SessionSpec => {
  const waiting = Math.max(0, Math.round(dueCount));
  const count = Math.min(waiting, Math.max(1, policy.review.dailyDueLimit));
  return spec(count, Math.max(1, Math.ceil(count * MINUTES_PER_REVIEW_ITEM)), 'items');
};

/** The Daily Question is a single question; the exam config owns its duration. */
export const dailyQuestionSpec = (policy: SessionPolicy): { readonly meta: string } => ({
  meta: describeDuration(Math.max(1, policy.dailyQuestionMinutes)),
});

/** The resume card's progress line, e.g. `83 / 170`. */
export const describeResumeProgress = (answeredCount: number, totalCount: number): string =>
  `${Math.max(0, answeredCount)} / ${Math.max(1, totalCount)}`;
