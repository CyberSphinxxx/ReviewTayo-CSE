import type {
  ConceptId,
  ExamRuleConfig,
  ExamTrackId,
  Question,
  QuestionDifficulty,
  QuestionId,
  SubjectId,
} from './types';

import { planAllocation, sectionsForTrack, type MockAllocationPlan } from './blueprint';

/**
 * Generic session planning.
 *
 * Every practice mode — Smart Drill, weakest area, timed practice, a random set, a
 * custom quiz, mastery rounds, practice by subject, the daily question and the full
 * mock — is assembled here from a request. Nothing in this file knows what CSE is:
 * exam differences arrive through `ExamRuleConfig` and the request, which is the
 * contract a future exam inherits for free.
 */

export type SessionMode =
  | 'smart-drill'
  | 'weakest-area'
  | 'timed-practice'
  | 'random-set'
  | 'build-a-quiz'
  | 'mastery-rounds'
  | 'practice-by-subject'
  | 'daily-question'
  | 'review-due'
  | 'mock-exam'
  | 'try-another-like-this';

export interface SessionRequest {
  readonly mode: SessionMode;
  readonly trackId: ExamTrackId;
  readonly questionCount: number;
  readonly subjectIds?: readonly SubjectId[];
  readonly conceptIds?: readonly ConceptId[];
  readonly difficulties?: readonly QuestionDifficulty[];
  /** Questions already answered in a linked session, kept out of the new one. */
  readonly excludeQuestionIds?: readonly QuestionId[];
  /** Allows the caller to force spacing behaviour, e.g. mastery rounds. */
  readonly requireSpreadAcrossConcepts?: boolean;
}

export interface SessionPlan {
  readonly examId: string;
  readonly trackId: ExamTrackId;
  readonly mode: SessionMode;
  readonly questions: readonly Question[];
  readonly requestedCount: number;
  readonly plannedCount: number;
  readonly shortfall: boolean;
  readonly subjectMix: Readonly<Record<SubjectId, number>>;
}

export interface PlanDependencies {
  /** Injected randomness keeps plans deterministically testable. */
  readonly random?: () => number;
}

const defaultRandom = (): number => Math.random();

/** Deterministic Fisher–Yates shuffle driven by the injected generator. */
export const shuffle = <T>(items: readonly T[], random: () => number): readonly T[] => {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = output[index];
    const other = output[swapWith];
    if (current === undefined || other === undefined) continue;
    output[index] = other;
    output[swapWith] = current;
  }
  return output;
};

const matchesRequest = (
  question: Question,
  exam: ExamRuleConfig,
  request: SessionRequest,
): boolean => {
  if (question.examId !== exam.id) return false;
  if (question.status !== 'published') return false;
  if (!question.trackIds.includes(request.trackId)) return false;
  if (request.subjectIds !== undefined && !request.subjectIds.includes(question.subjectId)) {
    return false;
  }
  if (
    request.conceptIds !== undefined &&
    !question.conceptIds.some((conceptId) => request.conceptIds?.includes(conceptId))
  ) {
    return false;
  }
  if (request.difficulties !== undefined && !request.difficulties.includes(question.difficulty)) {
    return false;
  }
  if (request.excludeQuestionIds?.includes(question.id) === true) return false;
  return true;
};

/**
 * Picks a spread of questions across concepts before allowing a second question on
 * the same concept. A session that asks four questions about one concept teaches
 * less than one that samples four different ones.
 */
const spreadAcrossConcepts = (
  candidates: readonly Question[],
  random: () => number,
): readonly Question[] => {
  const byConcept = new Map<string, Question[]>();
  for (const question of candidates) {
    const key = question.conceptIds[0] ?? 'unassigned';
    const bucket = byConcept.get(key);
    if (bucket === undefined) byConcept.set(key, [question]);
    else bucket.push(question);
  }

  const conceptKeys = shuffle([...byConcept.keys()], random);
  const ordered: Question[] = [];
  const leftover: Question[] = [];
  for (const key of conceptKeys) {
    const bucket = shuffle(byConcept.get(key) ?? [], random);
    for (let index = 0; index < bucket.length; index += 1) {
      const question = bucket[index];
      if (question === undefined) continue;
      if (index === 0) ordered.push(question);
      else leftover.push(question);
    }
  }
  return [...ordered, ...shuffle(leftover, random)];
};

const summarizePlan = (
  exam: ExamRuleConfig,
  request: SessionRequest,
  questions: readonly Question[],
): SessionPlan => {
  const subjectMix: Record<SubjectId, number> = {};
  for (const subject of exam.subjects) subjectMix[subject.id] = 0;
  for (const question of questions) {
    subjectMix[question.subjectId] = (subjectMix[question.subjectId] ?? 0) + 1;
  }
  return {
    examId: exam.id,
    trackId: request.trackId,
    mode: request.mode,
    questions,
    requestedCount: request.questionCount,
    plannedCount: questions.length,
    shortfall: questions.length < request.questionCount,
    subjectMix,
  };
};

