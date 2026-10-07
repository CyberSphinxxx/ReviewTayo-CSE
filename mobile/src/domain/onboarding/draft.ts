import { daysUntil, subjectsForTrack } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';
import { toTextSizePreference, toThemePreference } from '@/domain/preferences';
import type { TextSizePreference, ThemePreference } from '@/domain/preferences';

import {
  ACCOUNT_CHOICES,
  DEFAULT_DAILY_GOAL,
  DEFAULT_STUDY_DAYS,
  FIRST_ACTIVITY_MAX_QUESTIONS,
  FIRST_ACTIVITY_MINUTES,
  MAX_DAILY_GOAL,
  MIN_DAILY_GOAL,
  ONBOARDING_STEPS,
  SESSION_LENGTHS,
  SESSION_LENGTH_LABELS,
  STARTING_POINTS,
  STARTING_POINT_LABELS,
  STUDY_DAY_LABELS,
  type AccountChoice,
  type OnboardingDraft,
  type OnboardingStepId,
  type SessionLength,
  type StartingPoint,
} from './types';

/**
 * Draft operations.
 *
 * Every function here is pure: it takes a draft and returns a new one. That is what
 * lets the wizard be a thin rendering layer and lets the interesting behaviour —
 * clamping a custom goal, parsing stored values, judging whether a step may be
 * left — be tested without rendering anything.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

export const toStartingPoint = (
  value: unknown,
  fallback: StartingPoint = 'reviewing',
): StartingPoint =>
  (STARTING_POINTS as readonly string[]).includes(value as string)
    ? (value as StartingPoint)
    : fallback;

export const toSessionLength = (
  value: unknown,
  fallback: SessionLength = 'regular',
): SessionLength =>
  (SESSION_LENGTHS as readonly string[]).includes(value as string)
    ? (value as SessionLength)
    : fallback;

export const toAccountChoice = (
  value: unknown,
  fallback: AccountChoice = 'guest',
): AccountChoice =>
  (ACCOUNT_CHOICES as readonly string[]).includes(value as string)
    ? (value as AccountChoice)
    : fallback;

export const clampDailyGoal = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_GOAL;
  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(value)));
};

/**
 * Parses a stored study-day label (`Mon`, `Monday`, case-insensitive) to 0–6.
 * Stored rows are untrusted, so a non-string is rejected rather than coerced —
 * one bad row must not take the whole flow down.
 */
export const parseStudyDay = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  if (needle.length === 0) return null;
  const index = STUDY_DAY_LABELS.findIndex(
    (label) => label.toLowerCase() === needle || label.toLowerCase().startsWith(needle.slice(0, 3)),
  );
  return index === -1 ? null : index;
};

/** Parses stored study-day labels; unknown labels are dropped rather than guessed. */
export const parseStudyDays = (values: readonly unknown[] | undefined): readonly number[] => {
  if (values === undefined) return DEFAULT_STUDY_DAYS;
  const days = new Set<number>();
  for (const value of values) {
    const day = parseStudyDay(value);
    if (day !== null) days.add(day);
  }
  return [...days].sort((a, b) => a - b);
};

/** Stored form: three-letter labels, so a database row stays readable. */
export const studyDayLabelsFor = (days: readonly number[]): readonly string[] =>
  [...new Set(days)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b)
    .map((day) => STUDY_DAY_LABELS[day] ?? '');

// ---------------------------------------------------------------------------
// Draft construction and updates
// ---------------------------------------------------------------------------

/** Values read from an existing profile/settings pair, if any. */
export interface StoredOnboardingInput {
  readonly trackId?: string;
  readonly startingPoint?: string;
  readonly examDate?: string | null;
  readonly studyDays?: readonly unknown[];
  readonly sessionLength?: string;
  readonly dailyGoal?: number;
  readonly themePreference?: string;
  readonly textSize?: string;
  readonly remindersEnabled?: boolean;
  readonly account?: string;
}

export interface CreateDraftInput extends StoredOnboardingInput {
  readonly exam: ExamRuleConfig;
}

/**
 * Builds the draft a fresh flow opens with: the learner's stored answers where
 * they exist, the exam's own defaults where they do not.
 */
export const createOnboardingDraft = ({ exam, ...stored }: CreateDraftInput): OnboardingDraft => {
  const trackId = exam.tracks.some((track) => track.id === stored.trackId)
    ? (stored.trackId as string)
    : exam.defaultTrackId;

  return {
    account: toAccountChoice(stored.account),
    examId: exam.id,
    trackId,
    startingPoint: toStartingPoint(stored.startingPoint),
    examDate: normalizeExamDate(stored.examDate ?? ''),
    studyDays: parseStudyDays(stored.studyDays),
    sessionLength: toSessionLength(stored.sessionLength),
    dailyGoal: clampDailyGoal(stored.dailyGoal ?? DEFAULT_DAILY_GOAL),
    themePreference: toThemePreference(stored.themePreference),
    textSize: toTextSizePreference(stored.textSize),
    remindersEnabled: stored.remindersEnabled ?? false,
  };
};

