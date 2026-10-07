import { addDaysToIso } from '@/domain/study-plan';

import type { ActivityDay } from './types';

/**
 * Streak.
 *
 * The streak belongs to the learner, so it is measured from days they actually
 * answered something — never from days the app was opened. Today is allowed to be
 * empty: a streak is only broken once a whole day has been missed, so a learner who
 * studies every evening does not see their streak reset every morning.
 */

/** A ceiling on the walk back, so a corrupt day row cannot spin forever. */
const MAX_STREAK_DAYS = 3650;

export const studyDays = (days: readonly ActivityDay[]): ReadonlySet<string> =>
  new Set(days.filter((day) => day.questionsAnswered > 0).map((day) => day.day));

export const computeStreak = (days: readonly ActivityDay[], today: string): number => {
  const active = studyDays(days);
  let cursor = active.has(today) ? today : addDaysToIso(today, -1);
  let streak = 0;

  while (active.has(cursor) && streak < MAX_STREAK_DAYS) {
    streak += 1;
    cursor = addDaysToIso(cursor, -1);
  }

  return streak;
};
