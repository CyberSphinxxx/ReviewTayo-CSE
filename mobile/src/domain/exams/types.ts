/**
 * Generic exam engine contracts.
 *
 * Nothing here is CSE-specific. Every exam — current or future — is described by
 * an `ExamRuleConfig`, and generic services (practice, quiz, review, mastery,
 * progress, mock, study planning) read that config instead of branching on an exam
 * id. Adding an exam therefore means adding validated content, not screens.
 */

export type ExamId = string;
export type ExamTrackId = string;
export type SubjectId = string;
export type ConceptId = string;
export type QuestionId = string;

/** Difficulty ladder, ordered from easiest to most exam-like. */
export const QUESTION_DIFFICULTIES = ['easy', 'standard', 'challenging', 'exam'] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const QUESTION_STATUSES = ['draft', 'reviewed', 'published', 'retired'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export interface ExamTrack {
  readonly id: ExamTrackId;
  readonly name: string;
  readonly shortName?: string;
  readonly description: string;
  /** Subjects this track examines, in the order they should be presented. */
  readonly subjectIds: readonly SubjectId[];
  /** Per-track blueprint overrides, merged over the exam blueprint. */
  readonly blueprintOverride?: ExamBlueprint;
  /** Per-track timing overrides, merged over the exam timing rules. */
  readonly timingOverride?: TimingRules;
  /** Per-track scoring overrides, merged over the exam scoring rules. */
  readonly scoringOverride?: ScoringRules;
}

export interface SubjectDefinition {
  readonly id: SubjectId;
  readonly name: string;
  readonly shortName: string;
  /** Presentation order within a track. */
  readonly order: number;
  readonly conceptIds: readonly ConceptId[];
  /** Optional grouping label, e.g. "Core" or "Specialised" for a future exam. */
  readonly category?: string;
}

export interface ConceptDefinition {
  readonly id: ConceptId;
  readonly subjectId: SubjectId;
  readonly name: string;
  /** Allows a concept hierarchy without changing how mastery is stored. */
  readonly parentConceptId?: ConceptId;
  readonly tags: readonly string[];
  /** Short learner-facing summary used by Learn and Review Concept. */
  readonly summary?: string;
}

export interface ExamBlueprintSection {
  readonly subjectId: SubjectId;
  readonly questionCount: number;
  /** Restricts a section to specific tracks; omitted means all tracks. */
  readonly trackIds?: readonly ExamTrackId[];
}

export interface ExamBlueprint {
  readonly sections: readonly ExamBlueprintSection[];
  /** Overrides the sum of section counts, for exams with scored/unscored parts. */
  readonly totalItems?: number;
}

export interface TimingRules {
  readonly totalMinutes: number;
  readonly perQuestionSeconds?: number;
  readonly allowPause: boolean;
  /** How long a paused session may stay open before it must be resumed. */
  readonly pauseLimitMinutes?: number;
}

export const SCORING_MODES = ['raw-correct', 'penalty', 'weighted'] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];

export interface ScoringRules {
  readonly mode: ScoringMode;
  readonly pointsPerCorrect: number;
  /** Points deducted per incorrect answer when `mode` is `penalty`. */
  readonly penaltyPerWrong: number;
  /** Passing mark as a fraction of total points. */
  readonly passingPercent?: number;
}

export interface JourneyPhase {
  readonly id: string;
  readonly name: string;
  /** Inclusive lower bound of days remaining for this phase. */
  readonly minDaysRemaining: number;
  readonly description: string;
}

export interface ReviewPolicy {
  /** Interval added when the learner answers "Got it", indexed by mastery level. */
  readonly gotItIntervalDays: readonly number[];
  /** Interval used when the learner answers "Again". */
  readonly againIntervalDays: number;
  /** Safety valve so a long absence never produces an unbounded queue. */
  readonly dailyDueLimit: number;
}