export const withAccount = (draft: OnboardingDraft, account: AccountChoice): OnboardingDraft => ({
  ...draft,
  account,
});

export const withTrack = (draft: OnboardingDraft, trackId: string): OnboardingDraft => ({
  ...draft,
  trackId,
});

export const withStartingPoint = (
  draft: OnboardingDraft,
  startingPoint: StartingPoint,
): OnboardingDraft => ({ ...draft, startingPoint });

export const withExamDate = (draft: OnboardingDraft, examDate: string): OnboardingDraft => ({
  ...draft,
  examDate: normalizeExamDate(examDate),
});

export const withSessionLength = (
  draft: OnboardingDraft,
  sessionLength: SessionLength,
): OnboardingDraft => ({ ...draft, sessionLength });

export const withDailyGoal = (draft: OnboardingDraft, dailyGoal: number): OnboardingDraft => ({
  ...draft,
  dailyGoal: clampDailyGoal(dailyGoal),
});

export const withAppearance = (
  draft: OnboardingDraft,
  appearance: { themePreference: ThemePreference; textSize: TextSizePreference },
): OnboardingDraft => ({ ...draft, ...appearance });

export const withReminders = (
  draft: OnboardingDraft,
  remindersEnabled: boolean,
): OnboardingDraft => ({ ...draft, remindersEnabled });

export const toggleStudyDay = (draft: OnboardingDraft, weekday: number): OnboardingDraft => {
  if (weekday < 0 || weekday > 6) return draft;
  const next = new Set(draft.studyDays);
  if (next.has(weekday)) next.delete(weekday);
  else next.add(weekday);
  return { ...draft, studyDays: [...next].sort((a, b) => a - b) };
};

// ---------------------------------------------------------------------------
// Date handling
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `true` for a real calendar date in `YYYY-MM-DD` form. */
export const isValidExamDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/** Trims and normalises user input; an unrecognised value is preserved for editing. */
export const normalizeExamDate = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  if (isValidExamDate(trimmed)) return trimmed;
  // Accept `2026/11/15` and `11-15-2026`-style separators only when unambiguous.
  const parts = trimmed.split(/[/.]/);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year !== undefined && month !== undefined && day !== undefined) {
      const candidate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (isValidExamDate(candidate)) return candidate;
    }
  }
  return trimmed;
};

export const describeExamDate = (examDate: string): string => {
  if (!isValidExamDate(examDate)) return examDate.trim().length === 0 ? 'Not set' : examDate;
  const [year, month, day] = examDate.split('-').map((part) => Number.parseInt(part, 10));
  if (year === undefined || month === undefined || day === undefined) return examDate;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
};

export const describeDaysUntil = (examDate: string, now: Date = new Date()): string | null => {
  if (!isValidExamDate(examDate)) return null;
  const days = daysUntil(examDate, now);
  if (days < 0) return 'That date has already passed.';
  if (days === 0) return 'Exam day';
  if (days === 1) return '1 day to go';
  return `${days} days to go`;
};

// ---------------------------------------------------------------------------
// Presenters
// ---------------------------------------------------------------------------

export const describeStudyDays = (days: readonly number[]): string => {
  const labels = studyDayLabelsFor(days);
  return labels.length === 0 ? 'Flexible' : labels.join(' · ');
};

export const describeGoalPace = (dailyGoal: number): string => {
  switch (dailyGoal) {
    case 5:
      return '3–5 min';
    case 10:
      return '5–10 min';
    case 20:
      return '10–15 min';
    default:
      return `about ${Math.max(3, Math.round(dailyGoal * 0.5))}–${Math.max(
        4,
        Math.round(dailyGoal * 0.75),
      )} min`;
  }
};

/** The distinguishing subject of a track, e.g. Analytical Ability for Professional. */
/** The first subject in a track's presentation order, e.g. Verbal Ability. */
export const firstSubjectName = (exam: ExamRuleConfig, trackId: string): string | null =>
  subjectsForTrack(exam, trackId)[0]?.name ?? null;

/** The distinguishing subject of a track, e.g. Analytical Ability for Professional. */
export const distinguishingSubjectName = (exam: ExamRuleConfig, trackId: string): string | null => {
  const own = subjectsForTrack(exam, trackId);
  const otherSubjectIds = new Set(
    exam.tracks
      .filter((track) => track.id !== trackId)
      .flatMap((track) => track.subjectIds)
      .map(String),
  );
  const distinguishing = own.find((subject) => !otherSubjectIds.has(subject.id));
  return (distinguishing ?? own[0])?.name ?? null;
};

