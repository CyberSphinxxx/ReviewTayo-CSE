import type { DatabasePort, SqlValue } from '@/data/local/database-port';
import type { ExamId, ExamTrackId, Question, QuestionId, SubjectId } from '@/domain/exams/types';
import type { QuestionQuery, QuestionRepository } from '@/data/repositories/question-repository';

import { decodePayload, placeholders } from './mappers';

/**
 * Builds the shared WHERE clause. Filters are composed dynamically, but every
 * value is bound: SQL text never contains caller data.
 */
const buildWhere = (query: QuestionQuery): { clause: string; params: SqlValue[] } => {
  const clauses: string[] = ['q.exam_id = ?'];
  const params: SqlValue[] = [query.examId];

  const status = query.status ?? 'published';
  if (status !== 'any') {
    clauses.push('q.status = ?');
    params.push(status);
  }
  if (query.subjectId !== undefined) {
    clauses.push('q.subject_id = ?');
    params.push(query.subjectId);
  }
  if (query.difficulty !== undefined) {
    clauses.push('q.difficulty = ?');
    params.push(query.difficulty);
  }
  if (query.trackId !== undefined) {
    clauses.push(
      `EXISTS (SELECT 1 FROM content_question_tracks t
               WHERE t.question_id = q.id AND t.track_id = ?)`,
    );
    params.push(query.trackId);
  }
  if (query.conceptId !== undefined) {
    clauses.push(
      `EXISTS (SELECT 1 FROM content_question_concepts c
               WHERE c.question_id = q.id AND c.concept_id = ?)`,
    );
    params.push(query.conceptId);
  }
  if (query.excludeIds !== undefined && query.excludeIds.length > 0) {
    clauses.push(`q.id NOT IN (${placeholders(query.excludeIds.length)})`);
    params.push(...query.excludeIds);
  }

  return { clause: clauses.join(' AND '), params };
};

const decodeQuestions = (rows: readonly { payload: string }[]): Question[] =>
  rows
    .map((row) => decodePayload<Question>(row.payload))
    .filter((question): question is Question => question !== null);

export class SqliteQuestionRepository implements QuestionRepository {
  constructor(private readonly database: DatabasePort) {}

  async getById(id: QuestionId): Promise<Question | null> {
    const row = await this.database.queryOne<{ payload: string }>(
      `SELECT payload FROM content_questions WHERE id = ?`,
      [id],
    );
    return row === null ? null : decodePayload<Question>(row.payload);
  }

  async getByIds(ids: readonly QuestionId[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const rows = await this.database.query<{ id: string; payload: string }>(
      `SELECT id, payload FROM content_questions WHERE id IN (${placeholders(unique.length)})`,
      unique,
    );
    const byId = new Map<string, Question>();
    for (const row of rows) {
      const question = decodePayload<Question>(row.payload);
      if (question !== null) byId.set(row.id, question);
    }
    return ids
      .map((id) => byId.get(id))
      .filter((question): question is Question => question !== undefined);
  }

  async listPublished(query: QuestionQuery): Promise<Question[]> {
    const { clause, params } = buildWhere(query);
    let sql = `SELECT q.payload FROM content_questions q WHERE ${clause} ORDER BY q.id`;
    if (query.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(Math.max(0, Math.floor(query.limit)));
      if (query.offset !== undefined && query.offset > 0) {
        sql += ` OFFSET ?`;
        params.push(Math.floor(query.offset));
      }
    } else if (query.offset !== undefined && query.offset > 0) {
      // SQLite requires a LIMIT before OFFSET; -1 means "no limit".
      sql += ` LIMIT -1 OFFSET ?`;
      params.push(Math.floor(query.offset));
    }
    const rows = await this.database.query<{ payload: string }>(sql, params);
    return decodeQuestions(rows);
  }

  async countPublished(query: Omit<QuestionQuery, 'limit' | 'offset'>): Promise<number> {
    const { clause, params } = buildWhere(query);
    const row = await this.database.queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM content_questions q WHERE ${clause}`,
      params,
    );
    return row?.count ?? 0;
  }

  async listByRelatedGroup(
    groupId: string,
    excludeIds: readonly QuestionId[] = [],
  ): Promise<Question[]> {
    const params: SqlValue[] = [groupId];
    let sql = `SELECT payload FROM content_questions
               WHERE related_group_id = ? AND status = 'published'`;
    if (excludeIds.length > 0) {
      sql += ` AND id NOT IN (${placeholders(excludeIds.length)})`;
      params.push(...excludeIds);
    }
    sql += ` ORDER BY id`;
    const rows = await this.database.query<{ payload: string }>(sql, params);
    return decodeQuestions(rows);
  }

  async countBySubject(
    examId: ExamId,
    options: { trackId?: ExamTrackId; subjectIds?: readonly SubjectId[] } = {},
  ): Promise<Record<SubjectId, number>> {
    const params: SqlValue[] = [examId];
    let sql = `SELECT subject_id, COUNT(*) AS count FROM content_questions q
               WHERE q.exam_id = ? AND q.status = 'published'`;
    if (options.trackId !== undefined) {
      sql += ` AND EXISTS (SELECT 1 FROM content_question_tracks t
                           WHERE t.question_id = q.id AND t.track_id = ?)`;
      params.push(options.trackId);
    }
    sql += ` GROUP BY subject_id`;
    const rows = await this.database.query<{ subject_id: string; count: number }>(sql, params);

    const counts: Record<SubjectId, number> = {};
    for (const subjectId of options.subjectIds ?? []) counts[subjectId] = 0;
    for (const row of rows) counts[row.subject_id] = row.count;
    return counts;
  }
}
