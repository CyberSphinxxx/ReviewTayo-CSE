/**
 * Progress.
 *
 * The half of the app that answers "how am I doing?" from committed evidence: the
 * Study Score and its trend (score), the subject to work on next (needs-attention),
 * concept mastery one layer below the subject summary (mastery), the exam's phases as
 * a timeline (journey), this week's activity against the learner's own goal (week),
 * and the last full simulation (mock). Nothing here imports a screen or a database
 * client; every input is a structural shape a repository row already satisfies.
 */

export {
  DAYS_IN_WEEK,
  WEEK_BAR_LABELS,
  buildWeek,
  type Week,
  type WeekActivityDay,
  type WeekDay,
  type WeekInput,
} from './week';
export {
  MASTERY_SOLID,
  conceptMasteryRows,
  describeMasteryEvidence,
  describeMasteryLine,
  summarizeMastery,
  type ConceptMasteryInput,
  type MasteryRow,
  type MasterySummary,
} from './mastery';
export {
  MOCK_ROW_TITLE,
  mockScorePercent,
  recentMockResult,
  type MockAttempt,
  type RecentMock,
  type RecentMockInput,
} from './mock';
export {
  NO_EXAM_DATE_LINE,
  journeyProgress,
  type Journey,
  type JourneyInput,
  type JourneyStatus,
  type JourneyStop,
} from './journey';
export {
  NEEDS_ATTENTION_ACTION,
  needsAttention,
  type NeedsAttention,
  type NeedsAttentionInput,
} from './needs-attention';
export {
  MS_PER_DAY,
  SCORE_EXPLANATION,
  SCORE_WEIGHTS,
  STUDY_SCORE_LABEL,
  STUDY_SCORE_WEEKS,
  STUDY_SCORE_WINDOW_DAYS,
  TREND_THRESHOLD,
  scoreFrom,
  studyScore,
  type ScoreComponents,
  type ScoreTrend,
  type ScoreTrendSummary,
  type StudyAnswer,
  type StudyScore,
  type StudyScoreInput,
} from './score';
