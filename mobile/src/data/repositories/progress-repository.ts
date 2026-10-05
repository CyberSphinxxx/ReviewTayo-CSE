import type { ExamId } from '@/domain/exams/types';

import type { WriteOptions } from './types';

/** One calendar day of study activity, keyed by local date (`YYYY-MM-DD`). */
export interface ActivityDayRecord {
  readonly day: string;
  readonly examId: ExamId;
  readonly questionsAnswered: number;
  readonly correctCount: number;
  readonly minutes: number;
  readonly goalMet: boolean;
  readonly updatedAt: string;
}

export interface RecordQuestionInput {
  readonly day: string;
  readonly examId: ExamId;
  readonly correct: boolean;
  readonly minutes?: number;
  /** Once true for a day it stays true; a later short session cannot unmeet a goal. */
  readonly goalMet?: boolean;
  readonly updatedAt?: string;
}

export interface ActivityRepository {
  get(day: string, examId: ExamId): Promise<ActivityDayRecord | null>;
  /** Increments the day's counters in one statement so callers need no read-modify-write. */
  recordQuestion(input: RecordQuestionInput, options?: WriteOptions): Promise<void>;
  listRange(examId: ExamId, fromDay: string, toDay: string): Promise<ActivityDayRecord[]>;
  listRecent(examId: ExamId, limit?: number): Promise<ActivityDayRecord[]>;
}
