import {
  clampDailyGoal,
  createOnboardingDraft,
  describeDaysUntil,
  describeExamDate,
  describeGoalPace,
  describeStudyDays,
  describeTrack,
  distinguishingSubjectName,
  firstActivityFor,
  isValidExamDate,
  nextStep,
  parseStudyDays,
  previousStep,
  stepIndex,
  stepIssue,
  toStepId,
  toggleStudyDay,
  withDailyGoal,
  withExamDate,
  withTrack,
} from '@/domain/onboarding';
import { addDaysToIso, buildWeeklyPlan, startOfWeek, toIsoDate } from '@/domain/study-plan';

import { loadCsePack, loadFixturePack } from '@tests/utils/exam-fixtures';

/**
 * Onboarding domain tests.
 *
 * The flow's meaning lives here, not in the screens: what a stored answer becomes
 * when reopened, how a custom goal is clamped, what the first activity is, and
 * what a week of study looks like. All of it is asserted against real bundled
 * content.
 */

const exam = () => loadCsePack().exam;

describe('draft creation', () => {
  it('starts from the exam defaults on a fresh install', () => {
    const draft = createOnboardingDraft({ exam: exam() });

    expect(draft).toMatchObject({
      account: 'guest',
      examId: 'cse',
      trackId: 'professional',
      startingPoint: 'reviewing',
      examDate: '',
      studyDays: [0, 2, 4, 5],
      sessionLength: 'regular',
      dailyGoal: 10,
      themePreference: 'device',
      textSize: 'standard',
      remindersEnabled: false,
    });
  });

  it('prefills every answer from a stored profile and settings row', () => {
    const draft = createOnboardingDraft({
      exam: exam(),
      trackId: 'subprofessional',
      startingPoint: 'beginner',
      examDate: '2026-11-15',
      studyDays: ['Mon', 'Sat'],
      sessionLength: 'long',
      dailyGoal: 30,
      themePreference: 'dark',
      textSize: 'extra-large',
      remindersEnabled: true,
    });

    expect(draft).toMatchObject({
      trackId: 'subprofessional',
      startingPoint: 'beginner',
      examDate: '2026-11-15',
      studyDays: [0, 5],
      sessionLength: 'long',
      dailyGoal: 30,
      themePreference: 'dark',
      textSize: 'extra',
      remindersEnabled: true,
    });
  });

  it('falls back to the exam default track for an unknown stored level', () => {
    const draft = createOnboardingDraft({ exam: exam(), trackId: 'not-a-track' });
    expect(draft.trackId).toBe('professional');
  });

  it('treats an empty stored day list as a flexible week, not as defaults', () => {
    expect(parseStudyDays([])).toEqual([]);
    expect(parseStudyDays(undefined)).toEqual([0, 2, 4, 5]);
  });

  it('parses day labels case-insensitively and drops unknown ones', () => {
    expect(parseStudyDays(['monday', 'WED', 'Sat', 'someday'])).toEqual([0, 2, 5]);
  });

  it('survives a malformed stored day list instead of taking the flow down', () => {
    // Rows are untrusted: a value written by a bad build, a partial import or a
    // hand-edited database must degrade to "no fixed days", never throw.
    expect(parseStudyDays([0, 2, 4, 5])).toEqual([]);
    expect(parseStudyDays([null, 'Wed', undefined, {}, ''])).toEqual([2]);
  });
});

