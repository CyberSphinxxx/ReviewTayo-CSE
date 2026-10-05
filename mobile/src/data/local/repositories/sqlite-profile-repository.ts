import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  AppSettingsRecord,
  SettingsRepository,
  TextSizePreference,
  ThemePreference,
  UserExamProfileRecord,
  UserExamProfileRepository,
} from '@/data/repositories/profile-repository';
import type { WriteOptions } from '@/data/repositories/types';

import { decodePayload, fromSqlBool, toSqlBool } from './mappers';

interface ProfileRow {
  exam_id: string;
  track_id: string;
  starting_point: string;
  exam_date: string | null;
  study_days: string;
  session_length: string;
  daily_goal: number;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const toProfile = (row: ProfileRow): UserExamProfileRecord => ({
  examId: row.exam_id,
  trackId: row.track_id,
  startingPoint: row.starting_point,
  examDate: row.exam_date,
  studyDays: decodePayload<readonly string[]>(row.study_days) ?? [],
  sessionLength: row.session_length,
  dailyGoal: row.daily_goal,
  onboardingCompletedAt: row.onboarding_completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SqliteUserExamProfileRepository implements UserExamProfileRepository {
  constructor(private readonly database: DatabasePort) {}

  async get(): Promise<UserExamProfileRecord | null> {
    const row = await this.database.queryOne<ProfileRow>(
      `SELECT exam_id, track_id, starting_point, exam_date, study_days, session_length,
              daily_goal, onboarding_completed_at, created_at, updated_at
       FROM user_exam_profile WHERE id = 1`,
    );
    return row === null ? null : toProfile(row);
  }

  async save(record: UserExamProfileRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO user_exam_profile
           (id, exam_id, track_id, starting_point, exam_date, study_days, session_length,
            daily_goal, onboarding_completed_at, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           exam_id = excluded.exam_id,
           track_id = excluded.track_id,
           starting_point = excluded.starting_point,
           exam_date = excluded.exam_date,
           study_days = excluded.study_days,
           session_length = excluded.session_length,
           daily_goal = excluded.daily_goal,
           onboarding_completed_at = excluded.onboarding_completed_at,
           updated_at = excluded.updated_at`,
        [
          record.examId,
          record.trackId,
          record.startingPoint,
          record.examDate,
          jsonParam(record.studyDays),
          record.sessionLength,
          record.dailyGoal,
          record.onboardingCompletedAt,
          record.createdAt,
          record.updatedAt,
        ],
      );
    });
  }
}

interface SettingsRow {
  theme_preference: string;
  text_size: string;
  reminders_enabled: number;
  reminder_time: string;
  reminder_timezone: string | null;
  updated_at: string;
}

const toSettings = (row: SettingsRow): AppSettingsRecord => ({
  themePreference: row.theme_preference as ThemePreference,
  textSize: row.text_size as TextSizePreference,
  remindersEnabled: fromSqlBool(row.reminders_enabled),
  reminderTime: row.reminder_time,
  reminderTimezone: row.reminder_timezone,
  updatedAt: row.updated_at,
});

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly database: DatabasePort) {}

  async get(): Promise<AppSettingsRecord | null> {
    const row = await this.database.queryOne<SettingsRow>(
      `SELECT theme_preference, text_size, reminders_enabled, reminder_time,
              reminder_timezone, updated_at
       FROM app_settings WHERE id = 1`,
    );
    return row === null ? null : toSettings(row);
  }

  async save(record: AppSettingsRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO app_settings
           (id, theme_preference, text_size, reminders_enabled, reminder_time,
            reminder_timezone, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           theme_preference = excluded.theme_preference,
           text_size = excluded.text_size,
           reminders_enabled = excluded.reminders_enabled,
           reminder_time = excluded.reminder_time,
           reminder_timezone = excluded.reminder_timezone,
           updated_at = excluded.updated_at`,
        [
          record.themePreference,
          record.textSize,
          toSqlBool(record.remindersEnabled),
          record.reminderTime,
          record.reminderTimezone,
          record.updatedAt,
        ],
      );
    });
  }
}
