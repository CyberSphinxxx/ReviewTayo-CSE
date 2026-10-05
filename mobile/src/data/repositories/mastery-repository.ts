import type { ConceptId, ExamId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

/**
 * Mastery for one concept.
 *
 * `level` is computed by the domain from the exam's mastery policy — the data
 * layer stores it but never decides it, so changing a policy never requires a
 * migration, only a recomputation.
 */
export interface ConceptMasteryRecord {
  readonly conceptId: ConceptId;
  readonly examId: ExamId;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly level: number;
  readonly streak: number;
  readonly lastAnsweredAt: string | null;
  readonly updatedAt: string;
}

export interface MasteryRepository {
  get(conceptId: ConceptId): Promise<ConceptMasteryRecord | null>;
  listByExam(examId: ExamId): Promise<ConceptMasteryRecord[]>;
  save(record: ConceptMasteryRecord, options?: WriteOptions): Promise<void>;
  saveMany(records: readonly ConceptMasteryRecord[], options?: WriteOptions): Promise<void>;
}
