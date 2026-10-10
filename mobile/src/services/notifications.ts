import * as Notifications from 'expo-notifications';

import type { Repositories } from '@/data/repositories';
import {
  buildReminderPlan,
  DENIED_NOTE,
  FAILED_NOTE,
  INVALID_TIME_NOTE,
  NEEDS_PERMISSION_NOTE,
  NO_STUDY_DAYS_NOTE,
  OFF_NOTE,
  REMINDER_CHANNEL_ID,
  REMINDER_KIND,
  REMINDER_TITLE,
  describeReminderPlan,
  parseReminderTime,
  type ReminderPlan,
} from '@/domain/notifications';
import { createLogger } from '@/services/logging/logger';

import { loadAppSettings } from './app-settings';

/**
 * Study reminders.
 *
 * One place decides whether a reminder should exist, cancels whatever this app
 * scheduled before, and rebuilds the schedule from the learner's current plan — so
 * changing a study day, a time or the toggle can never leave last week's reminder
 * behind. Permission is asked where it was earned (the moment reminders are turned
 * on), never at launch, and a denied permission is a state the screen reports rather
 * than a silent no-op (D-057, D-058).
 *
 * The scheduler is an interface: the app uses `expo-notifications`, and every
 * behaviour here is exercised against a fake, because a reminder is not something
 * a test device can sleep until.
 */

const log = createLogger('notifications');

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** One of this app's scheduled reminders, as the OS reports it. */
export interface ScheduledHandle {
  readonly identifier: string;
  /** Our own marker, so only our reminders are ever cancelled. */
  readonly kind: string | null;
}

export interface WeeklyReminderRequest {
  readonly identifier: string;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  readonly title: string;
  readonly body: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface NotificationScheduler {
  readonly isSupported: boolean;
  getPermission(): Promise<NotificationPermission>;
  requestPermission(): Promise<NotificationPermission>;
  ensureChannel(): Promise<void>;
  listScheduled(): Promise<readonly ScheduledHandle[]>;
  cancel(identifier: string): Promise<void>;
  /** Returns the OS identifier of the scheduled notification. */
  scheduleWeekly(request: WeeklyReminderRequest): Promise<string>;
}

const mapPermission = (status: string | undefined): NotificationPermission => {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      return 'undetermined';
  }
};

