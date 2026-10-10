import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { REMINDER_TIME_PRESETS, formatReminderTime } from '@/domain/notifications';
import { toAppError } from '@/domain/result';
import { deviceTimezone, saveAppSettings } from '@/services/app-settings';
import {
  createExpoNotificationScheduler,
  loadReminderState,
  syncStudyReminders,
  type NotificationPermission,
  type NotificationScheduler,
} from '@/services/notifications';

/**
 * Reminders.
 *
 * The toggle is the learner's preference; the permission belongs to the device.
 * Turning reminders on is the moment permission is earned and asked for, and every
 * change afterwards rebuilds the schedule from the stored plan rather than patching
 * it — so a changed study day, time or toggle can never leave an old reminder
 * behind. The scheduler is injectable so the whole flow is testable off-device.
 */

export type RemindersStatus = 'loading' | 'ready';

export interface RemindersDependencies {
  readonly scheduler?: NotificationScheduler;
}

export interface RemindersModel {
  readonly status: RemindersStatus;
  readonly enabled: boolean;
  readonly time: string;
  readonly timeLabel: string;
  readonly timeOptions: readonly { readonly value: string; readonly label: string }[];
  /** One honest line about what the device will actually do. */
  readonly message: string;
  readonly permission: NotificationPermission;
  readonly scheduled: number;
  readonly busy: boolean;
  readonly setEnabled: (enabled: boolean) => void;
  readonly setTime: (time: string) => void;
}

export const useReminders = (
  repositories: Repositories,
  dependencies: RemindersDependencies = {},
): RemindersModel => {
  const scheduler = useMemo(
    () => dependencies.scheduler ?? createExpoNotificationScheduler(),
    [dependencies.scheduler],
  );

  const [status, setStatus] = useState<RemindersStatus>('loading');
  const [enabled, setEnabledState] = useState(false);
  const [time, setTimeState] = useState('19:00');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [scheduled, setScheduled] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const state = await loadReminderState({ repositories, scheduler });
      setEnabledState(state.enabled);
      setTimeState(state.time);
      setMessage(state.message);
      setPermission(state.permission);
      setScheduled(state.scheduled);
    } catch (cause) {
      setMessage(toAppError(cause, 'Could not read your reminders.').message);
    } finally {
      setStatus('ready');
    }
  }, [repositories, scheduler]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const apply = useCallback(
    (patch: { readonly remindersEnabled?: boolean; readonly reminderTime?: string }) => {
      setBusy(true);
      void (async () => {
        try {
          await saveAppSettings(repositories, {
            ...patch,
            ...(patch.remindersEnabled === undefined
              ? {}
              : {
                  reminderTimezone: patch.remindersEnabled === true ? deviceTimezone() : undefined,
                }),
          });
          const sync = await syncStudyReminders({
            repositories,
            scheduler,
            requestPermission: patch.remindersEnabled === true,
          });
          setMessage(sync.message);
          setPermission(sync.permission);
          setScheduled(sync.scheduled);
        } catch (cause) {
          setMessage(toAppError(cause, 'Could not change your reminders.').message);
        } finally {
          setBusy(false);
          void load();
        }
      })();
    },
    [load, repositories, scheduler],
  );

  return {
    status,
    enabled,
    time,
    timeLabel: formatReminderTime(time),
    timeOptions: REMINDER_TIME_PRESETS.map((value) => ({
      value,
      label: formatReminderTime(value),
    })),
    message,
    permission,
    scheduled,
    busy,
    setEnabled: (value: boolean) => {
      setEnabledState(value);
      apply({ remindersEnabled: value });
    },
    setTime: (value: string) => {
      setTimeState(value);
      apply({ reminderTime: value });
    },
  };
};
