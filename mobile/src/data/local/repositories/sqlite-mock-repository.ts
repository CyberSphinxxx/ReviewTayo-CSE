import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort, SqlValue } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  MockItemPatch,
  MockItemRecord,
  MockSessionPatch,
  MockSessionRecord,
  MockSessionRepository,
} from '@/data/repositories/mock-repository';
import type { WriteOptions } from '@/data/repositories/types';

import { decodePayload, fromSqlBool, toSqlBool } from './mappers';

interface MockRow {
  id: string;
  exam_id: string;
  track_id: string;
  status: string;
  total_items: number;
  answered_count: number;
  correct_count: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string;
  paused_at: string | null;
  remaining_seconds: number | null;
  payload: string | null;
}

const MOCK_SELECT = `
  SELECT id, exam_id, track_id, status, total_items, answered_count, correct_count,
         started_at, updated_at, completed_at, expires_at, paused_at,
         remaining_seconds, payload
  FROM mock_sessions`;

const toMockSession = (row: MockRow): MockSessionRecord => ({
  id: row.id,
  examId: row.exam_id,
  trackId: row.track_id,
  status: row.status as MockSessionRecord['status'],
  totalItems: row.total_items,
  answeredCount: row.answered_count,
  correctCount: row.correct_count,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  expiresAt: row.expires_at,
  pausedAt: row.paused_at,
  remainingSeconds: row.remaining_seconds,
  payload: row.payload === null ? null : decodePayload<unknown>(row.payload),
});

interface MockItemRow {
  mock_session_id: string;
  question_id: string;
  position: number;
  chosen_choice_id: string | null;
  is_correct: number | null;
  flagged: number;
  answered_at: string | null;
}

const toMockItem = (row: MockItemRow): MockItemRecord => ({
  mockSessionId: row.mock_session_id,
  questionId: row.question_id,
  position: row.position,
  chosenChoiceId: row.chosen_choice_id,
  isCorrect: row.is_correct === null ? null : fromSqlBool(row.is_correct),
  flagged: fromSqlBool(row.flagged),
  answeredAt: row.answered_at,
});

export class SqliteMockSessionRepository implements MockSessionRepository {
  constructor(private readonly database: DatabasePort) {}

  async create(
    session: MockSessionRecord,
    items: readonly MockItemRecord[],
    options: WriteOptions = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO mock_sessions
           (id, exam_id, track_id, status, total_items, answered_count, correct_count,
            started_at, updated_at, completed_at, expires_at, paused_at,
            remaining_seconds, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.examId,
          session.trackId,
          session.status,
          session.totalItems,
          session.answeredCount,
          session.correctCount,
          session.startedAt,
          session.updatedAt,
          session.completedAt,
          session.expiresAt,
          session.pausedAt,
          session.remainingSeconds,
          session.payload === undefined || session.payload === null
            ? null
            : jsonParam(session.payload),
        ],
      );
      for (const item of items) {
        await tx.execute(
          `INSERT INTO mock_answers
             (mock_session_id, question_id, position, chosen_choice_id, is_correct, flagged, answered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            session.id,
            item.questionId,
            item.position,
            item.chosenChoiceId,
            item.isCorrect === null ? null : toSqlBool(item.isCorrect),
            toSqlBool(item.flagged),
            item.answeredAt,
          ],
        );
      }
    });
  }

  async getById(id: string): Promise<MockSessionRecord | null> {
    const row = await this.database.queryOne<MockRow>(`${MOCK_SELECT} WHERE id = ?`, [id]);
    return row === null ? null : toMockSession(row);
  }

  async listItems(mockSessionId: string): Promise<MockItemRecord[]> {
    const rows = await this.database.query<MockItemRow>(
      `SELECT mock_session_id, question_id, position, chosen_choice_id, is_correct,
              flagged, answered_at
       FROM mock_answers WHERE mock_session_id = ? ORDER BY position`,
      [mockSessionId],
    );
    return rows.map(toMockItem);
  }

  async findResumable(examId: string): Promise<MockSessionRecord | null> {
    const row = await this.database.queryOne<MockRow>(
      `${MOCK_SELECT}
       WHERE exam_id = ? AND status IN ('in-progress', 'paused')
       ORDER BY updated_at DESC LIMIT 1`,
      [examId],
    );
    return row === null ? null : toMockSession(row);
  }

  async updateSession(
    id: string,
    patch: MockSessionPatch,
    options: WriteOptions = {},
  ): Promise<void> {
    const assignments: string[] = [];
    const params: SqlValue[] = [];
    const set = (column: string, value: SqlValue): void => {
      assignments.push(`${column} = ?`);
      params.push(value);
    };
    if (patch.status !== undefined) set('status', patch.status);
    if (patch.answeredCount !== undefined) set('answered_count', patch.answeredCount);
    if (patch.correctCount !== undefined) set('correct_count', patch.correctCount);
    if (patch.updatedAt !== undefined) set('updated_at', patch.updatedAt);
    if (patch.completedAt !== undefined) set('completed_at', patch.completedAt);
    if (patch.pausedAt !== undefined) set('paused_at', patch.pausedAt);
    if (patch.remainingSeconds !== undefined) set('remaining_seconds', patch.remainingSeconds);
    if (patch.expiresAt !== undefined) set('expires_at', patch.expiresAt);
    if (patch.payload !== undefined) set('payload', jsonParam(patch.payload));
    if (assignments.length === 0) return;

    params.push(id);
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`UPDATE mock_sessions SET ${assignments.join(', ')} WHERE id = ?`, params);
    });
  }

  async saveItem(
    mockSessionId: string,
    questionId: string,
    patch: MockItemPatch,
    options: WriteOptions = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      const existing = await tx.queryOne<MockItemRow>(
        `SELECT mock_session_id, question_id, position, chosen_choice_id, is_correct,
                flagged, answered_at
         FROM mock_answers WHERE mock_session_id = ? AND question_id = ?`,
        [mockSessionId, questionId],
      );
      if (existing === null) {
        throw new Error(
          `Cannot save an answer for question ${questionId}: it is not part of mock ${mockSessionId}.`,
        );
      }
      const merged: MockItemRecord = {
        ...toMockItem(existing),
        ...(patch.chosenChoiceId !== undefined ? { chosenChoiceId: patch.chosenChoiceId } : {}),
        ...(patch.isCorrect !== undefined ? { isCorrect: patch.isCorrect } : {}),
        ...(patch.flagged !== undefined ? { flagged: patch.flagged } : {}),
        ...(patch.answeredAt !== undefined ? { answeredAt: patch.answeredAt } : {}),
      };
      await tx.execute(
        `UPDATE mock_answers
         SET chosen_choice_id = ?, is_correct = ?, flagged = ?, answered_at = ?
         WHERE mock_session_id = ? AND question_id = ?`,
        [
          merged.chosenChoiceId,
          merged.isCorrect === null ? null : toSqlBool(merged.isCorrect),
          toSqlBool(merged.flagged),
          merged.answeredAt,
          mockSessionId,
          questionId,
        ],
      );
    });
  }

  async listRecent(examId: string, limit = 10): Promise<MockSessionRecord[]> {
    const rows = await this.database.query<MockRow>(
      `${MOCK_SELECT} WHERE exam_id = ? ORDER BY updated_at DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toMockSession);
  }
}