/**
 * Builds a practice session for any mode. Duplicate questions never appear twice
 * in one session, and a shortfall is reported instead of silently returning fewer
 * questions than the learner asked for.
 */
export const buildSessionPlan = (
  exam: ExamRuleConfig,
  questions: readonly Question[],
  request: SessionRequest,
  dependencies: PlanDependencies = {},
): SessionPlan => {
  const random = dependencies.random ?? defaultRandom;
  const requested = Math.max(0, Math.floor(request.questionCount));
  if (requested === 0) return summarizePlan(exam, request, []);

  const seen = new Set<QuestionId>();
  const candidates: Question[] = [];
  for (const question of questions) {
    if (seen.has(question.id)) continue;
    if (!matchesRequest(question, exam, request)) continue;
    seen.add(question.id);
    candidates.push(question);
  }

  const ordered =
    request.requireSpreadAcrossConcepts === false
      ? shuffle(candidates, random)
      : spreadAcrossConcepts(candidates, random);

  return summarizePlan(exam, request, ordered.slice(0, requested));
};

/** Builds one question for the Home daily question, preferring unseen material. */
export const buildDailyQuestionPlan = (
  exam: ExamRuleConfig,
  questions: readonly Question[],
  trackId: ExamTrackId,
  excludeQuestionIds: readonly QuestionId[] = [],
  dependencies: PlanDependencies = {},
): SessionPlan =>
  buildSessionPlan(
    exam,
    questions,
    {
      mode: 'daily-question',
      trackId,
      questionCount: 1,
      excludeQuestionIds,
    },
    dependencies,
  );

export interface MockSessionPlan {
  readonly plan: SessionPlan;
  readonly allocation: MockAllocationPlan;
}

/**
 * Builds a mock exam strictly from the blueprint: each section contributes up to its
 * configured number of questions, and any shortfall is reported so the UI can say so
 * rather than quietly presenting a shorter examination.
 */
export const buildMockSessionPlan = (
  exam: ExamRuleConfig,
  questions: readonly Question[],
  trackId: ExamTrackId,
  dependencies: PlanDependencies = {},
): MockSessionPlan => {
  const random = dependencies.random ?? defaultRandom;
  const sections = sectionsForTrack(exam, trackId);

  const availableBySubject = (subjectId: SubjectId): number =>
    questions.filter(
      (question) =>
        question.examId === exam.id &&
        question.status === 'published' &&
        question.trackIds.includes(trackId) &&
        question.subjectId === subjectId,
    ).length;

  const allocation = planAllocation(exam, trackId, availableBySubject);

  const picked: Question[] = [];
  const usedIds = new Set<QuestionId>();
  for (const section of sections) {
    const wanted = allocation.allocations.find(
      (entry) => entry.subjectId === section.subjectId,
    )?.planned;
    if (wanted === undefined || wanted <= 0) continue;

    const pool = questions.filter(
      (question) =>
        question.examId === exam.id &&
        question.status === 'published' &&
        question.trackIds.includes(trackId) &&
        question.subjectId === section.subjectId &&
        !usedIds.has(question.id),
    );
    for (const question of spreadAcrossConcepts(pool, random).slice(0, wanted)) {
      usedIds.add(question.id);
      picked.push(question);
    }
  }

  const request: SessionRequest = {
    mode: 'mock-exam',
    trackId,
    questionCount: picked.length,
  };

  return {
    plan: {
      ...summarizePlan(exam, request, picked),
      requestedCount: allocation.requestedTotal,
      shortfall: allocation.shortfall,
    },
    allocation,
  };
};

/**
 * Chooses questions that cover the same idea as a missed question, powering
 * "Try another like this". Preference order: same related group, then same concept.
 */
export const buildSimilarQuestionPlan = (
  exam: ExamRuleConfig,
  questions: readonly Question[],
  missed: Question,
  dependencies: PlanDependencies = {},
): SessionPlan => {
  const random = dependencies.random ?? defaultRandom;
  const baseExclusions = [missed.id];

  const sameGroup =
    missed.relatedQuestionGroupId === undefined
      ? []
      : questions.filter(
          (question) =>
            question.status === 'published' &&
            question.relatedQuestionGroupId === missed.relatedQuestionGroupId &&
            question.id !== missed.id,
        );

  if (sameGroup.length > 0) {
    return buildSessionPlan(
      exam,
      sameGroup,
      {
        mode: 'try-another-like-this',
        trackId: missed.trackIds[0] ?? exam.defaultTrackId,
        questionCount: 1,
        excludeQuestionIds: baseExclusions,
      },
      { random },
    );
  }

  return buildSessionPlan(
    exam,
    questions,
    {
      mode: 'try-another-like-this',
      trackId: missed.trackIds[0] ?? exam.defaultTrackId,
      questionCount: 1,
      conceptIds: missed.conceptIds,
      excludeQuestionIds: baseExclusions,
    },
    { random },
  );
};
