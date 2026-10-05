import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort, DatabaseTransaction } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  ConceptDefinition,
  ConceptId,
  ExamContentPack,
  ExamId,
  SubjectDefinition,
  SubjectId,
} from '@/domain/exams/types';
import type {
  ExamContentRepository,
  ReplaceExamOptions,
  StoredExamRecord,
} from '@/data/repositories/exam-content-repository';

import { decodePayload } from './mappers';

interface StoredExamRow {
  id: string;
  version: number;
  content_version: string;
  short_name: string;
  payload: string;
  imported_at: string;
  question_count: number;
}

const EXAM_SELECT = `
  SELECT e.id, e.version, e.content_version, e.short_name, e.payload, e.imported_at,
         (SELECT COUNT(*) FROM content_questions q WHERE q.exam_id = e.id) AS question_count
  FROM content_exams e`;

const toStoredExam = (row: StoredExamRow): StoredExamRecord => {
  const payload = decodePayload<{ name?: unknown }>(row.payload);
  const name = typeof payload?.name === 'string' ? payload.name : row.short_name;
  return {
    examId: row.id,
    name,
    shortName: row.short_name,
    version: row.version,
    contentVersion: row.content_version,
    importedAt: row.imported_at,
    questionCount: row.question_count,
  };
};

export class SqliteExamContentRepository implements ExamContentRepository {
  constructor(private readonly database: DatabasePort) {}

  async getStoredExam(examId: ExamId): Promise<StoredExamRecord | null> {
    const row = await this.database.queryOne<StoredExamRow>(`${EXAM_SELECT} WHERE e.id = ?`, [
      examId,
    ]);
    return row === null ? null : toStoredExam(row);
  }

  async listStoredExams(): Promise<StoredExamRecord[]> {
    const rows = await this.database.query<StoredExamRow>(`${EXAM_SELECT} ORDER BY e.id`);
    return rows.map(toStoredExam);
  }

  async replaceExam(pack: ExamContentPack, options: ReplaceExamOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      const importedAt = options.importedAt ?? new Date().toISOString();
      const exam = pack.exam;

      // Deleting the exam cascades to every child table, so the replacement is
      // total: no subject, concept or question from the previous version survives.
      await tx.execute(`DELETE FROM content_exams WHERE id = ?`, [exam.id]);
      await tx.execute(
        `INSERT INTO content_exams (id, version, content_version, short_name, payload, imported_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          exam.id,
          exam.version,
          pack.manifest.contentVersion,
          exam.shortName,
          jsonParam(exam),
          importedAt,
        ],
      );

      for (const subject of exam.subjects) {
        await tx.execute(
          `INSERT INTO content_subjects (id, exam_id, display_order, payload) VALUES (?, ?, ?, ?)`,
          [subject.id, exam.id, subject.order, jsonParam(subject)],
        );
      }

      for (const concept of exam.concepts) {
        await tx.execute(
          `INSERT INTO content_concepts (id, exam_id, subject_id, name, payload)
           VALUES (?, ?, ?, ?, ?)`,
          [concept.id, exam.id, concept.subjectId, concept.name, jsonParam(concept)],
        );
      }

      for (const question of pack.questions) {
        await tx.execute(
          `INSERT INTO content_questions
             (id, exam_id, subject_id, difficulty, status, content_version, related_group_id, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            question.id,
            question.examId,
            question.subjectId,
            question.difficulty,
            question.status,
            question.contentVersion,
            question.relatedQuestionGroupId ?? null,
            jsonParam(question),
          ],
        );
        for (const trackId of question.trackIds) {
          await tx.execute(
            `INSERT INTO content_question_tracks (question_id, track_id, exam_id) VALUES (?, ?, ?)`,
            [question.id, trackId, exam.id],
          );
        }
        for (const conceptId of question.conceptIds) {
          await tx.execute(
            `INSERT INTO content_question_concepts (question_id, concept_id, exam_id) VALUES (?, ?, ?)`,
            [question.id, conceptId, exam.id],
          );
        }
      }
    });
  }

  async deleteExam(
    examId: ExamId,
    options: { transaction?: DatabaseTransaction } = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`DELETE FROM content_exams WHERE id = ?`, [examId]);
    });
  }

  async listSubjects(examId: ExamId): Promise<SubjectDefinition[]> {
    const rows = await this.database.query<{ payload: string }>(
      `SELECT payload FROM content_subjects WHERE exam_id = ? ORDER BY display_order, id`,
      [examId],
    );
    return rows
      .map((row) => decodePayload<SubjectDefinition>(row.payload))
      .filter((subject): subject is SubjectDefinition => subject !== null);
  }

  async listConcepts(examId: ExamId, subjectId?: SubjectId): Promise<ConceptDefinition[]> {
    const params: string[] = [examId];
    let sql = `SELECT payload FROM content_concepts WHERE exam_id = ?`;
    if (subjectId !== undefined) {
      sql += ` AND subject_id = ?`;
      params.push(subjectId);
    }
    sql += ` ORDER BY subject_id, id`;
    const rows = await this.database.query<{ payload: string }>(sql, params);
    return rows
      .map((row) => decodePayload<ConceptDefinition>(row.payload))
      .filter((concept): concept is ConceptDefinition => concept !== null);
  }

  async getConcept(examId: ExamId, conceptId: ConceptId): Promise<ConceptDefinition | null> {
    const row = await this.database.queryOne<{ payload: string }>(
      `SELECT payload FROM content_concepts WHERE exam_id = ? AND id = ?`,
      [examId, conceptId],
    );
    return row === null ? null : decodePayload<ConceptDefinition>(row.payload);
  }

  async getMeta(key: string): Promise<string | null> {
    const row = await this.database.queryOne<{ value: string }>(
      `SELECT value FROM content_meta WHERE key = ?`,
      [key],
    );
    return row?.value ?? null;
  }

  async setMeta(
    key: string,
    value: string,
    options: { updatedAt?: string; transaction?: DatabaseTransaction } = {},
  ): Promise<void> {
    const updatedAt = options.updatedAt ?? new Date().toISOString();
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO content_meta (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, updatedAt],
      );
    });
  }
}
