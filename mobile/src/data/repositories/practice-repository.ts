import type { ConceptId, ExamId, ExamTrackId, QuestionId, SubjectId } from '@/domain/exams/types';
import type { SessionMode } from '@/domain/exams/session-plan';

import type { WriteOptions } from './types';

export const PRACTICE_SESSION_STATUSES = [
  'in-progress',
  'paused',
  'completed',
  'abandoned',
] as const;
export type PracticeSessionStatus = (typeof PRACTICE_SESSION_STATUSES)[number];

export interface PracticeSessionRecord {
  readonly id: string;
  readonly examId: ExamId;
  readonly trackId: ExamTrackId;
  readonly mode: SessionMode;
  readonly status: PracticeSessionStatus;
  readonly requestedCount: number;
  readonly correctCount: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly durationSeconds: number;
  readonly timeLimitSeconds: number | null;
  readonly timeRemainingSeconds: number | null;
}

export interface SessionQuestionRecord {
  readonly sessionId: string;
  readonly questionId: QuestionId;
  readonly position: number;
}

/** What produced an answer; mock and review answers are excluded from some stats. */
export const ANSWER_SOURCES = [
  'practice',
  'review',
  'daily-question',
  'mock',
  'diagnostic',
] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

export interface AnswerRecord {
  readonly id: string;
  readonly sessionId: string | null;
  readonly questionId: QuestionId;
  readonly examId: ExamId;
  readonly subjectId: SubjectId;
  /** Concepts that were true when the answer was given; history is immutable. */
  readonly conceptIds: readonly ConceptId[];
  readonly chosenChoiceId: string;
  readonly correctChoiceId: string;
  readonly isCorrect: boolean;
  readonly source: AnswerSource;
  readonly answeredAt: string;
  readonly timeSpentSeconds: number | null;
}

export interface SubjectAccuracy {
  readonly subjectId: SubjectId;
  readonly answered: number;
  readonly correct: number;
}

export interface PracticeSessionPatch {
  readonly status?: PracticeSessionStatus;
  readonly correctCount?: number;
  readonly updatedAt?: string;
  readonly completedAt?: string | null;
  readonly durationSeconds?: number;
  readonly timeRemainingSeconds?: number | null;
}

export interface PracticeSessionRepository {
  /** Creates the session and its question order atomically. */
  create(
    session: PracticeSessionRecord,
    questionIds: readonly QuestionId[],
    options?: WriteOptions,
  ): Promise<void>;
  getById(id: string): Promise<PracticeSessionRecord | null>;
  /** The session's questions in presentation order. */
  listQuestions(sessionId: string): Promise<SessionQuestionRecord[]>;
  /** The most recently touched session that can still be resumed, if any. */
  findResumable(examId: ExamId): Promise<PracticeSessionRecord | null>;
  update(id: string, patch: PracticeSessionPatch, options?: WriteOptions): Promise<void>;
  listRecent(examId: ExamId, limit?: number): Promise<PracticeSessionRecord[]>;
  countCompleted(examId: ExamId): Promise<number>;
}

export interface AnswerRepository {
  record(answer: AnswerRecord, options?: WriteOptions): Promise<void>;
  findBySessionAndQuestion(sessionId: string, questionId: QuestionId): Promise<AnswerRecord | null>;
  listBySession(sessionId: string): Promise<AnswerRecord[]>;
  listRecent(examId: ExamId, limit?: number): Promise<AnswerRecord[]>;
  /** Accuracy per subject across every answer source; used by Progress and drills. */
  subjectAccuracy(examId: ExamId): Promise<SubjectAccuracy[]>;
  countAnswered(examId: ExamId): Promise<number>;
}
