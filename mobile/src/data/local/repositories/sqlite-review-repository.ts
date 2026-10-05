import type { DatabasePort } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  ReviewItemRecord,
  ReviewRepository,
  SavedQuestionRecord,
  SavedQuestionRepository,
} from '@/data/repositories/review-repository';
import type { WriteOptions } from '@/data/repositories/types';

interface ReviewRow {
  id: string;
  exam_id: string;
  concept_id: string;
  question_id: string | null;
  source: string;
  due_at: string;
  interval_days: number;
  ease_level: number;
  lapses: number;
  reviews: number;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const REVIEW_SELECT = `
  SELECT id, exam_id, concept_id, question_id, source, due_at, interval_days,
         ease_level, lapses, reviews, last_reviewed_at, created_at, updated_at
  FROM review_items`;

const toReviewItem = (row: ReviewRow): ReviewItemRecord => ({
  id: row.id,
  examId: row.exam_id,
  conceptId: row.concept_id,
  questionId: row.question_id,
  source: row.source as ReviewItemRecord['source'],
  dueAt: row.due_at,
  intervalDays: row.interval_days,
  easeLevel: row.ease_level,
  lapses: row.lapses,
  reviews: row.reviews,
  lastReviewedAt: row.last_reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SqliteReviewRepository implements ReviewRepository {
  constructor(private readonly database: DatabasePort) {}

  async getById(id: string): Promise<ReviewItemRecord | null> {
    const row = await this.database.queryOne<ReviewRow>(`${REVIEW_SELECT} WHERE id = ?`, [id]);
    return row === null ? null : toReviewItem(row);
  }

  async findByConcept(
    examId: string,
    conceptId: string,
    questionId?: string | null,
  ): Promise<ReviewItemRecord | null> {
    // `IS` (not `=`) compares NULLs correctly, so the same query serves the
    // concept-level item and a question-level item.
    const row = await this.database.queryOne<ReviewRow>(
      `${REVIEW_SELECT} WHERE exam_id = ? AND concept_id = ? AND question_id IS ?`,
      [examId, conceptId, questionId ?? null],
    );
    return row === null ? null : toReviewItem(row);
  }

  async upsert(item: ReviewItemRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO review_items
           (id, exam_id, concept_id, question_id, source, due_at, interval_days,
            ease_level, lapses, reviews, last_reviewed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source = excluded.source,
           due_at = excluded.due_at,
           interval_days = excluded.interval_days,
           ease_level = excluded.ease_level,
           lapses = excluded.lapses,
           reviews = excluded.reviews,
           last_reviewed_at = excluded.last_reviewed_at,
           updated_at = excluded.updated_at`,
        [
          item.id,
          item.examId,
          item.conceptId,
          item.questionId,
          item.source,
          item.dueAt,
          item.intervalDays,
          item.easeLevel,
          item.lapses,
          item.reviews,
          item.lastReviewedAt,
          item.createdAt,
          item.updatedAt,
        ],
      );
    });
  }

  async delete(id: string, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`DELETE FROM review_items WHERE id = ?`, [id]);
    });
  }

  async listDue(examId: string, dueBeforeIso: string, limit?: number): Promise<ReviewItemRecord[]> {
    const params: (string | number)[] = [examId, dueBeforeIso];
    let sql = `${REVIEW_SELECT} WHERE exam_id = ? AND due_at <= ? ORDER BY due_at, id`;
    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(Math.max(0, Math.floor(limit)));
    }
    const rows = await this.database.query<ReviewRow>(sql, params);
    return rows.map(toReviewItem);
  }

  async countDue(examId: string, dueBeforeIso: string): Promise<number> {
    const row = await this.database.queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM review_items WHERE exam_id = ? AND due_at <= ?`,
      [examId, dueBeforeIso],
    );
    return row?.count ?? 0;
  }

  async listAll(examId: string, limit = 500): Promise<ReviewItemRecord[]> {
    const rows = await this.database.query<ReviewRow>(
      `${REVIEW_SELECT} WHERE exam_id = ? ORDER BY due_at, id LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toReviewItem);
  }
}

export class SqliteSavedQuestionRepository implements SavedQuestionRepository {
  constructor(private readonly database: DatabasePort) {}

  async isSaved(questionId: string): Promise<boolean> {
    const row = await this.database.queryOne<{ question_id: string }>(
      `SELECT question_id FROM saved_questions WHERE question_id = ?`,
      [questionId],
    );
    return row !== null;
  }

  async save(record: SavedQuestionRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO saved_questions (question_id, exam_id, saved_at) VALUES (?, ?, ?)
         ON CONFLICT(question_id) DO UPDATE SET saved_at = excluded.saved_at`,
        [record.questionId, record.examId, record.savedAt],
      );
    });
  }

  async remove(questionId: string, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`DELETE FROM saved_questions WHERE question_id = ?`, [questionId]);
    });
  }

  async list(examId: string, limit = 200): Promise<SavedQuestionRecord[]> {
    const rows = await this.database.query<{
      question_id: string;
      exam_id: string;
      saved_at: string;
    }>(
      `SELECT question_id, exam_id, saved_at FROM saved_questions
       WHERE exam_id = ? ORDER BY saved_at DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map((row) => ({
      questionId: row.question_id,
      examId: row.exam_id,
      savedAt: row.saved_at,
    }));
  }

  async count(examId: string): Promise<number> {
    const row = await this.database.queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM saved_questions WHERE exam_id = ?`,
      [examId],
    );
    return row?.count ?? 0;
  }
}
