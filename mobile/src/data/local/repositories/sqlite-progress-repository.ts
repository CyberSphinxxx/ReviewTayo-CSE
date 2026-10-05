import type { DatabasePort } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  ActivityDayRecord,
  ActivityRepository,
  RecordQuestionInput,
} from '@/data/repositories/progress-repository';
import type { WriteOptions } from '@/data/repositories/types';

import { fromSqlBool, toSqlBool } from './mappers';

interface ActivityRow {
  day: string;
  exam_id: string;
  questions_answered: number;
  correct_count: number;
  minutes: number;
  goal_met: number;
  updated_at: string;
}

const ACTIVITY_SELECT = `
  SELECT day, exam_id, questions_answered, correct_count, minutes, goal_met, updated_at
  FROM activity_days`;

const toActivity = (row: ActivityRow): ActivityDayRecord => ({
  day: row.day,
  examId: row.exam_id,
  questionsAnswered: row.questions_answered,
  correctCount: row.correct_count,
  minutes: row.minutes,
  goalMet: fromSqlBool(row.goal_met),
  updatedAt: row.updated_at,
});

export class SqliteActivityRepository implements ActivityRepository {
  constructor(private readonly database: DatabasePort) {}

  async get(day: string, examId: string): Promise<ActivityDayRecord | null> {
    const row = await this.database.queryOne<ActivityRow>(
      `${ACTIVITY_SELECT} WHERE day = ? AND exam_id = ?`,
      [day, examId],
    );
    return row === null ? null : toActivity(row);
  }

  async recordQuestion(input: RecordQuestionInput, options: WriteOptions = {}): Promise<void> {
    const updatedAt = input.updatedAt ?? new Date().toISOString();
    const minutes = Math.max(0, Math.floor(input.minutes ?? 0));
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO activity_days
           (day, exam_id, questions_answered, correct_count, minutes, goal_met, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT(day) DO UPDATE SET
           exam_id = excluded.exam_id,
           questions_answered = activity_days.questions_answered + 1,
           correct_count = activity_days.correct_count + excluded.correct_count,
           minutes = activity_days.minutes + excluded.minutes,
           goal_met = CASE WHEN excluded.goal_met = 1 THEN 1 ELSE activity_days.goal_met END,
           updated_at = excluded.updated_at`,
        [
          input.day,
          input.examId,
          toSqlBool(input.correct),
          minutes,
          toSqlBool(input.goalMet ?? false),
          updatedAt,
        ],
      );
    });
  }

  async listRange(examId: string, fromDay: string, toDay: string): Promise<ActivityDayRecord[]> {
    const rows = await this.database.query<ActivityRow>(
      `${ACTIVITY_SELECT} WHERE exam_id = ? AND day >= ? AND day <= ? ORDER BY day`,
      [examId, fromDay, toDay],
    );
    return rows.map(toActivity);
  }

  async listRecent(examId: string, limit = 30): Promise<ActivityDayRecord[]> {
    const rows = await this.database.query<ActivityRow>(
      `${ACTIVITY_SELECT} WHERE exam_id = ? ORDER BY day DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toActivity);
  }
}
