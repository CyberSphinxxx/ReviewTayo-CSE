import type {
  AnswerRecord,
  PracticeSessionRecord,
  Repositories,
  ReviewItemRecord,
  StudyTaskRecord,
} from '@/data/repositories';
import type { DatabaseTransaction } from '@/data/local/database-port';
import type { SessionMode, SessionPlan, SessionRequest } from '@/domain/exams';
import { buildSessionPlan, buildSimilarQuestionPlan } from '@/domain/exams';
import {
  masteryLevelFor,
  masteryLevelIndex,
  masteryScore,
  type MasteryLevel,
} from '@/domain/exams/mastery';
import type { ExamRuleConfig, Question, QuestionDifficulty, SubjectId } from '@/domain/exams/types';
import { isCorrectChoice, taskKindForMode } from '@/domain/practice';
import { nextReviewSchedule } from '@/domain/review';
import { toIsoDate } from '@/domain/study-plan';
import { createId } from '@/services/ids';

/**
 * Practice sessions.
 *
 * The one place a session is created and an answer is committed. Submitting an answer
 * changes six things that must all be true together — the answer, mastery for each
 * concept it touched, the review schedule, today's activity, the planned task it
 * counts towards, and the session's own score — so they are written in a single
 * transaction. A crash between them would otherwise leave mastery that no answer
 * explains, or a plan that never notices work the learner actually did.
 */

export interface StartSessionInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly mode: SessionMode;
  readonly questionCount: number;
  readonly subjectIds?: readonly SubjectId[];
  readonly conceptIds?: readonly string[];
  readonly difficulties?: readonly QuestionDifficulty[];
  /** Only for genuinely timed modes; a wall-clock budget in minutes. */
  readonly timeLimitMinutes?: number;
  /**
   * Builds a one-question session about the same idea as this question, powering
   * "Try another like this". It prefers the question's related group over its concept.
   */
  readonly similarToQuestionId?: string;
  /** Injected so plans stay deterministic in tests. */
  readonly random?: () => number;
  readonly now?: Date;
}

export interface StartedSession {
  readonly session: PracticeSessionRecord;
  readonly plan: SessionPlan;
  /** True when the content bank could not serve the requested number of questions. */
  readonly shortfall: boolean;
}

export const startSession = async ({
  repositories,
  exam,
  trackId,
  mode,
  questionCount,
  subjectIds,
  conceptIds,
  difficulties,
  timeLimitMinutes,
  similarToQuestionId,
  random,
  now = new Date(),
}: StartSessionInput): Promise<StartedSession> => {
  const questions = await repositories.questions.listPublished({ examId: exam.id, trackId });
  const missed =
    similarToQuestionId === undefined
      ? null
      : (questions.find((question) => question.id === similarToQuestionId) ?? null);

  const plan =
    missed === null
      ? buildSessionPlan(
          exam,
          questions,
          {
            mode,
            trackId,
            questionCount,
            ...(subjectIds === undefined ? {} : { subjectIds }),
            ...(conceptIds === undefined ? {} : { conceptIds }),
            ...(difficulties === undefined ? {} : { difficulties }),
          } satisfies SessionRequest,
          random === undefined ? {} : { random },
        )
      : buildSimilarQuestionPlan(exam, questions, missed, random === undefined ? {} : { random });

  const nowIso = now.toISOString();
  const timeLimitSeconds =
    timeLimitMinutes === undefined ? null : Math.max(0, Math.round(timeLimitMinutes * 60));

  const session: PracticeSessionRecord = {
    id: createId('session'),
    examId: exam.id,
    trackId,
    mode,
    status: 'in-progress',
    requestedCount: Math.max(0, Math.floor(questionCount)),
    correctCount: 0,
    startedAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    durationSeconds: 0,
    timeLimitSeconds,
    timeRemainingSeconds: timeLimitSeconds,
  };

  await repositories.practice.create(
    session,
    plan.questions.map((question) => question.id),
  );

  return { session, plan, shortfall: plan.shortfall };
};

/**
 * Whether "Try another like this" can be honoured for a question.
 *
 * It answers by building the very plan the button would start, so the offer is made
 * only when there is a genuinely related question to ask — a button that leads to an
 * empty session is worse than no button at all.
 */
export const hasSimilarQuestion = async ({
  repositories,
  exam,
  question,
  random,
}: {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly question: Question;
  readonly random?: () => number;
}): Promise<boolean> => {
  const trackId = question.trackIds[0] ?? exam.defaultTrackId;
  const questions = await repositories.questions.listPublished({ examId: exam.id, trackId });
  const plan = buildSimilarQuestionPlan(
    exam,
    questions,
    question,
    random === undefined ? {} : { random },
  );
  return plan.questions.length > 0;
};

