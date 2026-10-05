import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort, SqlValue } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  AnswerRecord,
  AnswerRepository,
  PracticeSessionPatch,
  PracticeSessionRecord,
  PracticeSessionRepository,
  SessionQuestionRecord,
  SubjectAccuracy,
} from '@/data/repositories/practice-repository';
import type { WriteOptions } from '@/data/repositories/types';
import type { ConceptId } from '@/domain/exams/types';
import type { SessionMode } from '@/domain/exams/session-plan';

import { decodePayload, fromSqlBool, toSqlBool } from './mappers';

interface SessionRow {
  id: string;
  exam_id: string;
  track_id: string;
  mode: string;
  status: string;
  requested_count: number;
  correct_count: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  duration_seconds: number;
  time_limit_seconds: number | null;
  time_remaining_seconds: number | null;
}

const SESSION_SELECT = `
  SELECT id, exam_id, track_id, mode, status, requested_count, correct_count,
         started_at, updated_at, completed_at, duration_seconds,
         time_limit_seconds, time_remaining_seconds
  FROM practice_sessions`;

const toSession = (row: SessionRow): PracticeSessionRecord => ({
  id: row.id,
  examId: row.exam_id,
  trackId: row.track_id,
  mode: row.mode as SessionMode,
  status: row.status as PracticeSessionRecord['status'],
  requestedCount: row.requested_count,
  correctCount: row.correct_count,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  durationSeconds: row.duration_seconds,
  timeLimitSeconds: row.time_limit_seconds,
  timeRemainingSeconds: row.time_remaining_seconds,
});

export class SqlitePracticeSessionRepository implements PracticeSessionRepository {
  constructor(private readonly database: DatabasePort) {}

  async create(
    session: PracticeSessionRecord,
    questionIds: readonly string[],
    options: WriteOptions = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO practice_sessions
           (id, exam_id, track_id, mode, status, requested_count, correct_count,
            started_at, updated_at, completed_at, duration_seconds,
            time_limit_seconds, time_remaining_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.examId,
          session.trackId,
          session.mode,
          session.status,
          session.requestedCount,
          session.correctCount,
          session.startedAt,
          session.updatedAt,
          session.completedAt,
          session.durationSeconds,
          session.timeLimitSeconds,
          session.timeRemainingSeconds,
        ],
      );
      for (let position = 0; position < questionIds.length; position += 1) {
        await tx.execute(
          `INSERT INTO practice_session_questions (session_id, question_id, position)
           VALUES (?, ?, ?)`,
          [session.id, questionIds[position] ?? '', position],
        );
      }
    });
  }

  async getById(id: string): Promise<PracticeSessionRecord | null> {
    const row = await this.database.queryOne<SessionRow>(`${SESSION_SELECT} WHERE id = ?`, [id]);
    return row === null ? null : toSession(row);
  }

  async listQuestions(sessionId: string): Promise<SessionQuestionRecord[]> {
    const rows = await this.database.query<{
      session_id: string;
      question_id: string;
      position: number;
    }>(
      `SELECT session_id, question_id, position FROM practice_session_questions
       WHERE session_id = ? ORDER BY position`,
      [sessionId],
    );
    return rows.map((row) => ({
      sessionId: row.session_id,
      questionId: row.question_id,
      position: row.position,
    }));
  }

  async findResumable(examId: string): Promise<PracticeSessionRecord | null> {
    const row = await this.database.queryOne<SessionRow>(
      `${SESSION_SELECT}
       WHERE exam_id = ? AND status IN ('in-progress', 'paused')
       ORDER BY updated_at DESC LIMIT 1`,
      [examId],
    );
    return row === null ? null : toSession(row);
  }

  async update(id: string, patch: PracticeSessionPatch, options: WriteOptions = {}): Promise<void> {
    const assignments: string[] = [];
    const params: SqlValue[] = [];
    const set = (column: string, value: SqlValue): void => {
      assignments.push(`${column} = ?`);
      params.push(value);
    };
    if (patch.status !== undefined) set('status', patch.status);
    if (patch.correctCount !== undefined) set('correct_count', patch.correctCount);
    if (patch.updatedAt !== undefined) set('updated_at', patch.updatedAt);
    if (patch.completedAt !== undefined) set('completed_at', patch.completedAt);
    if (patch.durationSeconds !== undefined) set('duration_seconds', patch.durationSeconds);
    if (patch.timeRemainingSeconds !== undefined) {
      set('time_remaining_seconds', patch.timeRemainingSeconds);
    }
    if (assignments.length === 0) return;

    params.push(id);
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `UPDATE practice_sessions SET ${assignments.join(', ')} WHERE id = ?`,
        params,
      );
    });
  }

  async listRecent(examId: string, limit = 20): Promise<PracticeSessionRecord[]> {
    const rows = await this.database.query<SessionRow>(
      `${SESSION_SELECT} WHERE exam_id = ? ORDER BY updated_at DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toSession);
  }

  async countCompleted(examId: string): Promise<number> {
    const row = await this.database.queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM practice_sessions
       WHERE exam_id = ? AND status = 'completed'`,
      [examId],
    );
    return row?.count ?? 0;
  }
}

