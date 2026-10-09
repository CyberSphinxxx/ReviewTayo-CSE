import { getSubject, resolveScoring, sectionsForTrack } from '@/domain/exams';
import type { ExamRuleConfig, ExamTrackId } from '@/domain/exams/types';

/**
 * A mock exam's result.
 *
 * The paper is scored the way the exam's own `ScoringRules` say it is, per section, and
 * the breakdown is reported in the blueprint's own order — the learner sees the sections
 * they will actually sit. Unanswered items count as wrong, exactly as they will on the
 * day, so a paper abandoned halfway cannot look like a good score.
 *
 * The result is derived from the stored items every time it is shown rather than frozen
 * into a payload: mastery, activity and the review queue are all derived from answers for
 * the same reason (D-029), and one reconstruction path means the result screen and the
 * Progress row can never disagree about the same attempt.
 */

/** One answered (or skipped) item, already resolved to its subject. */
export interface MockOutcomeItem {
  readonly subjectId: string;
  readonly answered: boolean;
  readonly isCorrect: boolean | null;
}

export interface MockSubjectResult {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly total: number;
  readonly answered: number;
  readonly correct: number;
  /** 0–100 of the section's items, rounded. */
  readonly percent: number;
  /** True for the weakest section that had any answers. */
  readonly isWeakest: boolean;
}

export type MockRecommendationKind = 'retake' | 'weakest-area' | 'review' | 'progress';

export interface MockRecommendation {
  readonly kind: MockRecommendationKind;
  readonly title: string;
  readonly description: string;
  /** The steps, joined with arrows on the card: `Review mistakes → Smart Drill`. */
  readonly steps: readonly string[];
  /** Set for `weakest-area`, so the action can filter to it. */
  readonly subjectId: string | null;
  readonly count: number;
}

export interface MockResult {
  readonly total: number;
  readonly answered: number;
  readonly correct: number;
  readonly skipped: number;
  /** 0–100 of the paper's items — what the exam would mark. */
  readonly scorePercent: number;
  /** The exam's own passing mark as a percentage, or `null` when it declares none. */
  readonly passingPercent: number | null;
  /** `Passing mark 80%` — context, never a verdict. */
  readonly passingLabel: string | null;
  readonly subjects: readonly MockSubjectResult[];
  readonly weakestSubjectId: string | null;
  /** True when the clock ran out and the paper was submitted as it stood. */
  readonly expired: boolean;
  readonly recommendation: MockRecommendation;
}

export interface MockResultInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: ExamTrackId;
  readonly items: readonly MockOutcomeItem[];
  readonly expired?: boolean;
}

const percentOf = (correct: number, total: number): number =>
  total <= 0 ? 0 : Math.round((correct / total) * 100);

/** Per-section breakdown, in the order the exam presents its sections. */
const subjectResults = (
  exam: ExamRuleConfig,
  trackId: ExamTrackId,
  items: readonly MockOutcomeItem[],
): readonly MockSubjectResult[] => {
  const sections = sectionsForTrack(exam, trackId);
  const seen = new Set<string>();
  const rows: MockSubjectResult[] = [];

  for (const section of [...sections, ...items.map((item) => ({ subjectId: item.subjectId }))]) {
    if (seen.has(section.subjectId)) continue;
    seen.add(section.subjectId);
    const own = items.filter((item) => item.subjectId === section.subjectId);
    if (own.length === 0) continue;
    const correct = own.filter((item) => item.isCorrect === true).length;
    rows.push({
      subjectId: section.subjectId,
      subjectName: getSubject(exam, section.subjectId)?.name ?? 'This exam',
      total: own.length,
      answered: own.filter((item) => item.answered).length,
      correct,
      percent: percentOf(correct, own.length),
      isWeakest: false,
    });
  }

  const judgeable = rows.filter((row) => row.answered > 0);
  const weakest = judgeable.reduce<MockSubjectResult | null>(
    (worst, row) => (worst === null || row.percent < worst.percent ? row : worst),
    null,
  );

  return rows.map((row) => ({
    ...row,
    isWeakest: weakest !== null && row.subjectId === weakest.subjectId,
  }));
};

/**
 * What to do next, in the order the app can be honest about it: a paper that was cut
 * short is worth sitting properly before anything is concluded from it, a section under
 * the exam's own attention threshold names itself, and a paper without misses is only a
 * reason to keep going.
 */
const recommendationFor = (
  exam: ExamRuleConfig,
  result: Omit<MockResult, 'recommendation'>,
): MockRecommendation => {
  const count = Math.max(1, exam.studyPolicy.drillSize);
  const steps = ['Review mistakes', 'Smart Drill', 'Mock again'] as const;
  const weakest = result.subjects.find((row) => row.isWeakest) ?? null;

  if (result.expired || result.answered * 2 < result.total) {
    return {
      kind: 'retake',
      title: 'Sit a full simulation',
      description:
        result.expired && result.answered * 2 < result.total
          ? 'The clock ran out before you reached every item. A full paper is the only honest measure.'
          : 'You left most of the paper unanswered. Try one in a single sitting.',
      steps,
      subjectId: null,
      count,
    };
  }

  if (weakest !== null && weakest.percent < exam.studyPolicy.needsAttentionAccuracy * 100) {
    return {
      kind: 'weakest-area',
      title: `Focus on ${weakest.subjectName}`,
      description: `${weakest.percent}% there — the section with the most room to improve.`,
      steps,
      subjectId: weakest.subjectId,
      count,
    };
  }

  if (result.correct < result.total) {
    return {
      kind: 'review',
      title: 'Take your misses to Review',
      description: 'Every item you got wrong is queued, and comes back when it is due.',
      steps: ['Review mistakes', 'Smart Drill', 'Mock again'],
      subjectId: null,
      count,
    };
  }

  return {
    kind: 'progress',
    title: 'A clean paper',
    description: 'Nothing missed in this simulation. Keep the rhythm going.',
    steps: ['Quick sheets', 'Timed practice', 'Mock again'],
    subjectId: null,
    count,
  };
};

export const buildMockResult = ({
  exam,
  trackId,
  items,
  expired = false,
}: MockResultInput): MockResult => {
  const total = items.length;
  const answered = items.filter((item) => item.answered).length;
  const correct = items.filter((item) => item.isCorrect === true).length;
  const scoring = resolveScoring(exam, trackId);
  const passingPercent =
    scoring.passingPercent === undefined ? null : Math.round(scoring.passingPercent * 100);

  const subjects = subjectResults(exam, trackId, items);
  const partial: Omit<MockResult, 'recommendation'> = {
    total,
    answered,
    correct,
    skipped: Math.max(0, total - answered),
    scorePercent: percentOf(correct, total),
    passingPercent,
    passingLabel: passingPercent === null ? null : `Passing mark ${passingPercent}%`,
    subjects,
    weakestSubjectId: subjects.find((row) => row.isWeakest)?.subjectId ?? null,
    expired,
  };

  return { ...partial, recommendation: recommendationFor(exam, partial) };
};

/** `82%` — the score as the result screen writes it. */
export const describeMockScore = (result: MockResult): string => `${result.scorePercent}%`;

/** `12 skipped · 3 wrong`, or an empty string when nothing was left out. */
export const describeMockSkipped = (result: MockResult): string => {
  const wrong = Math.max(0, result.answered - result.correct);
  const parts: string[] = [];
  if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
  if (wrong > 0) parts.push(`${wrong} wrong`);
  return parts.join(' · ');
};