export interface SubmitAnswerInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly question: Question;
  /** The session the answer belongs to; `null` for a standalone question. */
  readonly sessionId: string | null;
  readonly chosenChoiceId: string;
  readonly dailyGoal: number;
  /** Defaults to `practice`, or `daily-question` for a standalone question. */
  readonly source?: AnswerRecord['source'];
  readonly timeSpentSeconds?: number;
  readonly now?: Date;
}

export interface SubmittedAnswer {
  readonly correct: boolean;
  readonly masteryBefore: MasteryLevel;
  readonly masteryAfter: MasteryLevel;
  /** True when this answer put the concept into the review queue for the first time. */
  readonly queuedForReview: boolean;
  /** The named concept's own name is the caller's to resolve; this is its id. */
  readonly primaryConceptId: string | null;
}

/** Writes mastery for one concept from the evidence it now has. */
const saveMastery = async (
  repositories: Repositories,
  transaction: DatabaseTransaction,
  exam: ExamRuleConfig,
  conceptId: string,
  isCorrect: boolean,
  nowIso: string,
): Promise<{ before: MasteryLevel; after: MasteryLevel; levelIndex: number }> => {
  const policy = exam.studyPolicy.mastery;
  const existing = await repositories.mastery.get(conceptId);
  const correctCount = (existing?.correctCount ?? 0) + (isCorrect ? 1 : 0);
  const wrongCount = (existing?.wrongCount ?? 0) + (isCorrect ? 0 : 1);
  const evidence = { correctCount, wrongCount };
  const levelIndex = masteryLevelIndex(masteryScore(evidence, policy), policy);

  await repositories.mastery.save(
    {
      conceptId,
      examId: exam.id,
      correctCount,
      wrongCount,
      level: levelIndex,
      streak: isCorrect ? (existing?.streak ?? 0) + 1 : 0,
      lastAnsweredAt: nowIso,
      updatedAt: nowIso,
    },
    { transaction },
  );

  return {
    before: existing === null ? 'Learning' : masteryLevelFor(existing, policy),
    after: masteryLevelFor(evidence, policy),
    levelIndex,
  };
};

/**
 * Schedules the concept for review. A miss creates or refreshes a concept-level item;
 * a correct answer advances an item that already exists. Correct answers never create
 * review work — that would make the queue grow with study rather than with mistakes.
 *
 * The arithmetic itself is `domain/review`'s, so an answer here and a card said "Got
 * it" to in the review deck move the same due date.
 */
