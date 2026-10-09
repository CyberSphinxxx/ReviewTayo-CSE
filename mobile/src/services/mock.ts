import type { MockItemRecord, MockSessionRecord, Repositories } from '@/data/repositories';
import {
  buildMockSessionPlan,
  planAllocation,
  resolveTiming,
  summarizeMock,
  type MockAllocationPlan,
  type MockSummary,
} from '@/domain/exams';
import { getSubject } from '@/domain/exams';
import type { ExamRuleConfig, ExamTrackId, Question } from '@/domain/exams/types';
import {
  buildMockResult,
  describeMockProgress,
  firstUnansweredIndex,
  isExpired,
  remainingSeconds,
  type MockResult,
} from '@/domain/mock';
import { isCorrectChoice } from '@/domain/practice';
import { AppError } from '@/domain/result';
import { createId } from '@/services/ids';
import { submitAnswer } from '@/services/practice';

/**
 * Mock exams.
 *
 * The engine already owns what a paper is — the blueprint, its sections and its clock —
 * so this service owns only the paper's life: it is started from the blueprint, answered
 * one item at a time, paused, resumed, submitted, and read back as a result.
 *
 * Two rules make the rest safe. While the paper is running only the mock's own item rows
 * are written, so changing an answer is free and an abandoned paper changes nothing about
 * the learner. On submission every answered item goes through the *same* answer writer
 * practice uses (D-047), which is what makes a mock count: mastery, the review queue, the
 * streak and the day's activity all see it. Each answer is written against the mock's own
 * session id, which both links it to the paper and makes submitting twice impossible —
 * an item already recorded is skipped rather than counted twice.
 */

export interface MockSetupSection {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly requested: number;
  readonly planned: number;
}

export interface MockSetup {
  readonly summary: MockSummary;
  readonly allocation: MockAllocationPlan;
  /** The paper's sections, named, with what this build can actually serve. */
  readonly sections: readonly MockSetupSection[];
  /** `72 of 170 items` — said plainly when the bank cannot fill the blueprint. */
  readonly shortfallNote: string | null;
  readonly totalAvailable: number;
}

export interface LoadMockInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly now?: Date;
}

export const loadMockSetup = async ({
  repositories,
  exam,
  trackId,
}: {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly trackId: ExamTrackId;
}): Promise<MockSetup> => {
  const questions = await repositories.questions.listPublished({ examId: exam.id, trackId });
  const available = (subjectId: string): number =>
    questions.filter((question) => question.subjectId === subjectId).length;
  const allocation = planAllocation(exam, trackId, available);

  return {
    summary: summarizeMock(exam, trackId),
    allocation,
    sections: allocation.allocations.map((entry) => ({
      subjectId: entry.subjectId,
      subjectName: getSubject(exam, entry.subjectId)?.name ?? 'This exam',
      requested: entry.requested,
      planned: entry.planned,
    })),
    shortfallNote: allocation.shortfall
      ? `This build can serve ${allocation.plannedTotal} of the ${allocation.requestedTotal} items this paper asks for.`
      : null,
    totalAvailable: questions.length,
  };
};

export interface MockSessionState {
  readonly session: MockSessionRecord;
  /** Paper order. */
  readonly items: readonly MockItemRecord[];
  /** The questions behind those items, in the same order. */
  readonly paper: readonly Question[];
  readonly remainingSeconds: number;
  /** True when the clock has run out and the paper must be submitted as it stands. */
  readonly expired: boolean;
  /** Where a resumed paper opens. */
  readonly index: number;
  /** `12 of 72 answered` */
  readonly progressLine: string;
}

const describeSession = async (
  repositories: Repositories,
  session: MockSessionRecord,
  now: Date,
): Promise<MockSessionState> => {
  const items = await repositories.mock.listItems(session.id);
  const questions = await repositories.questions.getByIds(items.map((item) => item.questionId));
  const byId = new Map(questions.map((question) => [question.id, question]));
  const paper = items
    .map((item) => byId.get(item.questionId))
    .filter((question): question is Question => question !== undefined);

  return {
    session,
    items,
    paper,
    remainingSeconds: remainingSeconds(session, now),
    expired: isExpired(session, now),
    index: firstUnansweredIndex(items),
    progressLine: describeMockProgress(items),
  };
};

