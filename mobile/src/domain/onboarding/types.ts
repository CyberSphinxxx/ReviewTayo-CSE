import type { ExamId, ExamTrackId } from '@/domain/exams/types';
import type { TextSizePreference, ThemePreference } from '@/domain/preferences';

/**
 * Onboarding vocabulary and draft shape.
 *
 * The draft is ephemeral UI state (see `architecture/STATE-MANAGEMENT.md`): it
 * lives only while the flow is open and is committed as one change at completion.
 * Everything the flow needs to decide lives here as data, so the steps stay a
 * rendering exercise and the state machine is testable off-device.
 */

/** The approved eight-step flow. The order is the contract; copy lives in the UI. */
export const ONBOARDING_STEPS = [
  'account',
  'level',
  'starting-point',
  'schedule',
  'goal',
  'plan',
  'preferences',
  'done',
] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;
export const LAST_ONBOARDING_STEP: OnboardingStepId = 'done';

export const ACCOUNT_CHOICES = ['google', 'guest'] as const;
export type AccountChoice = (typeof ACCOUNT_CHOICES)[number];

export const STARTING_POINTS = ['beginner', 'reviewing', 'practice'] as const;
export type StartingPoint = (typeof STARTING_POINTS)[number];

export const SESSION_LENGTHS = ['quick', 'regular', 'long'] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

/** Monday-first study-day labels; the index is the weekday (0 = Monday). */
export const STUDY_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** The prototype's default schedule: Monday, Wednesday, Friday and Saturday. */
export const DEFAULT_STUDY_DAYS: readonly number[] = [0, 2, 4, 5];

export const MIN_DAILY_GOAL = 5;
export const MAX_DAILY_GOAL = 50;
export const DEFAULT_DAILY_GOAL = 10;
export const GOAL_PRESETS: readonly number[] = [5, 10, 20];

/** A plan preview names "your first activity"; it is capped for a first session. */
export const FIRST_ACTIVITY_MAX_QUESTIONS = 10;
export const FIRST_ACTIVITY_MINUTES = 10;

export const ACCOUNT_LABELS: Record<AccountChoice, string> = {
  google: 'Continue with Google',
  guest: 'Continue as guest',
};

export const ACCOUNT_DESCRIPTIONS: Record<AccountChoice, string> = {
  google: 'Sync progress across devices.',
  guest: 'Keep progress on this device.',
};

/** Copy shown when sync is not available in this release yet. */
export const GOOGLE_SYNC_NOTE =
  'Sign-in links to sync in a later update — your progress is saved on this device until then.';

export const STARTING_POINT_LABELS: Record<StartingPoint, string> = {
  beginner: 'Just starting',
  reviewing: 'Reviewing',
  practice: 'Practice-ready',
};

export const STARTING_POINT_DESCRIPTIONS: Record<StartingPoint, string> = {
  beginner: 'Build the basics first.',
  reviewing: 'Find and strengthen weak areas.',
  practice: 'Focus on drills and mock exams.',
};

export const SESSION_LENGTH_LABELS: Record<SessionLength, string> = {
  quick: 'Quick',
  regular: 'Regular',
  long: 'Long',
};

export const SESSION_LENGTH_HINTS: Record<SessionLength, string> = {
  quick: '10–15 min',
  regular: '20–30 min',
  long: '45+ min',
};

/** The flow's working copy of every answer, before anything is persisted. */
export interface OnboardingDraft {
  readonly account: AccountChoice;
  readonly examId: ExamId;
  readonly trackId: ExamTrackId;
  readonly startingPoint: StartingPoint;
  /** Local `YYYY-MM-DD`, or an empty string for "not set". */
  readonly examDate: string;
  readonly studyDays: readonly number[];
  readonly sessionLength: SessionLength;
  readonly dailyGoal: number;
  readonly themePreference: ThemePreference;
  readonly textSize: TextSizePreference;
  readonly remindersEnabled: boolean;
}
