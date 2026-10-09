/**
 * Retry schedule.
 *
 * A failed delivery is not retried in a loop and not given up on after one try: it
 * is scheduled again with bounded exponential backoff and jitter, so a flaky
 * network drains itself and a hundred events failing together do not come back in
 * the same instant. The arithmetic lives here, pure, so the worker's timing can be
 * asserted exactly rather than slept through.
 */

export interface BackoffPolicy {
  /** Delay before the first retry, in seconds. */
  readonly baseSeconds: number;
  readonly factor: number;
  /** Ceiling for a single delay, in seconds. */
  readonly maxSeconds: number;
  /** Total attempts before an event is abandoned as dead. */
  readonly maxAttempts: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = {
  baseSeconds: 15,
  factor: 2,
  maxSeconds: 900,
  maxAttempts: 8,
};

/**
 * Seconds to wait before attempt `attempt + 1` (0 is the first retry).
 *
 * The delay is `min(maxSeconds, baseSeconds × factor^attempt)` with equal jitter —
 * between half and all of it — which keeps retries spread out without ever
 * exceeding the ceiling. `random` is injected so tests are deterministic.
 */
export const backoffSeconds = (
  attempt: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number => {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const ceiling = Math.min(policy.maxSeconds, policy.baseSeconds * policy.factor ** safeAttempt);
  const jittered = ceiling * (0.5 + random() * 0.5);
  return Math.max(1, Math.round(jittered));
};

/** The instant the next attempt is due. */
export const nextAttemptAt = (
  attempt: number,
  now: Date,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): string => new Date(now.getTime() + backoffSeconds(attempt, policy, random) * 1000).toISOString();

/** True when this failure is the event's last one and it should be left dead. */
export const isExhausted = (
  attemptCount: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
): boolean => attemptCount + 1 >= policy.maxAttempts;

/** `Retrying for up to 15 minutes.` — for the settings row and logs. */
export const describeBackoff = (policy: BackoffPolicy = DEFAULT_BACKOFF): string => {
  const minutes = Math.round(policy.maxSeconds / 60);
  const window = minutes >= 60 ? `${Math.round(minutes / 60)} hour` : `${minutes} minutes`;
  return `Retries for up to ${window}, ${policy.maxAttempts} times in all.`;
};