interface AnswerRow {
  id: string;
  session_id: string | null;
  question_id: string;
  exam_id: string;
  subject_id: string;
  concept_ids: string;
  chosen_choice_id: string;
  correct_choice_id: string;
  is_correct: number;
  source: string;
  answered_at: string;
  time_spent_seconds: number | null;
}

const ANSWER_SELECT = `
  SELECT id, session_id, question_id, exam_id, subject_id, concept_ids,
         chosen_choice_id, correct_choice_id, is_correct, source, answered_at,
         time_spent_seconds
  FROM answers`;

const toAnswer = (row: AnswerRow): AnswerRecord => ({
  id: row.id,
  sessionId: row.session_id,
  questionId: row.question_id,
  examId: row.exam_id,
  subjectId: row.subject_id,
  conceptIds: decodePayload<readonly ConceptId[]>(row.concept_ids) ?? [],
  chosenChoiceId: row.chosen_choice_id,
  correctChoiceId: row.correct_choice_id,
  isCorrect: fromSqlBool(row.is_correct),
  source: row.source as AnswerRecord['source'],
  answeredAt: row.answered_at,
  timeSpentSeconds: row.time_spent_seconds,
});

export class SqliteAnswerRepository implements AnswerRepository {
  constructor(private readonly database: DatabasePort) {}

  async record(answer: AnswerRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO answers
           (id, session_id, question_id, exam_id, subject_id, concept_ids,
            chosen_choice_id, correct_choice_id, is_correct, source, answered_at,
            time_spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          answer.id,
          answer.sessionId,
          answer.questionId,
          answer.examId,
          answer.subjectId,
          jsonParam(answer.conceptIds),
          answer.chosenChoiceId,
          answer.correctChoiceId,
          toSqlBool(answer.isCorrect),
          answer.source,
          answer.answeredAt,
          answer.timeSpentSeconds,
        ],
      );
    });
  }

  async findBySessionAndQuestion(
    sessionId: string,
    questionId: string,
  ): Promise<AnswerRecord | null> {
    const row = await this.database.queryOne<AnswerRow>(
      `${ANSWER_SELECT} WHERE session_id = ? AND question_id = ?`,
      [sessionId, questionId],
    );
    return row === null ? null : toAnswer(row);
  }

  async listBySession(sessionId: string): Promise<AnswerRecord[]> {
    const rows = await this.database.query<AnswerRow>(
      `${ANSWER_SELECT} WHERE session_id = ? ORDER BY answered_at, id`,
      [sessionId],
    );
    return rows.map(toAnswer);
  }

  async listRecent(examId: string, limit = 50): Promise<AnswerRecord[]> {
    const rows = await this.database.query<AnswerRow>(
      `${ANSWER_SELECT} WHERE exam_id = ? ORDER BY answered_at DESC, id DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toAnswer);
  }

  async subjectAccuracy(examId: string): Promise<SubjectAccuracy[]> {
    const rows = await this.database.query<{
      subject_id: string;
      answered: number;
      correct: number | null;
    }>(
      `SELECT subject_id, COUNT(*) AS answered, SUM(is_correct) AS correct
       FROM answers WHERE exam_id = ? GROUP BY subject_id ORDER BY subject_id`,
      [examId],
    );
    return rows.map((row) => ({
      subjectId: row.subject_id,
      answered: row.answered,
      correct: row.correct ?? 0,
    }));
  }

  async countAnswered(examId: string): Promise<number> {
    const row = await this.database.queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM answers WHERE exam_id = ?`,
      [examId],
    );
    return row?.count ?? 0;
  }
}