describe('draft updates', () => {
  it('toggles study days in weekday order', () => {
    const draft = createOnboardingDraft({ exam: exam() });
    expect(toggleStudyDay(draft, 1).studyDays).toEqual([0, 1, 2, 4, 5]);
    expect(toggleStudyDay(draft, 0).studyDays).toEqual([2, 4, 5]);
  });

  it('clamps a custom goal into the allowed range', () => {
    expect(clampDailyGoal(2)).toBe(5);
    expect(clampDailyGoal(99)).toBe(50);
    expect(clampDailyGoal(17.6)).toBe(18);
    expect(clampDailyGoal(Number.NaN)).toBe(10);
    const draft = createOnboardingDraft({ exam: exam() });
    expect(withDailyGoal(draft, 35).dailyGoal).toBe(35);
  });

  it('normalises a slash-separated exam date and keeps unparseable input editable', () => {
    const draft = createOnboardingDraft({ exam: exam() });
    expect(withExamDate(draft, '2026/11/15').examDate).toBe('2026-11-15');
    expect(withExamDate(draft, 'next summer').examDate).toBe('next summer');
  });

  it('rejects an impossible calendar date', () => {
    expect(isValidExamDate('2026-02-28')).toBe(true);
    expect(isValidExamDate('2026-02-30')).toBe(false);
    expect(isValidExamDate('2026-2-3')).toBe(false);
  });

  it('switches tracks', () => {
    const draft = createOnboardingDraft({ exam: exam() });
    expect(withTrack(draft, 'subprofessional').trackId).toBe('subprofessional');
  });
});

describe('presenters', () => {
  it('describes study days with the approved separators', () => {
    expect(describeStudyDays([])).toBe('Flexible');
    expect(describeStudyDays([0, 2, 4, 5])).toBe('Mon · Wed · Fri · Sat');
  });

  it('formats an exam date for people and falls back for empty or partial input', () => {
    expect(describeExamDate('')).toBe('Not set');
    expect(describeExamDate('2026-11-15')).toBe('Nov 15, 2026');
    expect(describeExamDate('not-a-date')).toBe('not-a-date');
  });

  it('counts down to the exam date', () => {
    const now = new Date(2026, 9, 6, 9, 0, 0);
    expect(describeDaysUntil('2026-10-16', now)).toBe('10 days to go');
    expect(describeDaysUntil('2026-10-07', now)).toBe('1 day to go');
    expect(describeDaysUntil('2026-10-06', now)).toBe('Exam day');
    expect(describeDaysUntil('2026-10-01', now)).toBe('That date has already passed.');
    expect(describeDaysUntil('', now)).toBeNull();
  });

  it('uses the approved pace copy for the preset goals', () => {
    expect(describeGoalPace(5)).toBe('3–5 min');
    expect(describeGoalPace(10)).toBe('5–10 min');
    expect(describeGoalPace(20)).toBe('10–15 min');
  });

  it('derives the distinguishing subject and mock size per track', () => {
    const cse = exam();
    expect(distinguishingSubjectName(cse, 'professional')).toBe('Analytical Ability');
    expect(distinguishingSubjectName(cse, 'subprofessional')).toBe('Clerical Ability');
    expect(describeTrack(cse, 'professional')).toBe('Analytical Ability · 170-item mock');
    expect(describeTrack(cse, 'subprofessional')).toBe('Clerical Ability · 165-item mock');
  });

  it('names the first activity from the stated starting point', () => {
    const cse = exam();
    const base = createOnboardingDraft({ exam: cse });

    const beginner = firstActivityFor({ ...base, startingPoint: 'beginner', dailyGoal: 20 }, cse);
    expect(beginner).toMatchObject({
      mode: 'foundation-diagnostic',
      label: 'Foundation diagnostic',
      questionCount: 10,
    });
    expect(beginner.detail).toBe('10 questions · ~10 min');

    const reviewing = firstActivityFor({ ...base, startingPoint: 'reviewing' }, cse);
    expect(reviewing.mode).toBe('subject-diagnostic');
    expect(reviewing.label).toBe('Verbal Ability diagnostic');
    expect(reviewing.questionCount).toBe(10);

    const practice = firstActivityFor({ ...base, startingPoint: 'practice', dailyGoal: 5 }, cse);
    expect(practice).toMatchObject({ mode: 'smart-drill', label: 'Smart Drill', questionCount: 5 });
  });

  it('names a subject diagnostic per track', () => {
    const cse = exam();
    const base = createOnboardingDraft({ exam: cse, trackId: 'subprofessional' });
    expect(firstActivityFor(base, cse).label).toBe('Verbal Ability diagnostic');
  });
});

