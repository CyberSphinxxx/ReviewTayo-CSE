import type { DatabaseTransaction } from '@/data/local/database-port';
import type {
  ConceptDefinition,
  ConceptId,
  ExamContentPack,
  ExamId,
  SubjectDefinition,
  SubjectId,
} from '@/domain/exams/types';

/** Summary of the validated content currently stored for one exam. */
export interface StoredExamRecord {
  readonly examId: ExamId;
  readonly name: string;
  readonly shortName: string;
  readonly version: number;
  readonly contentVersion: string;
  readonly importedAt: string;
  readonly questionCount: number;
}

export interface ReplaceExamOptions {
  readonly importedAt?: string;
  readonly transaction?: DatabaseTransaction;
}

/**
 * Persistence boundary for exam content.
 *
 * Content for one exam is replaced wholesale inside a single transaction, so an
 * interrupted import can never leave a subject without its questions. Learner
 * history is untouched by design: answers store question ids and the concept ids
 * that were true when they were given, never foreign keys into content.
 */
export interface ExamContentRepository {
  getStoredExam(examId: ExamId): Promise<StoredExamRecord | null>;
  listStoredExams(): Promise<StoredExamRecord[]>;
  /** Replaces every stored subject, concept and question for the exam. */
  replaceExam(pack: ExamContentPack, options?: ReplaceExamOptions): Promise<void>;
  deleteExam(examId: ExamId, options?: { transaction?: DatabaseTransaction }): Promise<void>;
  listSubjects(examId: ExamId): Promise<SubjectDefinition[]>;
  listConcepts(examId: ExamId, subjectId?: SubjectId): Promise<ConceptDefinition[]>;
  getConcept(examId: ExamId, conceptId: ConceptId): Promise<ConceptDefinition | null>;
  /** Import bookkeeping (`content_meta`) used to skip unchanged packs at startup. */
  getMeta(key: string): Promise<string | null>;
  setMeta(
    key: string,
    value: string,
    options?: { updatedAt?: string; transaction?: DatabaseTransaction },
  ): Promise<void>;
}