export const describeTrack = (exam: ExamRuleConfig, trackId: string): string => {
  const subject = distinguishingSubjectName(exam, trackId);
  const items = exam.tracks.find((track) => track.id === trackId)?.blueprintOverride?.totalItems;
  const parts = [subject, items === undefined ? null : `${items}-item mock`].filter(
    (part): part is string => part !== null,
  );
  return parts.join(' · ');
};

export const trackName = (exam: ExamRuleConfig, trackId: string): string =>
  exam.tracks.find((track) => track.id === trackId)?.name ?? trackId;

export const startingPointLabel = (value: string): string =>
  STARTING_POINT_LABELS[toStartingPoint(value)];

export const sessionLengthLabel = (value: string): string =>
  SESSION_LENGTH_LABELS[toSessionLength(value)];

// ---------------------------------------------------------------------------
// First activity and step machine
// ---------------------------------------------------------------------------

export type FirstActivityMode = 'foundation-diagnostic' | 'subject-diagnostic' | 'smart-drill';

export interface FirstActivity {
  readonly mode: FirstActivityMode;
  readonly label: string;
  readonly questionCount: number;
  readonly estimatedMinutes: number;
  /** Label for the plan preview line, e.g. `5 questions · ~10 min`. */
  readonly detail: string;
}

/**
 * The activity the flow offers at the end. It reflects the stated starting point —
 * a diagnostic when the learner is new or returning, a drill when they are
 * practice-ready — and stays inside the questions they said they can do.
 */
export const firstActivityFor = (draft: OnboardingDraft, exam: ExamRuleConfig): FirstActivity => {
  const questionCount = Math.min(draft.dailyGoal, FIRST_ACTIVITY_MAX_QUESTIONS);
  const detail = `${questionCount} questions · ~${FIRST_ACTIVITY_MINUTES} min`;

  if (draft.startingPoint === 'practice') {
    return {
      mode: 'smart-drill',
      label: 'Smart Drill',
      questionCount,
      estimatedMinutes: FIRST_ACTIVITY_MINUTES,
      detail,
    };
  }
  if (draft.startingPoint === 'beginner') {
    return {
      mode: 'foundation-diagnostic',
      label: 'Foundation diagnostic',
      questionCount,
      estimatedMinutes: FIRST_ACTIVITY_MINUTES,
      detail,
    };
  }
  const subject = firstSubjectName(exam, draft.trackId);
  return {
    mode: 'subject-diagnostic',
    label: subject === null ? 'Diagnostic' : `${subject} diagnostic`,
    questionCount,
    estimatedMinutes: FIRST_ACTIVITY_MINUTES,
    detail,
  };
};

/** Resolves an untrusted step identifier (a route param) to a known step. */
export const toStepId = (
  value: unknown,
  fallback: OnboardingStepId = 'account',
): OnboardingStepId =>
  typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value)
    ? (value as OnboardingStepId)
    : fallback;

export const stepIndex = (step: OnboardingStepId): number => ONBOARDING_STEPS.indexOf(step);

export const stepAt = (index: number): OnboardingStepId =>
  ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.length - 1, Math.max(0, index))] ?? 'done';

export const nextStep = (step: OnboardingStepId): OnboardingStepId => stepAt(stepIndex(step) + 1);

export const previousStep = (step: OnboardingStepId): OnboardingStepId =>
  stepAt(stepIndex(step) - 1);

export const isLastStep = (step: OnboardingStepId): boolean => step === 'done';

/**
 * The reason a step cannot be left yet, or `null` when it can. The flow opens with
 * usable defaults at every step, so the only real failures are a half-typed exam
 * date and an out-of-range custom goal.
 */
export const stepIssue = (
  draft: OnboardingDraft,
  step: OnboardingStepId,
  now: Date = new Date(),
): string | null => {
  switch (step) {
    case 'starting-point': {
      if (draft.examDate.trim().length === 0) return null;
      if (!isValidExamDate(draft.examDate))
        return 'Use the date format YYYY-MM-DD, or leave it blank.';
      if (daysUntil(draft.examDate, now) < 0)
        return 'That date has already passed. Pick a future date.';
      return null;
    }
    case 'goal':
      if (draft.dailyGoal < MIN_DAILY_GOAL || draft.dailyGoal > MAX_DAILY_GOAL) {
        return `Choose between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL} questions a day.`;
      }
      return null;
    case 'level':
      return draft.trackId.length > 0 ? null : 'Choose the level you are taking.';
    case 'account':
    case 'schedule':
    case 'plan':
    case 'preferences':
    case 'done':
    default:
      return null;
  }
};

/** A one-line summary of a finished draft, used by Settings and Home later. */
export const describeOnboardingSummary = (draft: OnboardingDraft): string =>
  `${describeStudyDays(draft.studyDays)} · ${draft.dailyGoal} questions a day`;
