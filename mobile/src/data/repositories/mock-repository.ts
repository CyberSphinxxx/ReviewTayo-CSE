import type { ExamId, ExamTrackId, QuestionId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

export const MOCK_SESSION_STATUSES = ['in-progress', 'paused', 'completed', 'expired'] as const;
export type MockSessionStatus = (typeof MOCK_SESSION_STATUSES)[number];

export interface MockSessionRecord {
  readonly id: string;
  readonly examId: ExamId;
  readonly trackId: ExamTrackId;
  readonly status: MockSessionStatus;
  readonly totalItems: number;
  readonly answeredCount: number;
  readonly correctCount: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  /** Wall-clock deadline; a mock must not become an unbounded open tab. */
  readonly expiresAt: string;
  readonly pausedAt: string | null;
  readonly remainingSeconds: number | null;
  /** Serialized result summary once submitted. */
  readonly payload: unknown;
}

export interface MockItemRecord {
  readonly mockSessionId: string;
  readonly questionId: QuestionId;
  readonly position: number;
  readonly chosenChoiceId: string | null;
  readonly isCorrect: boolean | null;
  readonly flagged: boolean;
  readonly answeredAt: string | null;
}

export interface MockSessionPatch {
  readonly status?: MockSessionStatus;
  readonly answeredCount?: number;
  readonly correctCount?: number;
  readonly updatedAt?: string;
  readonly completedAt?: string | null;
  readonly pausedAt?: string | null;
  readonly remainingSeconds?: number | null;
  readonly payload?: unknown;
}

export interface MockItemPatch {
  readonly chosenChoiceId?: string | null;
  readonly isCorrect?: boolean | null;
  readonly flagged?: boolean;
  readonly answeredAt?: string | null;
}

export interface MockSessionRepository {
  /** Creates the session and its item order atomically. */
  create(
    session: MockSessionRecord,
    items: readonly MockItemRecord[],
    options?: WriteOptions,
  ): Promise<void>;
  getById(id: string): Promise<MockSessionRecord | null>;
  listItems(mockSessionId: string): Promise<MockItemRecord[]>;
  /** The most recently touched unfinished mock that can still be resumed. */
  findResumable(examId: ExamId): Promise<MockSessionRecord | null>;
  updateSession(id: string, patch: MockSessionPatch, options?: WriteOptions): Promise<void>;
  /** Upserts one item's answer and flag state. */
  saveItem(
    mockSessionId: string,
    questionId: QuestionId,
    patch: MockItemPatch,
    options?: WriteOptions,
  ): Promise<void>;
  listRecent(examId: ExamId, limit?: number): Promise<MockSessionRecord[]>;
}
