import type { ConceptId, ExamId, QuestionId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

export const REVIEW_SOURCES = ['mistake', 'saved', 'manual', 'mock'] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export interface ReviewItemRecord {
  readonly id: string;
  readonly examId: ExamId;
  readonly conceptId: ConceptId;
  /** `null` for a concept-level item; otherwise the specific question. */
  readonly questionId: QuestionId | null;
  readonly source: ReviewSource;
  readonly dueAt: string;
  readonly intervalDays: number;
  readonly easeLevel: number;
  readonly lapses: number;
  readonly reviews: number;
  readonly lastReviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Review queue.
 *
 * Scheduling arithmetic (Again / Got it intervals) belongs to the domain; this
 * repository stores whatever schedule it is handed and answers the two questions
 * the UI asks: what is due, and how many items are due.
 */
export interface ReviewRepository {
  getById(id: string): Promise<ReviewItemRecord | null>;
  /**
   * Finds the single item for a concept (and, when `questionId` is given, for
   * that question); `questionId` null means the concept-level item.
   */
  findByConcept(
    examId: ExamId,
    conceptId: ConceptId,
    questionId?: QuestionId | null,
  ): Promise<ReviewItemRecord | null>;
  upsert(item: ReviewItemRecord, options?: WriteOptions): Promise<void>;
  delete(id: string, options?: WriteOptions): Promise<void>;
  /** Due items ordered oldest first, optionally capped by the exam's daily limit. */
  listDue(examId: ExamId, dueBeforeIso: string, limit?: number): Promise<ReviewItemRecord[]>;
  countDue(examId: ExamId, dueBeforeIso: string): Promise<number>;
  listAll(examId: ExamId, limit?: number): Promise<ReviewItemRecord[]>;
}

export interface SavedQuestionRecord {
  readonly questionId: QuestionId;
  readonly examId: ExamId;
  readonly savedAt: string;
}

export interface SavedQuestionRepository {
  isSaved(questionId: QuestionId): Promise<boolean>;
  save(record: SavedQuestionRecord, options?: WriteOptions): Promise<void>;
  remove(questionId: QuestionId, options?: WriteOptions): Promise<void>;
  list(examId: ExamId, limit?: number): Promise<SavedQuestionRecord[]>;
  count(examId: ExamId): Promise<number>;
}
