/**
 * Notifications.
 *
 * What a study reminder is, derived from the learner's own plan: a weekday, an hour
 * and a minute, and the copy that explains it. The service that talks to the device
 * lives in `services/notifications.ts`.
 */

export {
  DENIED_NOTE,
  FAILED_NOTE,
  INVALID_TIME_NOTE,
  NEEDS_PERMISSION_NOTE,
  NO_STUDY_DAYS_NOTE,
  OFF_NOTE,
  REMINDER_CHANNEL_ID,
  REMINDER_KIND,
  REMINDER_TITLE,
  REMINDER_TIME_PRESETS,
  buildReminderPlan,
  describeReminderDays,
  describeReminderPlan,
  expoWeekdayFor,
  formatReminderTime,
  parseReminderTime,
  reminderBody,
  type ReminderPlan,
  type ReminderPlanInput,
  type ReminderTime,
  type StudyReminder,
} from './schedule';
