import { conceptsForTrack } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';
import { toIsoDate } from '@/domain/study-plan';

/**
 * The Study Score.
 *
 * Progress has to put one number on "how am I doing?" without pretending to know
 * whether the learner will pass. The score is therefore built only from things the
 * app can see, each of which a learner can act on:
 *
 * - accuracy: the share of answers that were right in the window;
 * - coverage: how much of the track's syllabus was touched in the window;
 * - consistency: how many of the window's days had any work in it.
 *
 * The weights are the exam-agnostic shape of that judgement, not a prediction, and
 * the score is expressed out of 100 so it reads as a mark rather than a probability.
 * Because the same arithmetic runs over any seven-day window, the screen can compare
 * this week with last week and plot the six weeks behind it without storing anything:
 * every point is computed from the answer history that already exists.
 */

/** One answer, structurally compatible with a stored answer row. */
export interface StudyAnswer {
  readonly conceptIds: readonly string[];
  readonly isCorrect: boolean;
  readonly answeredAt: string;
}

/** The three ingredients, each 0–1, exposed so the screen and tests can see them. */
export interface ScoreComponents {
  readonly accuracy: number;
  readonly coverage: number;
  readonly consistency: number;
}

export const STUDY_SCORE_LABEL = 'Study Score';

/** Every window the score is measured over is one week. */
export const STUDY_SCORE_WINDOW_DAYS = 7;

/** How many weeks of history the trend line draws: this week and five behind it. */
export const STUDY_SCORE_WEEKS = 6;

/**
 * Accuracy carries the most weight because it is what the exam actually measures;
 * coverage comes next, because a high accuracy over a third of the syllabus is not
 * the same achievement as a high accuracy over all of it; consistency is the tie
 * breaker that rewards steady work over one long session.
 */
export const SCORE_WEIGHTS = { accuracy: 0.5, coverage: 0.35, consistency: 0.15 } as const;

/** Points of movement before the week-over-week line is willing to call it a change. */
export const TREND_THRESHOLD = 3;

export const MS_PER_DAY = 86_400_000;

export type ScoreTrend = 'improving' | 'steady' | 'slipping' | 'unknown';

export interface ScoreTrendSummary {
  readonly direction: ScoreTrend;
  /** The line under the score, arrow included. */
  readonly label: string;
  /** This week minus last week, in score points. */
  readonly delta: number;
}

export interface StudyScore {
  /** 0–100, the number the screen shows. */
  readonly value: number;
  readonly components: ScoreComponents;
  /** Weekly scores, oldest first, ending with the week that ends today. */
  readonly series: readonly number[];
  readonly trend: ScoreTrendSummary;
}

export interface StudyScoreInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  /** The learner's answers, newest first or any order; only the window matters. */
  readonly answers: readonly StudyAnswer[];
  readonly now: Date;
  readonly weeks?: number;
}

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const componentsIn = (
  answers: readonly StudyAnswer[],
  fromMs: number,
  toMs: number,
  conceptCount: number,
): ScoreComponents => {
  const inWindow = answers.filter((answer) => {
    const at = Date.parse(answer.answeredAt);
    return Number.isFinite(at) && at >= fromMs && at < toMs;
  });

  const correct = inWindow.filter((answer) => answer.isCorrect).length;
  const covered = new Set(inWindow.flatMap((answer) => answer.conceptIds));
  const days = new Set(inWindow.map((answer) => toIsoDate(new Date(answer.answeredAt))));

  return {
    accuracy: inWindow.length === 0 ? 0 : correct / inWindow.length,
    coverage: conceptCount === 0 ? 0 : covered.size / conceptCount,
    consistency: clamp01(days.size / STUDY_SCORE_WINDOW_DAYS),
  };
};

/** 0–100 from the three components; the one place the weights are applied. */
export const scoreFrom = (components: ScoreComponents): number =>
  Math.round(
    100 *
      (clamp01(components.accuracy) * SCORE_WEIGHTS.accuracy +
        clamp01(components.coverage) * SCORE_WEIGHTS.coverage +
        clamp01(components.consistency) * SCORE_WEIGHTS.consistency),
  );

const trendFrom = (thisWeek: number, lastWeek: number, hasAnswers: boolean): ScoreTrendSummary => {
  if (!hasAnswers) {
    return { direction: 'unknown', label: 'Not enough history yet', delta: 0 };
  }
  const delta = thisWeek - lastWeek;
  if (delta >= TREND_THRESHOLD) {
    return { direction: 'improving', label: '↑ Improving this week', delta };
  }
  if (delta <= -TREND_THRESHOLD) {
    return { direction: 'slipping', label: '↓ Slipping this week', delta };
  }
  return { direction: 'steady', label: '→ Holding steady this week', delta };
};

/**
 * The score, its six weekly points and the week-over-week line.
 *
 * The series runs oldest first and its last two points are exactly this week and last
 * week, so the line under the number and the end of the curve always agree.
 */
export const studyScore = ({
  exam,
  trackId,
  answers,
  now,
  weeks = STUDY_SCORE_WEEKS,
}: StudyScoreInput): StudyScore => {
  const conceptCount = conceptsForTrack(exam, trackId).length;
  const span = Math.max(1, Math.floor(weeks));
  const nowMs = now.getTime();
  const windowMs = STUDY_SCORE_WINDOW_DAYS * MS_PER_DAY;

  const points: number[] = [];
  for (let index = span - 1; index >= 0; index -= 1) {
    const end = nowMs - index * windowMs;
    points.push(scoreFrom(componentsIn(answers, end - windowMs, end, conceptCount)));
  }

  const value = points[points.length - 1] ?? 0;
  const lastWeek = points[points.length - 2] ?? 0;

  return {
    value,
    components: componentsIn(answers, nowMs - windowMs, nowMs, conceptCount),
    series: points,
    trend: trendFrom(value, lastWeek, answers.length > 0),
  };
};

/** The line that says what the number is, so it is never read as a probability. */
export const SCORE_EXPLANATION = 'Accuracy, syllabus covered and how steadily you study.';