export interface MasteryPolicy {
  readonly levelCount: number;
  /**
   * Weighted-score boundaries that promote a concept, ascending:
   * below `developingThreshold` is Learning, then Developing, Strong, Mastered.
   */
  readonly developingThreshold: number;
  readonly strongThreshold: number;
  readonly masteredThreshold: number;
  readonly correctDelta: number;
  readonly wrongDelta: number;
}

export interface SmartDrillWeights {
  readonly weakness: number;
  readonly dueReview: number;
  readonly unseen: number;
  readonly lowCoverage: number;
  readonly recentLesson: number;
}

export interface StudyPolicy {
  readonly supportsSmartDrill: boolean;
  readonly supportsTimedPractice: boolean;
  readonly supportsDailyQuestion: boolean;
  readonly supportsMasteryRounds: boolean;
  readonly supportsBuildAQuiz: boolean;
  readonly drillSize: number;
  /** Minimum attempts on a subject before it may be named the weakest area. */
  readonly weakestAreaMinimumAttempts: number;
  /** Accuracy below which a subject needs attention, as a fraction. */
  readonly needsAttentionAccuracy: number;
  /** Question count offered by the timed practice mode. */
  readonly timedPracticeQuestionCount: number;
  /** Wall-clock budget for the timed practice mode. */
  readonly timedPracticeMinutes: number;
  /** Rough duration of the single daily question, used in plan copy. */
  readonly dailyQuestionMinutes: number;
  readonly review: ReviewPolicy;
  readonly mastery: MasteryPolicy;
  readonly journeyPhases: readonly JourneyPhase[];
  readonly smartDrillWeights: SmartDrillWeights;
}

export interface ExamRuleConfig {
  readonly id: ExamId;
  readonly version: number;
  readonly name: string;
  readonly shortName: string;
  readonly authority: string;
  readonly description: string;
  readonly tracks: readonly ExamTrack[];
  readonly subjects: readonly SubjectDefinition[];
  readonly concepts: readonly ConceptDefinition[];
  readonly blueprint: ExamBlueprint;
  readonly timing: TimingRules;
  readonly scoring: ScoringRules;
  readonly studyPolicy: StudyPolicy;
  /** Default track for a fresh installation. */
  readonly defaultTrackId: ExamTrackId;
}

export interface QuestionChoice {
  readonly id: string;
  readonly text: string;
}

export interface QuestionSource {
  readonly reference?: string;
  readonly year?: number;
  readonly note?: string;
}

export interface Question {
  readonly id: QuestionId;
  readonly examId: ExamId;
  readonly trackIds: readonly ExamTrackId[];
  readonly subjectId: SubjectId;
  readonly conceptIds: readonly ConceptId[];
  readonly difficulty: QuestionDifficulty;
  readonly cognitiveSkill?: string;
  readonly stem: string;
  readonly choices: readonly QuestionChoice[];
  readonly correctChoiceId: string;
  readonly explanation: string;
  readonly simplifiedExplanation?: string;
  readonly exampleExplanation?: string;
  /** Groups questions that cover the same idea, powering "Try another like this". */
  readonly relatedQuestionGroupId?: string;
  readonly source?: QuestionSource;
  readonly status: QuestionStatus;
  readonly contentVersion: string;
}

export interface ContentManifest {
  readonly examId: ExamId;
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly generatedAt: string;
  readonly minimumAppVersion?: string;
  readonly checksum?: string;
}

/** Raw, unvalidated content pack as read from the bundled JSON files. */
export interface RawContentPack {
  readonly manifest: unknown;
  readonly exam: unknown;
  readonly subjects: unknown;
  readonly concepts: unknown;
  readonly tracks: Readonly<Record<string, unknown>>;
  readonly questions: readonly unknown[];
}

/** A content pack that has passed validation and is safe to persist. */
export interface ExamContentPack {
  readonly manifest: ContentManifest;
  readonly exam: ExamRuleConfig;
  readonly questions: readonly Question[];
}