const scheduleReview = async (
  repositories: Repositories,
  transaction: DatabaseTransaction,
  exam: ExamRuleConfig,
  conceptId: string,
  isCorrect: boolean,
  levelIndex: number,
  now: Date,
): Promise<boolean> => {
  const nowIso = now.toISOString();
  const existing = await repositories.review.findByConcept(exam.id, conceptId, null);

  if (isCorrect && existing === null) return false;

  const schedule = nextReviewSchedule({
    policy: exam.studyPolicy.review,
    outcome: isCorrect ? 'got-it' : 'again',
    levelIndex,
    reviews: existing?.reviews ?? 0,
    lapses: existing?.lapses ?? 0,
    now,
  });

  const item: ReviewItemRecord = {
    id: existing?.id ?? createId('review'),
    examId: exam.id,
    conceptId,
    questionId: existing?.questionId ?? null,
    source: existing?.source ?? 'mistake',
    dueAt: schedule.dueAt,
    intervalDays: schedule.intervalDays,
    easeLevel: schedule.easeLevel,
    lapses: schedule.lapses,
    reviews: schedule.reviews,
    lastReviewedAt: isCorrect ? nowIso : (existing?.lastReviewedAt ?? null),
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  await repositories.review.upsert(item, { transaction });
  return existing === null;
};

/** Advances today's planned task of the kind this session answers for. */
const advancePlanTask = async (
  repositories: Repositories,
  transaction: DatabaseTransaction,
  exam: ExamRuleConfig,
  mode: SessionMode,
  day: string,
): Promise<void> => {
  const plan = await repositories.studyPlans.getActive(exam.id);
  if (plan === null) return;

  const kind = taskKindForMode(mode);
  const tasks: readonly StudyTaskRecord[] = await repositories.studyPlans.listTasks(plan.id);
  const task = tasks.find(
    (entry) =>
      entry.day === day &&
      entry.kind === kind &&
      entry.status !== 'completed' &&
      entry.status !== 'skipped',
  );
  if (task === undefined) return;

  const completedCount = Math.min(task.targetCount, task.completedCount + 1);
  await repositories.studyPlans.updateTask(
    task.id,
    {
      completedCount,
      status: completedCount >= task.targetCount ? 'completed' : 'in-progress',
    },
    { transaction },
  );
};

export const submitAnswer = async ({
  repositories,
  exam,
  question,
  sessionId,
  chosenChoiceId,
  dailyGoal,
  source,
  timeSpentSeconds,
  now = new Date(),
}: SubmitAnswerInput): Promise<SubmittedAnswer> => {
  const nowIso = now.toISOString();
  const day = toIsoDate(now);
  const [primaryConceptId] = question.conceptIds;
  // Correctness is decided here from the question itself, so a caller cannot mark an
  // answer right and schedule nothing, or wrong and award mastery for it.
  const isCorrect = isCorrectChoice(question, chosenChoiceId);

  return repositories.transaction(async (transaction) => {
    const answer: AnswerRecord = {
      id: createId('answer'),
      sessionId,
      questionId: question.id,
      examId: exam.id,
      subjectId: question.subjectId,
      conceptIds: question.conceptIds,
      chosenChoiceId,
      correctChoiceId: question.correctChoiceId,
      isCorrect,
      source: source ?? (sessionId === null ? 'daily-question' : 'practice'),
      answeredAt: nowIso,
      timeSpentSeconds: timeSpentSeconds ?? null,
    };
    await repositories.answers.record(answer, { transaction });

    let before: MasteryLevel = 'Learning';
    let after: MasteryLevel = 'Learning';
    let levelIndex = 0;
    for (const conceptId of question.conceptIds) {
      const moved = await saveMastery(
        repositories,
        transaction,
        exam,
        conceptId,
        isCorrect,
        nowIso,
      );
      if (conceptId === primaryConceptId) {
        before = moved.before;
        after = moved.after;
        levelIndex = moved.levelIndex;
      }
    }

    const queuedForReview =
      primaryConceptId === undefined
        ? false
        : await scheduleReview(
            repositories,
            transaction,
            exam,
            primaryConceptId,
            isCorrect,
            levelIndex,
            now,
          );

    const activity = await repositories.activity.get(day, exam.id);
    const answeredToday = (activity?.questionsAnswered ?? 0) + 1;
    await repositories.activity.recordQuestion(
      {
        day,
        examId: exam.id,
        correct: isCorrect,
        goalMet: dailyGoal > 0 && answeredToday >= dailyGoal,
      },
      { transaction },
    );

    if (sessionId !== null) {
      const session = await repositories.practice.getById(sessionId);
      if (session !== null) {
        await repositories.practice.update(
          sessionId,
          {
            correctCount: session.correctCount + (isCorrect ? 1 : 0),
            updatedAt: nowIso,
            durationSeconds: Math.max(
              0,
              Math.round((now.getTime() - Date.parse(session.startedAt)) / 1000),
            ),
          },
          { transaction },
        );
        await advancePlanTask(repositories, transaction, exam, session.mode, day);
      }
    }

    return {
      correct: isCorrect,
      masteryBefore: before,
      masteryAfter: after,
      queuedForReview,
      primaryConceptId: primaryConceptId ?? null,
    };
  });
};

export interface FinishSessionInput {
  readonly repositories: Repositories;
  readonly sessionId: string;
  readonly correctCount: number;
  readonly now?: Date;
}

/** Marks a session finished. The score is passed in from the session's own answers. */
export const finishSession = async ({
  repositories,
  sessionId,
  correctCount,
  now = new Date(),
}: FinishSessionInput): Promise<void> => {
  const session = await repositories.practice.getById(sessionId);
  if (session === null) return;
  const nowIso = now.toISOString();
  await repositories.practice.update(sessionId, {
    status: 'completed',
    correctCount,
    completedAt: nowIso,
    updatedAt: nowIso,
    durationSeconds: Math.max(
      0,
      Math.round((now.getTime() - Date.parse(session.startedAt)) / 1000),
    ),
  });
};

/** Leaves a session resumable; used when the learner closes it mid-way. */
export const pauseSession = async (
  repositories: Repositories,
  sessionId: string,
  now: Date = new Date(),
): Promise<void> => {
  const session = await repositories.practice.getById(sessionId);
  if (session === null || session.status !== 'in-progress') return;
  await repositories.practice.update(sessionId, { status: 'paused', updatedAt: now.toISOString() });
};
