import { getTrack } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';

/**
 * The most recent mock exam.
 *
 * Progress ends with the last full simulation, because that is the one number that
 * resembles the real thing. The row is read from the stored session — its item count
 * and score are already there — and an unfinished or expired mock is deliberately not
 * this section's business: an attempt the learner can still resume belongs to Home,
 * and an exam they abandoned is not a result to show them again.
 */

export const MOCK_ROW_TITLE = 'Full mock';

/** One stored mock session, structurally compatible with a repository row. */
export interface MockAttempt {
  readonly id: string;
  readonly trackId: string;
  readonly status: string;
  readonly totalItems: number;
  readonly answeredCount: number;
  readonly correctCount: number;
  readonly completedAt: string | null;
}

export interface RecentMock {
  readonly id: string;
  readonly trackId: string;
  readonly title: string;
  /** The track's own name, e.g. `Professional`. */
  readonly trackName: string;
  /** 0–100 of the questions, rounded. */
  readonly scorePercent: number;
  readonly completedAt: string;
  /** `Professional · 68%` */
  readonly subtitle: string;
}

/** 0–100; a mock that stored no items reads as 0 rather than dividing by zero. */
export const mockScorePercent = (attempt: MockAttempt): number => {
  const total = Math.max(0, Math.floor(attempt.totalItems));
  if (total === 0) return 0;
  return Math.round((Math.max(0, attempt.correctCount) / total) * 100);
};

export interface RecentMockInput {
  readonly exam: ExamRuleConfig;
  readonly attempts: readonly MockAttempt[];
}

export const recentMockResult = ({ exam, attempts }: RecentMockInput): RecentMock | null => {
  const completed = attempts
    .filter((attempt) => attempt.status === 'completed' && attempt.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  const latest = completed[0];
  if (latest === undefined) return null;

  const trackName = getTrack(exam, latest.trackId)?.name ?? exam.shortName;
  const scorePercent = mockScorePercent(latest);

  return {
    id: latest.id,
    trackId: latest.trackId,
    title: MOCK_ROW_TITLE,
    trackName,
    scorePercent,
    completedAt: latest.completedAt ?? '',
    subtitle: `${trackName} · ${scorePercent}%`,
  };
};
