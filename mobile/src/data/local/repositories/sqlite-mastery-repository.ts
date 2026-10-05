import type { DatabasePort } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  ConceptMasteryRecord,
  MasteryRepository,
} from '@/data/repositories/mastery-repository';
import type { WriteOptions } from '@/data/repositories/types';

interface MasteryRow {
  concept_id: string;
  exam_id: string;
  correct_count: number;
  wrong_count: number;
  level: number;
  streak: number;
  last_answered_at: string | null;
  updated_at: string;
}

const MASTERY_SELECT = `
  SELECT concept_id, exam_id, correct_count, wrong_count, level, streak,
         last_answered_at, updated_at
  FROM concept_mastery`;

const toMastery = (row: MasteryRow): ConceptMasteryRecord => ({
  conceptId: row.concept_id,
  examId: row.exam_id,
  correctCount: row.correct_count,
  wrongCount: row.wrong_count,
  level: row.level,
  streak: row.streak,
  lastAnsweredAt: row.last_answered_at,
  updatedAt: row.updated_at,
});

export class SqliteMasteryRepository implements MasteryRepository {
  constructor(private readonly database: DatabasePort) {}

  async get(conceptId: string): Promise<ConceptMasteryRecord | null> {
    const row = await this.database.queryOne<MasteryRow>(`${MASTERY_SELECT} WHERE concept_id = ?`, [
      conceptId,
    ]);
    return row === null ? null : toMastery(row);
  }

  async listByExam(examId: string): Promise<ConceptMasteryRecord[]> {
    const rows = await this.database.query<MasteryRow>(
      `${MASTERY_SELECT} WHERE exam_id = ? ORDER BY concept_id`,
      [examId],
    );
    return rows.map(toMastery);
  }

  async save(record: ConceptMasteryRecord, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO concept_mastery
           (concept_id, exam_id, correct_count, wrong_count, level, streak,
            last_answered_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(concept_id) DO UPDATE SET
           exam_id = excluded.exam_id,
           correct_count = excluded.correct_count,
           wrong_count = excluded.wrong_count,
           level = excluded.level,
           streak = excluded.streak,
           last_answered_at = excluded.last_answered_at,
           updated_at = excluded.updated_at`,
        [
          record.conceptId,
          record.examId,
          record.correctCount,
          record.wrongCount,
          record.level,
          record.streak,
          record.lastAnsweredAt,
          record.updatedAt,
        ],
      );
    });
  }

  async saveMany(
    records: readonly ConceptMasteryRecord[],
    options: WriteOptions = {},
  ): Promise<void> {
    if (records.length === 0) return;
    await withTransaction(this.database, options.transaction, async (tx) => {
      for (const record of records) {
        await this.save(record, { transaction: tx });
      }
    });
  }
}
