import { STUDY_DAY_LABELS, parseStudyDays } from '@/domain/onboarding';

/**
 * Study reminders.
 *
 * A reminder is a small, exact fact: a weekday, an hour and a minute, on the days
 * the learner already chose. The whole schedule is derived from the stored plan
 * every time it is rebuilt — there is no incremental patching, and no schedule at
 * all when the learner has not chosen days or the time does not parse. Building it
 * here, pure, is what lets the copy and the triggers be asserted without a device.
 */

/** A 24-hour `HH:mm` reminder time. */
export interface ReminderTime {
  readonly hour: number;
  readonly minute: number;
}

/** `19:00` → 19:00. Anything not a real 24-hour time is `null`. */
export const parseReminderTime = (value: string): ReminderTime | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match === null) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

/** `19:00` → `7:00 PM`. Falls back to the raw value when it does not parse. */
export const formatReminderTime = (value: string): string => {
  const time = parseReminderTime(value);
  if (time === null) return value;
  const period = time.hour < 12 ? 'AM' : 'PM';
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${hour12}:${String(time.minute).padStart(2, '0')} ${period}`;
};

/** The times the settings screen offers, so nothing needs a picker dependency. */
export const REMINDER_TIME_PRESETS: readonly string[] = [
  '07:00',
  '12:00',
  '17:00',
  '19:00',
  '21:00',
];

/**
 * `expo-notifications` numbers weekdays 1 (Sunday) to 7 (Saturday), while the plan
 * numbers study days Monday-first. This is the one place the two meet.
 */
export const expoWeekdayFor = (studyDayIndex: number): number =>
  ((Math.max(0, Math.floor(studyDayIndex)) + 1) % 7) + 1;

export interface StudyReminder {
  /** Stable across rebuilds, so a replaced notification keeps its identity. */
  readonly id: string;
  /** The plan's own index: 0 is Monday. */
  readonly dayIndex: number;
  readonly dayLabel: string;
  /** What the OS scheduler needs. */
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
}

/** Identifies our reminders among anything else the device has scheduled. */
export const REMINDER_KIND = 'study-reminder';
export const REMINDER_TITLE = 'Time to study';
export const REMINDER_CHANNEL_ID = 'study-reminders';

export const reminderBody = (dailyGoal: number): string => {
  const goal = Math.max(0, Math.floor(dailyGoal));
  return goal > 0
    ? `Your ${goal}-question goal is waiting. One short session keeps the streak.`
    : 'A short session keeps the streak going.';
};

/**
 * `Mon, Wed, Fri and Sat` — prose for the reminder line. The settings screen's own
 * `describeStudyDays` writes a dot list for a meta column, so this is deliberately a
 * different sentence rather than a second copy of the same one.
 */
export const describeReminderDays = (studyDays: readonly number[]): string => {
  const labels = [...studyDays]
    .filter((index) => STUDY_DAY_LABELS[index] !== undefined)
    .sort((a, b) => a - b)
    .map((index) => STUDY_DAY_LABELS[index] ?? '');
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1] ?? ''}`;
};

export interface ReminderPlanInput {
  /** Labels as stored on the profile (`['Mon', 'Wed']`), or already-parsed indexes. */
  readonly studyDays: readonly string[];
  readonly reminderTime: string;
  readonly dailyGoal: number;
}

export interface ReminderPlan {
  readonly reminders: readonly StudyReminder[];
  readonly time: ReminderTime;
  readonly daySummary: string;
  /** `Mon, Wed, Fri and Sat at 7:00 PM` */
  readonly summary: string;
  readonly body: string;
}

/**
 * The whole schedule, or `null` when there is nothing honest to schedule: no study
 * days chosen, or a time that is not a time.
 */
export const buildReminderPlan = ({
  studyDays,
  reminderTime,
  dailyGoal,
}: ReminderPlanInput): ReminderPlan | null => {
  const time = parseReminderTime(reminderTime);
  if (time === null) return null;

  const indexes = [...new Set(parseStudyDays(studyDays))]
    .filter((index) => STUDY_DAY_LABELS[index] !== undefined)
    .sort((a, b) => a - b);
  if (indexes.length === 0) return null;

  const daySummary = describeReminderDays(indexes);
  return {
    reminders: indexes.map((dayIndex) => ({
      id: `${REMINDER_KIND}-${dayIndex}`,
      dayIndex,
      dayLabel: STUDY_DAY_LABELS[dayIndex] ?? '',
      weekday: expoWeekdayFor(dayIndex),
      hour: time.hour,
      minute: time.minute,
    })),
    time,
    daySummary,
    summary: `${daySummary} at ${formatReminderTime(reminderTime)}`,
    body: reminderBody(dailyGoal),
  };
};

/** `Reminds you Mon, Wed and Fri at 7:00 PM.` */
export const describeReminderPlan = (plan: ReminderPlan): string => `Reminds you ${plan.summary}.`;

export const NO_STUDY_DAYS_NOTE = 'Choose your study days to get a reminder.';
export const INVALID_TIME_NOTE = 'Choose a reminder time.';
export const OFF_NOTE = 'Reminders are off.';
export const DENIED_NOTE = 'Notifications are turned off for ReviewTayo in your device settings.';
export const NEEDS_PERMISSION_NOTE = 'Turn reminders on to allow notifications.';
export const FAILED_NOTE = 'Reminders could not be scheduled. They will be tried again.';
