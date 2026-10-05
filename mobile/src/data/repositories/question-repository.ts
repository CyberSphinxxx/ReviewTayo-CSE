import type {
  ConceptId,
  ExamId,
  ExamTrackId,
  Question,
  QuestionDifficulty,
  QuestionId,
  QuestionStatus,
  SubjectId,
} from '@/domain/exams/types';

/** Filters accepted by question queries. Absent fields mean "no restriction". */
export interface QuestionQuery {
  readonly examId: ExamId;
  readonly trackId?: ExamTrackId;
  readonly subjectId?: SubjectId;
  readonly conceptId?: ConceptId;
  readonly difficulty?: QuestionDifficulty;
  /** Defaults to published only; `any` exists for developer tools and review. */
  readonly status?: QuestionStatus | 'any';
  readonly excludeIds?: readonly QuestionId[];
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Question queries.
 *
 * This repository returns whole validated `Question` objects decoded from the
 * stored payload, because every consumer — session planning, review, progress —
 * needs question content, not just ids. Query shapes follow domain need (a track
 * filter joins the track table) rather than mirroring the storage layout.
 */
export interface QuestionRepository {
  getById(id: QuestionId): Promise<Question | null>;
  /** Returns questions in the requested order; unknown ids are omitted. */
  getByIds(ids: readonly QuestionId[]): Promise<Question[]>;
  listPublished(query: QuestionQuery): Promise<Question[]>;
  countPublished(query: Omit<QuestionQuery, 'limit' | 'offset'>): Promise<number>;
  listByRelatedGroup(groupId: string, excludeIds?: readonly QuestionId[]): Promise<Question[]>;
  /** Published question counts per subject; subjects with none are omitted unless requested. */
  countBySubject(
    examId: ExamId,
    options?: { trackId?: ExamTrackId; subjectIds?: readonly SubjectId[] },
  ): Promise<Record<SubjectId, number>>;
}
