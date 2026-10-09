/**
 * Mock exam.
 *
 * The engine already knows what a paper is: `domain/exams` resolves the blueprint and the
 * clock per track and `buildMockSessionPlan` assembles the items. This module covers the
 * two things a running examination adds — where the learner is inside the paper and how
 * much time is left (progress), and what the finished paper says (result) — and it derives
 * both from the stored session rather than storing a second copy of either.
 */

export {
  MOCK_LOW_TIME_SECONDS,
  answeredCount,
  correctCount,
  describeMockFlagged,
  describeMockProgress,
  describeRemaining,
  describeRemainingRough,
  firstUnansweredIndex,
  flaggedCount,
  isAnswered,
  isExpired,
  isLowOnTime,
  remainingSeconds,
  type MockClock,
  type MockItemState,
} from './progress';
export {
  buildMockResult,
  describeMockScore,
  describeMockSkipped,
  type MockOutcomeItem,
  type MockRecommendation,
  type MockRecommendationKind,
  type MockResult,
  type MockResultInput,
  type MockSubjectResult,
} from './result';