/** The paper the learner can still sit, if there is one. */
export const loadMockSession = async ({
  repositories,
  exam,
  now = new Date(),
}: LoadMockInput): Promise<MockSessionState | null> => {
  const session = await repositories.mock.findResumable(exam.id);
  if (session === null) return null;
  return describeSession(repositories, session, now);
};

export interface StartMockInput extends LoadMockInput {
  readonly trackId: ExamTrackId;
  /** Injected so a paper is reproducible in tests. */
  readonly random?: () => number;
}

export const startMock = async ({
  repositories,
  exam,
  trackId,
  now = new Date(),
  random,
}: StartMockInput): Promise<MockSessionState> => {
  const questions = await repositories.questions.listPublished({ examId: exam.id, trackId });
  const { plan } = buildMockSessionPlan(
    exam,
    questions,
    trackId,
    random === undefined ? {} : { random },
  );

  if (plan.questions.length === 0) {
    throw new AppError('not_found', 'No questions are available for a mock exam yet.');
  }

  const nowIso = now.toISOString();
  const timing = resolveTiming(exam, trackId);
  const session: MockSessionRecord = {
    id: createId('mock'),
    examId: exam.id,
    trackId,
    status: 'in-progress',
    // What the paper actually holds, not what the blueprint asked for: a score out of
    // items nobody could answer would be a lie.
    totalItems: plan.questions.length,
    answeredCount: 0,
    correctCount: 0,
    startedAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    expiresAt: new Date(now.getTime() + timing.totalMinutes * 60_000).toISOString(),
    pausedAt: null,
    remainingSeconds: null,
    payload: null,
  };

  await repositories.mock.create(
    session,
    plan.questions.map((question, position) => ({
      mockSessionId: session.id,
      questionId: question.id,
      position,
      chosenChoiceId: null,
      isCorrect: null,
      flagged: false,
      answeredAt: null,
    })),
  );

  return describeSession(repositories, session, now);
};

export interface AnswerMockInput {
  readonly repositories: Repositories;
  readonly sessionId: string;
  readonly question: Question;
  readonly chosenChoiceId: string;
  readonly now?: Date;
}

/**
 * Records (or changes) one answer inside the paper.
 *
 * Only the mock's item row is written here; the answer, mastery and the review queue wait
 * for submission, so a paper that is abandoned leaves nothing behind and an answer changed
 * twice is still one answer.
 */
export const answerMockItem = async ({
  repositories,
  sessionId,
  question,
  chosenChoiceId,
  now = new Date(),
}: AnswerMockInput): Promise<void> => {
  await repositories.mock.saveItem(sessionId, question.id, {
    chosenChoiceId,
    isCorrect: isCorrectChoice(question, chosenChoiceId),
    answeredAt: now.toISOString(),
  });

  const items = await repositories.mock.listItems(sessionId);
  const session = await repositories.mock.getById(sessionId);
  if (session === null) return;

  await repositories.mock.updateSession(sessionId, {
    answeredCount: items.filter((item) => item.chosenChoiceId !== null).length,
    correctCount: items.filter((item) => item.isCorrect === true).length,
    updatedAt: now.toISOString(),
  });
};

export const flagMockItem = async ({
  repositories,
  sessionId,
  questionId,
  flagged,
  now = new Date(),
}: {
  readonly repositories: Repositories;
  readonly sessionId: string;
  readonly questionId: string;
  readonly flagged: boolean;
  readonly now?: Date;
}): Promise<void> => {
  await repositories.mock.saveItem(sessionId, questionId, { flagged });
  await repositories.mock.updateSession(sessionId, { updatedAt: now.toISOString() });
};

/** Stops the clock and stores what was left of it. */
export const pauseMock = async ({
  repositories,
  sessionId,
  now = new Date(),
}: {
  readonly repositories: Repositories;
  readonly sessionId: string;
  readonly now?: Date;
}): Promise<void> => {
  const session = await repositories.mock.getById(sessionId);
  if (session === null || session.status !== 'in-progress') return;

  await repositories.mock.updateSession(sessionId, {
    status: 'paused',
    pausedAt: now.toISOString(),
    remainingSeconds: remainingSeconds(session, now),
    updatedAt: now.toISOString(),
  });
};

