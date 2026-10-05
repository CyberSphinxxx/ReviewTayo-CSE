import type { ExamId, ExamTrackId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

/**
 * Learner profile.
 *
 * `startingPoint`, `sessionLength` and `studyDays` are stored as opaque strings
 * and an opaque string list: onboarding owns the allowed values, and the data
 * layer must not grow a second, drifting copy of them.
 */
export interface UserExamProfileRecord {
  readonly examId: ExamId;
  readonly trackId: ExamTrackId;
  readonly startingPoint: string;
  readonly examDate: string | null;
  readonly studyDays: readonly string[];
  readonly sessionLength: string;
  readonly dailyGoal: number;
  readonly onboardingCompletedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Reads and writes the single learner profile row (`CHECK (id = 1)` guarantees one). */
export interface UserExamProfileRepository {
  get(): Promise<UserExamProfileRecord | null>;
  save(record: UserExamProfileRecord, options?: WriteOptions): Promise<void>;
}

export type ThemePreference = 'device' | 'light' | 'dark';
export type TextSizePreference = 'standard' | 'large' | 'extra-large';

export interface AppSettingsRecord {
  readonly themePreference: ThemePreference;
  readonly textSize: TextSizePreference;
  readonly remindersEnabled: boolean;
  /** 24-hour `HH:mm`, local to `reminderTimezone`. */
  readonly reminderTime: string;
  readonly reminderTimezone: string | null;
  readonly updatedAt: string;
}

export interface SettingsRepository {
  get(): Promise<AppSettingsRecord | null>;
  save(record: AppSettingsRecord, options?: WriteOptions): Promise<void>;
}
