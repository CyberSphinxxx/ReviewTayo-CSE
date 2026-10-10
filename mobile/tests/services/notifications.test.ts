import * as Notifications from 'expo-notifications';

import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import { createMigratedDatabase } from '@tests/utils/database';
import {
  createExpoNotificationScheduler,
  loadReminderState,
  syncStudyReminders,
  type NotificationPermission,
  type NotificationScheduler,
  type ScheduledHandle,
  type WeeklyReminderRequest,
} from '@/services/notifications';

/**
 * Study reminders.
 *
 * A reminder is a promise about the future, so the rules here are strict: nothing
 * is scheduled without the learner's own days and time, permission is only asked
 * for at the point it was earned, a denied permission is reported rather than
 * ignored, and only this app's reminders are ever cancelled — a schedule rebuilt
 * cannot touch anything else on the device.
 */

const COMPLETED_AT = '2026-09-01T00:00:00.000Z';

interface FakeScheduler extends NotificationScheduler {
  readonly scheduled: WeeklyReminderRequest[];
  readonly cancelled: string[];
  readonly requests: number;
  setPermission(permission: NotificationPermission): void;
  setExisting(handles: readonly ScheduledHandle[]): void;
}

const fakeScheduler = (
  options: {
    readonly permission?: NotificationPermission;
    readonly grantOnRequest?: NotificationPermission;
    readonly existing?: readonly ScheduledHandle[];
    readonly failOnSchedule?: boolean;
  } = {},
): FakeScheduler => {
  let permission: NotificationPermission = options.permission ?? 'granted';
  let existing: ScheduledHandle[] = [...(options.existing ?? [])];
  const scheduled: WeeklyReminderRequest[] = [];
  const cancelled: string[] = [];
  const state = { requests: 0 };

  return {
    isSupported: true,
    scheduled,
    cancelled,
    get requests() {
      return state.requests;
    },
    setPermission(next) {
      permission = next;
    },
    setExisting(handles) {
      existing = [...handles];
    },
    getPermission: async () => permission,
    requestPermission: async () => {
      state.requests += 1;
      permission = options.grantOnRequest ?? 'granted';
      return permission;
    },
    ensureChannel: async () => undefined,
    listScheduled: async () => existing,
    cancel: async (identifier) => {
      cancelled.push(identifier);
      existing = existing.filter((handle) => handle.identifier !== identifier);
    },
    scheduleWeekly: async (request) => {
      if (options.failOnSchedule === true) throw new Error('the OS refused');
      scheduled.push(request);
      return request.identifier;
    },
  };
};

