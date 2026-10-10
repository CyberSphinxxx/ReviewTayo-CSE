import {
  buildReminderPlan,
  describeReminderDays,
  describeReminderPlan,
  expoWeekdayFor,
  formatReminderTime,
  parseReminderTime,
  reminderBody,
} from '@/domain/notifications';

/**
 * Reminder schedule.
 *
 * The whole schedule is derived, so these tests are the schedule: the times that
 * are times, the weekday numbering the OS expects (Sunday is 1 there and Monday is
 * 0 here), and the honest `null` when there is nothing to remind anyone about.
 */

describe('reminder times', () => {
  it('reads a 24-hour time', () => {
    expect(parseReminderTime('19:00')).toEqual({ hour: 19, minute: 0 });
    expect(parseReminderTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseReminderTime(' 23:59 ')).toEqual({ hour: 23, minute: 59 });
  });

  it.each(['', '19', '19:0', '24:00', '19:60', '-1:00', 'seven', '19:00:00'])(
    'refuses %p as a time',
    (value) => {
      expect(parseReminderTime(value)).toBeNull();
    },
  );

  it('writes a 24-hour time as a 12-hour one', () => {
    expect(formatReminderTime('19:00')).toBe('7:00 PM');
    expect(formatReminderTime('07:05')).toBe('7:05 AM');
    expect(formatReminderTime('00:30')).toBe('12:30 AM');
    expect(formatReminderTime('12:00')).toBe('12:00 PM');
    expect(formatReminderTime('nonsense')).toBe('nonsense');
  });
});

describe('weekday numbering', () => {
  it('maps the plan’s Monday-first days onto the OS’s Sunday-first weeks', () => {
    expect(expoWeekdayFor(0)).toBe(2); // Monday
    expect(expoWeekdayFor(1)).toBe(3);
    expect(expoWeekdayFor(5)).toBe(7); // Saturday
    expect(expoWeekdayFor(6)).toBe(1); // Sunday
  });

  it('does not fall off the calendar for a nonsense index', () => {
    expect(expoWeekdayFor(-2)).toBe(2);
    expect(expoWeekdayFor(0.7)).toBe(2);
  });
});

describe('building the schedule', () => {
  it('returns one reminder per chosen study day, in week order', () => {
    const plan = buildReminderPlan({
      studyDays: ['Sat', 'Mon', 'Wed', 'Fri'],
      reminderTime: '19:00',
      dailyGoal: 10,
    });

    expect(plan).not.toBeNull();
    if (plan === null) return;
    expect(plan.reminders.map((reminder) => reminder.dayLabel)).toEqual([
      'Mon',
      'Wed',
      'Fri',
      'Sat',
    ]);
    expect(plan.reminders.map((reminder) => reminder.weekday)).toEqual([2, 4, 6, 7]);
    expect(plan.reminders.every((reminder) => reminder.hour === 19)).toBe(true);
    expect(plan.reminders[0]?.id).toBe('study-reminder-0');
    expect(plan.summary).toBe('Mon, Wed, Fri and Sat at 7:00 PM');
    expect(plan.body).toContain('10-question goal');
    expect(describeReminderPlan(plan)).toBe('Reminds you Mon, Wed, Fri and Sat at 7:00 PM.');
  });

  it('ignores duplicates, unknown labels and stray whitespace', () => {
    const plan = buildReminderPlan({
      studyDays: ['Wed', 'Wed', 'Nope', '  Mon '],
      reminderTime: '07:30',
      dailyGoal: 0,
    });

    expect(plan?.reminders.map((reminder) => reminder.dayLabel)).toEqual(['Mon', 'Wed']);
    expect(plan?.summary).toBe('Mon and Wed at 7:30 AM');
    expect(plan?.body).toContain('keeps the streak');
  });

  it('has no schedule without days or without a usable time', () => {
    expect(buildReminderPlan({ studyDays: [], reminderTime: '19:00', dailyGoal: 10 })).toBeNull();
    expect(
      buildReminderPlan({ studyDays: ['Mon'], reminderTime: 'evening', dailyGoal: 10 }),
    ).toBeNull();
  });

  it('writes a short list as a sentence', () => {
    expect(describeReminderDays([0])).toBe('Mon');
    expect(describeReminderDays([0, 2])).toBe('Mon and Wed');
    expect(describeReminderDays([0, 2, 4])).toBe('Mon, Wed and Fri');
    expect(describeReminderDays([])).toBe('');
  });

  it('names the learner’s own goal in the reminder', () => {
    expect(reminderBody(20)).toBe(
      'Your 20-question goal is waiting. One short session keeps the streak.',
    );
    expect(reminderBody(0)).toBe('A short session keeps the streak going.');
  });
});