describe('step machine', () => {
  it('walks the eight approved steps in order', () => {
    expect(stepIndex('account')).toBe(0);
    expect(nextStep('account')).toBe('level');
    expect(nextStep('preferences')).toBe('done');
    expect(nextStep('done')).toBe('done');
    expect(previousStep('account')).toBe('account');
    expect(toStepId('schedule')).toBe('schedule');
    expect(toStepId('nonsense')).toBe('account');
  });

  it('accepts a blank exam date and a valid future date, rejects bad ones', () => {
    const now = new Date(2026, 9, 6, 9, 0, 0);
    const draft = createOnboardingDraft({ exam: exam() });

    expect(stepIssue(draft, 'starting-point', now)).toBeNull();
    expect(stepIssue(withExamDate(draft, '2026-12-01'), 'starting-point', now)).toBeNull();
    expect(stepIssue(withExamDate(draft, '2026-12-1'), 'starting-point', now)).toMatch(
      /YYYY-MM-DD/,
    );
    expect(stepIssue(withExamDate(draft, '2026-01-01'), 'starting-point', now)).toMatch(
      /already passed/,
    );
    expect(stepIssue({ ...draft, dailyGoal: 4 }, 'goal', now)).toMatch(/between 5 and 50/);
    expect(stepIssue({ ...draft, trackId: '' }, 'level', now)).toMatch(/level/);
    expect(stepIssue(draft, 'schedule', now)).toBeNull();
  });
});

describe('weekly plan generation', () => {
  const monday = new Date(2026, 9, 7, 10, 0, 0); // Wednesday 7 Oct 2026

  it('anchors the plan to the Monday of the week', () => {
    expect(startOfWeek(monday)).toBe('2026-10-05');
    expect(toIsoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(addDaysToIso('2026-10-05', 5)).toBe('2026-10-10');
  });

  it('schedules only the chosen days with the reviewing rhythm', () => {
    const cse = exam();
    const plan = buildWeeklyPlan(
      cse,
      {
        trackId: 'professional',
        startingPoint: 'reviewing',
        studyDays: [0, 2, 4, 5],
        dailyGoal: 10,
      },
      monday,
    );

    expect(plan.weekStart).toBe('2026-10-05');
    expect(plan.days.map((day) => day.day)).toEqual([
      '2026-10-05',
      '2026-10-07',
      '2026-10-09',
      '2026-10-10',
    ]);
    expect(plan.days.map((day) => day.tasks[0]?.kind)).toEqual([
      'review',
      'practice',
      'practice',
      'review',
    ]);
    expect(plan.days.every((day) => day.tasks[0]?.targetCount === 10)).toBe(true);
  });

  it('plans a full mock at the blueprint size for practice-ready learners', () => {
    const cse = exam();
    const plan = buildWeeklyPlan(
      cse,
      {
        trackId: 'subprofessional',
        startingPoint: 'practice',
        studyDays: [0, 2, 4, 5],
        dailyGoal: 20,
      },
      monday,
    );

    expect(plan.days.map((day) => day.tasks[0]?.kind)).toEqual([
      'practice',
      'practice',
      'mock',
      'review',
    ]);
    const mock = plan.days[2]?.tasks[0];
    expect(mock).toMatchObject({ kind: 'mock', label: 'Full mock', targetCount: 165 });
  });

  it('produces a flexible week with no tasks when no days are chosen', () => {
    const plan = buildWeeklyPlan(
      exam(),
      {
        trackId: 'professional',
        startingPoint: 'beginner',
        studyDays: [],
        dailyGoal: 10,
      },
      monday,
    );
    expect(plan.days).toEqual([]);
  });

  it('generates work for any validated exam without knowing which one it is', () => {
    const pack = loadFixturePack();
    const plan = buildWeeklyPlan(
      pack.exam,
      {
        trackId: pack.exam.defaultTrackId,
        startingPoint: 'beginner',
        studyDays: [0],
        dailyGoal: 5,
      },
      monday,
    );
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0]?.tasks[0]).toMatchObject({ kind: 'learn', targetCount: 5 });
  });
});