describe('reminder sync', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
    await repositories.profile.save({
      examId: 'cse',
      trackId: 'professional',
      startingPoint: 'reviewing',
      examDate: null,
      studyDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      sessionLength: 'regular',
      dailyGoal: 10,
      onboardingCompletedAt: COMPLETED_AT,
      createdAt: COMPLETED_AT,
      updatedAt: COMPLETED_AT,
    });
    await repositories.settings.save({
      themePreference: 'light',
      textSize: 'standard',
      remindersEnabled: false,
      reminderTime: '19:00',
      reminderTimezone: 'Asia/Manila',
      updatedAt: COMPLETED_AT,
    });
  });

  afterEach(async () => {
    await db.close();
  });

  const enable = async (reminderTime = '19:00') => {
    const settings = await repositories.settings.get();
    if (settings === null) throw new Error('missing settings');
    await repositories.settings.save({ ...settings, remindersEnabled: true, reminderTime });
  };

  it('schedules one reminder per study day at the learner’s own time', async () => {
    await enable();
    const scheduler = fakeScheduler();

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync.status).toBe('scheduled');
    expect(sync.scheduled).toBe(4);
    expect(sync.message).toBe('Reminds you Mon, Wed, Fri and Sat at 7:00 PM.');
    expect(scheduler.scheduled.map((request) => request.weekday)).toEqual([2, 4, 6, 7]);
    expect(scheduler.scheduled.map((request) => request.identifier)).toEqual([
      'study-reminder-0',
      'study-reminder-2',
      'study-reminder-4',
      'study-reminder-5',
    ]);
    expect(scheduler.scheduled[0]).toMatchObject({
      hour: 19,
      minute: 0,
      title: 'Time to study',
      data: { kind: 'study-reminder', day: 0 },
    });
    expect(scheduler.scheduled[0]?.body).toContain('10-question goal');
  });

  it('does nothing while reminders are off, and clears anything it left behind', async () => {
    const scheduler = fakeScheduler({
      existing: [{ identifier: 'study-reminder-0', kind: 'study-reminder' }],
    });

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync).toMatchObject({ status: 'off', scheduled: 0 });
    expect(scheduler.scheduled).toHaveLength(0);
    expect(scheduler.cancelled).toEqual(['study-reminder-0']);
    expect(scheduler.requests).toBe(0);
  });

  it('rebuilds the schedule rather than patching it, and only touches its own reminders', async () => {
    await enable();
    const scheduler = fakeScheduler({
      existing: [
        { identifier: 'study-reminder-0', kind: 'study-reminder' },
        { identifier: 'study-reminder-1', kind: 'study-reminder' },
        { identifier: 'someone-elses-alarm', kind: 'other' },
      ],
    });

    await syncStudyReminders({ repositories, scheduler });

    expect(scheduler.cancelled).toEqual(['study-reminder-0', 'study-reminder-1']);
    expect(scheduler.cancelled).not.toContain('someone-elses-alarm');
    expect(scheduler.scheduled).toHaveLength(4);
  });

  it('asks for permission only where it was earned', async () => {
    await enable();
    const scheduler = fakeScheduler({ permission: 'undetermined' });

    const withoutRequest = await syncStudyReminders({ repositories, scheduler });
    expect(withoutRequest.status).toBe('needs-permission');
    expect(scheduler.requests).toBe(0);
    expect(scheduler.scheduled).toHaveLength(0);

    const withRequest = await syncStudyReminders({
      repositories,
      scheduler,
      requestPermission: true,
    });
    expect(scheduler.requests).toBe(1);
    expect(withRequest.status).toBe('scheduled');
  });

  it('reports a denied permission instead of quietly doing nothing', async () => {
    await enable();
    const scheduler = fakeScheduler({ permission: 'denied' });

    const sync = await syncStudyReminders({ repositories, scheduler, requestPermission: true });

    expect(sync.status).toBe('denied');
    expect(sync.message).toContain('turned off for ReviewTayo');
    expect(scheduler.requests).toBe(0);
    expect(scheduler.scheduled).toHaveLength(0);
  });

  it('keeps the preference but reports a refusal to grant it', async () => {
    await enable();
    const scheduler = fakeScheduler({
      permission: 'undetermined',
      grantOnRequest: 'denied',
    });

    const sync = await syncStudyReminders({ repositories, scheduler, requestPermission: true });

    expect(sync.status).toBe('denied');
    expect((await repositories.settings.get())?.remindersEnabled).toBe(true);
  });

  it('needs the learner’s days before it can schedule anything', async () => {
    await enable();
    const profile = await repositories.profile.get();
    if (profile === null) throw new Error('missing profile');
    await repositories.profile.save({ ...profile, studyDays: [] });
    const scheduler = fakeScheduler();

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync.status).toBe('needs-days');
    expect(sync.message).toBe('Choose your study days to get a reminder.');
    expect(scheduler.scheduled).toHaveLength(0);
  });

  it('says which piece is missing when the stored time is not a time', async () => {
    await enable('evening');
    const scheduler = fakeScheduler();

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync.status).toBe('needs-time');
    expect(sync.message).toBe('Choose a reminder time.');
  });

  it('never throws when the device refuses to schedule', async () => {
    await enable();
    const scheduler = fakeScheduler({ failOnSchedule: true });

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync.status).toBe('failed');
    expect(sync.message).toContain('will be tried again');
  });

  it('follows the learner when the time or the days change', async () => {
    await enable();
    const scheduler = fakeScheduler();
    await syncStudyReminders({ repositories, scheduler });
    expect(scheduler.scheduled).toHaveLength(4);

    const settings = await repositories.settings.get();
    const profile = await repositories.profile.get();
    if (settings === null || profile === null) throw new Error('missing state');
    await repositories.settings.save({ ...settings, reminderTime: '07:30' });
    await repositories.profile.save({ ...profile, studyDays: ['Tue', 'Thu'] });
    scheduler.scheduled.length = 0;

    const sync = await syncStudyReminders({ repositories, scheduler });

    expect(sync.status).toBe('scheduled');
    expect(sync.message).toBe('Reminds you Tue and Thu at 7:30 AM.');
    expect(scheduler.scheduled.map((request) => request.weekday)).toEqual([3, 5]);
    expect(
      scheduler.scheduled.every((request) => request.hour === 7 && request.minute === 30),
    ).toBe(true);
  });

  it('reads the state without moving anything', async () => {
    await enable();
    const scheduler = fakeScheduler({
      existing: [{ identifier: 'study-reminder-0', kind: 'study-reminder' }],
    });

    const state = await loadReminderState({ repositories, scheduler });

    expect(state).toMatchObject({
      enabled: true,
      status: 'scheduled',
      scheduled: 1,
      permission: 'granted',
      time: '19:00',
    });
    expect(state.message).toContain('Mon, Wed, Fri and Sat at 7:00 PM');
    expect(scheduler.scheduled).toHaveLength(0);
    expect(scheduler.cancelled).toHaveLength(0);
  });

  it('reads an off, unasked or blocked reminder honestly', async () => {
    const off = await loadReminderState({ repositories, scheduler: fakeScheduler() });
    expect(off).toMatchObject({ enabled: false, status: 'off', scheduled: 0 });

    await enable();
    const unasked = await loadReminderState({
      repositories,
      scheduler: fakeScheduler({ permission: 'undetermined' }),
    });
    expect(unasked.status).toBe('needs-permission');
    expect(unasked.message).toBe('Turn reminders on to allow notifications.');

    const blocked = await loadReminderState({
      repositories,
      scheduler: fakeScheduler({ permission: 'denied' }),
    });
    expect(blocked.status).toBe('denied');
  });
});