/** The real scheduler: local notifications only, no push infrastructure (D-057). */
export const createExpoNotificationScheduler = (): NotificationScheduler => ({
  isSupported: true,

  async getPermission() {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      return mapPermission(permissions.status);
    } catch (cause) {
      log.warn('could not read notification permission', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return 'undetermined';
    }
  },

  async requestPermission() {
    try {
      const permissions = await Notifications.requestPermissionsAsync();
      return mapPermission(permissions.status);
    } catch (cause) {
      log.warn('could not request notification permission', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return 'denied';
    }
  },

  async ensureChannel() {
    try {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Study reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch (cause) {
      // A missing channel is not fatal: the notification still schedules.
      log.warn('could not create the reminder channel', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },

  async listScheduled() {
    try {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      return requests.map((request) => {
        const data: unknown = request.content.data;
        const kind =
          typeof data === 'object' && data !== null && 'kind' in data
            ? String((data as { kind: unknown }).kind)
            : null;
        return { identifier: request.identifier, kind };
      });
    } catch (cause) {
      log.warn('could not list scheduled notifications', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return [];
    }
  },

  async cancel(identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (cause) {
      log.warn('could not cancel a reminder', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },

  async scheduleWeekly(request) {
    return Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: {
        title: request.title,
        body: request.body,
        data: { ...request.data },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: REMINDER_CHANNEL_ID,
        weekday: request.weekday,
        hour: request.hour,
        minute: request.minute,
      },
    });
  },
});

export type ReminderStatus =
  'scheduled' | 'off' | 'needs-days' | 'needs-time' | 'needs-permission' | 'denied' | 'failed';

export interface ReminderSync {
  readonly status: ReminderStatus;
  readonly scheduled: number;
  readonly permission: NotificationPermission;
  readonly plan: ReminderPlan | null;
  /** Safe to show a learner. */
  readonly message: string;
}

/** Why there is no plan: a time that is not a time, or no study days at all. */
const planlessStatus = (reminderTime: string): ReminderStatus =>
  parseReminderTime(reminderTime) === null ? 'needs-time' : 'needs-days';

const messageFor = (status: ReminderStatus, plan: ReminderPlan | null): string => {
  switch (status) {
    case 'scheduled':
      return plan === null ? OFF_NOTE : describeReminderPlan(plan);
    case 'needs-days':
      return NO_STUDY_DAYS_NOTE;
    case 'needs-time':
      return INVALID_TIME_NOTE;
    case 'needs-permission':
      return NEEDS_PERMISSION_NOTE;
    case 'denied':
      return DENIED_NOTE;
    case 'failed':
      return FAILED_NOTE;
    case 'off':
    default:
      return OFF_NOTE;
  }
};

/** Cancels ours and nothing else. */
const cancelOurReminders = async (scheduler: NotificationScheduler): Promise<void> => {
  const scheduled = await scheduler.listScheduled();
  for (const handle of scheduled) {
    if (handle.kind === REMINDER_KIND) await scheduler.cancel(handle.identifier);
  }
};

export interface SyncRemindersInput {
  readonly repositories: Repositories;
  readonly scheduler: NotificationScheduler;
  /** True only from the action that turned reminders on. */
  readonly requestPermission?: boolean;
}

/**
 * Brings the device's reminders in line with the stored preference and plan.
 *
 * Returns what happened rather than throwing: a screen can then say "off", "no days
 * chosen yet" or "blocked by your device" without the learner having to guess.
 */
export const syncStudyReminders = async ({
  repositories,
  scheduler,
  requestPermission = false,
}: SyncRemindersInput): Promise<ReminderSync> => {
  try {
    const [settings, profile] = await Promise.all([
      loadAppSettings(repositories),
      repositories.profile.get(),
    ]);

    if (!settings.remindersEnabled) {
      await cancelOurReminders(scheduler);
      return {
        status: 'off',
        scheduled: 0,
        permission: await scheduler.getPermission(),
        plan: null,
        message: OFF_NOTE,
      };
    }

    let permission = await scheduler.getPermission();
    if (permission === 'undetermined' && requestPermission) {
      permission = await scheduler.requestPermission();
    }
    if (permission !== 'granted') {
      await cancelOurReminders(scheduler);
      const status: ReminderStatus = permission === 'denied' ? 'denied' : 'needs-permission';
      return { status, scheduled: 0, permission, plan: null, message: messageFor(status, null) };
    }

    const plan = buildReminderPlan({
      studyDays: profile?.studyDays ?? [],
      reminderTime: settings.reminderTime,
      dailyGoal: profile?.dailyGoal ?? 0,
    });
    if (plan === null) {
      await cancelOurReminders(scheduler);
      const status = planlessStatus(settings.reminderTime);
      return { status, scheduled: 0, permission, plan: null, message: messageFor(status, null) };
    }

    await scheduler.ensureChannel();
    await cancelOurReminders(scheduler);
    for (const reminder of plan.reminders) {
      await scheduler.scheduleWeekly({
        identifier: reminder.id,
        weekday: reminder.weekday,
        hour: reminder.hour,
        minute: reminder.minute,
        title: REMINDER_TITLE,
        body: plan.body,
        data: { kind: REMINDER_KIND, day: reminder.dayIndex },
      });
    }

    return {
      status: 'scheduled',
      scheduled: plan.reminders.length,
      permission,
      plan,
      message: messageFor('scheduled', plan),
    };
  } catch (cause) {
    log.warn('reminder sync failed', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return {
      status: 'failed',
      scheduled: 0,
      permission: 'undetermined',
      plan: null,
      message: FAILED_NOTE,
    };
  }
};

export interface ReminderState extends ReminderSync {
  readonly enabled: boolean;
  /** The stored `HH:mm`, whether or not it produced a plan. */
  readonly time: string;
}

/**
 * What the settings row shows — read-only, so opening the screen never moves a
 * reminder it did not have to move.
 */
export const loadReminderState = async ({
  repositories,
  scheduler,
}: {
  readonly repositories: Repositories;
  readonly scheduler: NotificationScheduler;
}): Promise<ReminderState> => {
  const [settings, profile, permission, scheduled] = await Promise.all([
    loadAppSettings(repositories),
    repositories.profile.get(),
    scheduler.getPermission(),
    scheduler.listScheduled(),
  ]);

  const plan = buildReminderPlan({
    studyDays: profile?.studyDays ?? [],
    reminderTime: settings.reminderTime,
    dailyGoal: profile?.dailyGoal ?? 0,
  });
  const ours = scheduled.filter((handle) => handle.kind === REMINDER_KIND).length;

  const status: ReminderStatus = !settings.remindersEnabled
    ? 'off'
    : permission === 'denied'
      ? 'denied'
      : permission === 'undetermined'
        ? 'needs-permission'
        : plan === null
          ? planlessStatus(settings.reminderTime)
          : 'scheduled';

  return {
    enabled: settings.remindersEnabled,
    status,
    scheduled: ours,
    permission,
    plan,
    time: settings.reminderTime,
    message: messageFor(status, plan),
  };
};
