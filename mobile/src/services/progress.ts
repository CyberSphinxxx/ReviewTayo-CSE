import type { Repositories } from '@/data/repositories';
import { getSubject } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';
import { subjectProgressRows } from '@/domain/learn';
import {
  buildWeek,
  conceptMasteryRows,
  journeyProgress,
  needsAttention,
  recentMockResult,
  studyScore,
  summarizeMastery,
  type Journey,
  type MasteryRow,
  type MasterySummary,
  type NeedsAttention,
  type StudyScore,
  type Week,
} from '@/domain/progress';
import { describeReviewedWhen } from '@/domain/review';
import { describeAccuracyPercent } from '@/domain/sessions';
import { startOfWeek, toIsoDate } from '@/domain/study-plan';

/**
 * Progress.
 *
 * Everything the tab shows is assembled here from committed state: the score from the
 * answer history, needs-attention from the same subject accuracy Practice uses, mastery
 * from the exam's own derivation, the journey from the exam date, the week from the
 * activity rows, and the last mock from its stored session. Nothing is cached and
 * nothing is invented — a section without enough evidence to be honest is absent or
 * says so, which is why `needsAttention` and `recentMock` are nullable.
 */

/** How much answer history the score is read from: six weeks of daily study. */
export const ANSWERS_HISTORY_LIMIT = 1000;

/** How many stored mock sessions are scanned for the most recent completed one. */
export const MOCK_HISTORY_LIMIT = 5;

export interface ProgressSubjectRow {
  readonly subjectId: string;
  readonly name: string;
  /** `62%` — the number beside the bar. */
  readonly percent: string;
  /** 0–1, exact; drives the bar. */
  readonly accuracy: number;
  /** `62% accuracy · 1 of 6 mastered` */
  readonly line: string;
  readonly started: boolean;
  /** True for the subject Needs Attention names. */
  readonly isWeakest: boolean;
}

export interface RecentMockRow {
  readonly id: string;
  /** `Full mock · 3 days ago` */
  readonly title: string;
  /** `Professional · 68%` */
  readonly subtitle: string;
  readonly scorePercent: number;
}

export interface ProgressOverview {
  readonly score: StudyScore;
  readonly needsAttention: NeedsAttention | null;
  readonly subjects: readonly ProgressSubjectRow[];
  readonly mastery: MasterySummary;
  readonly journey: Journey;
  readonly week: Week;
  readonly recentMock: RecentMockRow | null;
}

export interface LoadProgressInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly examDate: string | null;
  readonly dailyGoal: number;
  /** The learner's chosen study days, as stored: `['Mon', 'Wed', 'Fri']`. */
  readonly studyDays: readonly string[];
  readonly now?: Date;
}

export const loadProgressOverview = async ({
  repositories,
  exam,
  trackId,
  examDate,
  dailyGoal,
  studyDays,
  now = new Date(),
}: LoadProgressInput): Promise<ProgressOverview> => {
  const day = toIsoDate(now);
  const [answers, activity, evidence, accuracy, mocks] = await Promise.all([
    repositories.answers.listRecent(exam.id, ANSWERS_HISTORY_LIMIT),
    repositories.activity.listRange(exam.id, startOfWeek(now), day),
    repositories.mastery.listByExam(exam.id),
    repositories.answers.subjectAccuracy(exam.id),
    repositories.mock.listRecent(exam.id, MOCK_HISTORY_LIMIT),
  ]);

  const policy = exam.studyPolicy;
  const weakness = needsAttention({ exam, trackId, accuracy, policy });
  const masteryRows = conceptMasteryRows({
    exam,
    trackId,
    evidence,
    policy: policy.mastery,
  });
  const week = buildWeek({ days: activity, now, dailyGoal, studyDays });
  const mock = recentMockResult({ exam, attempts: mocks });

  return {
    score: studyScore({ exam, trackId, answers, now }),
    needsAttention: weakness,
    // Subject accuracy is Learn's own derivation, reused rather than recomputed: the
    // two screens must never disagree about how a subject is doing.
    subjects: subjectProgressRows(exam, trackId, accuracy, evidence, policy.mastery).map((row) => ({
      subjectId: row.subjectId,
      name: row.name,
      percent: describeAccuracyPercent(row.accuracy),
      accuracy: row.accuracy,
      line: row.subtitle,
      started: row.started,
      isWeakest: weakness !== null && weakness.subjectId === row.subjectId,
    })),
    mastery: summarizeMastery(masteryRows),
    journey: journeyProgress({ exam, examDate, now }),
    week,
    recentMock:
      mock === null
        ? null
        : {
            id: mock.id,
            title: `${mock.title} · ${describeReviewedWhen(mock.completedAt, now)}`,
            subtitle: mock.subtitle,
            scorePercent: mock.scorePercent,
          },
  };
};

export const MASTERY_LIST_TITLE = 'Concept mastery';

export interface ConceptMasteryList {
  readonly title: string;
  /** The summary line: `3 of 22 mastered · 9 started`. */
  readonly subtitle: string;
  readonly rows: readonly MasteryRow[];
  /** True when the list is one subject of the track rather than the whole syllabus. */
  readonly isSubject: boolean;
}

export interface LoadConceptMasteryInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly subjectId?: string;
}

/**
 * The drill-down behind the Concept mastery row and behind any subject's accuracy row:
 * the same rows, weakest first, optionally narrowed to one subject.
 */
export const loadConceptMastery = async ({
  repositories,
  exam,
  trackId,
  subjectId,
}: LoadConceptMasteryInput): Promise<ConceptMasteryList> => {
  const evidence = await repositories.mastery.listByExam(exam.id);
  const rows = conceptMasteryRows({
    exam,
    trackId,
    evidence,
    policy: exam.studyPolicy.mastery,
    ...(subjectId === undefined ? {} : { subjectId }),
  });
  const subject = subjectId === undefined ? null : getSubject(exam, subjectId);

  return {
    title: subject?.name ?? MASTERY_LIST_TITLE,
    subtitle: summarizeMastery(rows).line,
    rows,
    isSubject: subject !== null,
  };
};