describe('expo notifications adapter', () => {
  const schedule = jest.spyOn(Notifications, 'scheduleNotificationAsync');
  const listAll = jest.spyOn(Notifications, 'getAllScheduledNotificationsAsync');
  const cancelOne = jest.spyOn(Notifications, 'cancelScheduledNotificationAsync');

  beforeEach(() => {
    jest.clearAllMocks();
    listAll.mockResolvedValue([]);
    cancelOne.mockResolvedValue(undefined);
    schedule.mockResolvedValue('notification-id');
  });

  it('schedules a weekly trigger in the OS’s own numbering', async () => {
    const scheduler = createExpoNotificationScheduler();

    const identifier = await scheduler.scheduleWeekly({
      identifier: 'study-reminder-0',
      weekday: 2,
      hour: 19,
      minute: 0,
      title: 'Time to study',
      body: 'Your 10-question goal is waiting.',
      data: { kind: 'study-reminder', day: 0 },
    });

    expect(identifier).toBe('notification-id');
    expect(schedule).toHaveBeenCalledWith({
      identifier: 'study-reminder-0',
      content: {
        title: 'Time to study',
        body: 'Your 10-question goal is waiting.',
        data: { kind: 'study-reminder', day: 0 },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId: 'study-reminders',
        weekday: 2,
        hour: 19,
        minute: 0,
      },
    });
  });

  it('marks the scheduled notifications that belong to this app', async () => {
    listAll.mockResolvedValue([
      { identifier: 'study-reminder-0', content: { data: { kind: 'study-reminder' } } },
      { identifier: 'other', content: { data: null } },
    ] as unknown as Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>);

    const scheduler = createExpoNotificationScheduler();

    expect(await scheduler.listScheduled()).toEqual([
      { identifier: 'study-reminder-0', kind: 'study-reminder' },
      { identifier: 'other', kind: null },
    ]);

    await scheduler.cancel('study-reminder-0');
    expect(cancelOne).toHaveBeenCalledWith('study-reminder-0');
  });

  it('never throws when the platform does not answer', async () => {
    listAll.mockRejectedValue(new Error('no native module'));
    cancelOne.mockRejectedValue(new Error('no native module'));

    const scheduler = createExpoNotificationScheduler();

    expect(await scheduler.listScheduled()).toEqual([]);
    await expect(scheduler.cancel('anything')).resolves.toBeUndefined();
  });

  it('reports permission as the device states it', async () => {
    const permissions = jest.spyOn(Notifications, 'getPermissionsAsync');
    const request = jest.spyOn(Notifications, 'requestPermissionsAsync');
    const scheduler = createExpoNotificationScheduler();

    permissions.mockResolvedValue({ status: 'granted' } as Awaited<
      ReturnType<typeof Notifications.getPermissionsAsync>
    >);
    expect(await scheduler.getPermission()).toBe('granted');

    permissions.mockResolvedValue({ status: 'undetermined' } as Awaited<
      ReturnType<typeof Notifications.getPermissionsAsync>
    >);
    expect(await scheduler.getPermission()).toBe('undetermined');

    permissions.mockRejectedValue(new Error('no native module'));
    expect(await scheduler.getPermission()).toBe('undetermined');

    request.mockResolvedValue({ status: 'denied' } as Awaited<
      ReturnType<typeof Notifications.requestPermissionsAsync>
    >);
    expect(await scheduler.requestPermission()).toBe('denied');
  });
});