/** Starts the clock again from the stored remainder. */
export const resumeMock = async ({
  repositories,
  sessionId,
  now = new Date(),
}: {
  readonly repositories: Repositories;
  readonly sessionId: string;
  readonly now?: Date;
}): Promise<void> => {
  const session = await repositories.mock.getById(sessionId);
  if (session === null || session.status !== 'paused') return;

  const remaining = Math.max(0, session.remainingSeconds ?? 0);
  await repositories.mock.updateSession(sessionId, {
    status: 'in-progress',
    pausedAt: null,
    remainingSeconds: null,
    expiresAt: new Date(now.getTime() + remaining * 1000).toISOString(),
    updatedAt: now.toISOString(),
  });
};

export interface SubmitMockInput extends LoadMockInput {
  readonly sessionId: string;
  /** The learner's own daily goal, so a mock counts towards the day exactly as practice does. */
  readonly dailyGoal: number;
  /** True when the clock ran out; the paper is submitted as it stands. */
  readonly expired?: boolean;
}

/**
 * Ends the paper: every answered item is committed through the one answer writer, then the
 * session is closed and its result returned.
 */
export const submitMock = async ({
  repositories,
  exam,
  sessionId,
  dailyGoal,
  expired = false,
  now = new Date(),
}: SubmitMockInput): Promise<MockResult> => {
  const session = await repositories.mock.getById(sessionId);
  if (session === null) {
    throw new AppError('not_found', 'That mock exam is no longer on this device.');
  }

  const items = await repositories.mock.listItems(sessionId);
  const questions = await repositories.questions.getByIds(items.map((item) => item.questionId));
  const byId = new Map(questions.map((question) => [question.id, question]));

  for (const item of items) {
    if (item.chosenChoiceId === null) continue;
    const question = byId.get(item.questionId);
    if (question === undefined) continue;
    // Idempotent: an item this paper already recorded is not counted a second time.
    const already = await repositories.answers.findBySessionAndQuestion(sessionId, item.questionId);
    if (already !== null) continue;
    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId,
      chosenChoiceId: item.chosenChoiceId,
      dailyGoal,
      source: 'mock',
      now,
    });
  }

  const nowIso = now.toISOString();
  await repositories.mock.updateSession(sessionId, {
    status: expired ? 'expired' : 'completed',
    completedAt: nowIso,
    updatedAt: nowIso,
    answeredCount: items.filter((item) => item.chosenChoiceId !== null).length,
    correctCount: items.filter((item) => item.isCorrect === true).length,
    pausedAt: null,
    remainingSeconds: null,
  });

  return resultFor({ exam, session, items, questions, expired });
};

const resultFor = ({
  exam,
  session,
  items,
  questions,
  expired,
}: {
  readonly exam: ExamRuleConfig;
  readonly session: MockSessionRecord;
  readonly items: readonly MockItemRecord[];
  readonly questions: readonly Question[];
  readonly expired: boolean;
}): MockResult => {
  const subjectByQuestion = new Map(questions.map((question) => [question.id, question.subjectId]));
  return buildMockResult({
    exam,
    trackId: session.trackId,
    expired,
    items: items.map((item) => ({
      subjectId: subjectByQuestion.get(item.questionId) ?? '',
      answered: item.chosenChoiceId !== null,
      isCorrect: item.isCorrect,
    })),
  });
};

/** The result of a paper that has been submitted, or `null` while it is still open. */
export const loadMockResult = async ({
  repositories,
  exam,
  sessionId,
}: LoadMockInput & { readonly sessionId: string }): Promise<MockResult | null> => {
  const session = await repositories.mock.getById(sessionId);
  if (session === null || (session.status !== 'completed' && session.status !== 'expired')) {
    return null;
  }
  const items = await repositories.mock.listItems(sessionId);
  const questions = await repositories.questions.getByIds(items.map((item) => item.questionId));
  return resultFor({
    exam,
    session,
    items,
    questions,
    expired: session.status === 'expired',
  });
};
