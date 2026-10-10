import { importContentPack } from '@/data/local/content-import';
import type { Repositories } from '@/data/repositories';
import { masteryLevelFor, type MasteryLevel } from '@/domain/exams/mastery';
import type { Question } from '@/domain/exams/types';
import { toIsoDate } from '@/domain/study-plan';
import {
  finishSession,
  hasSimilarQuestion,
  pauseSession,
  startSession,
  submitAnswer,
} from '@/services/practice';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Practice session service.
 *
 * Answering a question changes six things that must agree: the answer, mastery for the
 * concepts it touched, the review schedule, today's activity, the planned task it
 * counts towards and the session's own score. These tests run against a real database
 * and read those rows back, so "committed" means the next screen would see it.
 */

const pack = loadCsePack();
const exam = pack.exam;
const TRACK = 'professional';
const NOW = new Date('2026-10-07T09:00:00.000Z');
const TODAY = toIsoDate(NOW);

interface Fixture {
  readonly repositories: Repositories;
  readonly questions: readonly Question[];
}

const seed = async (): Promise<Fixture> => {
  const { repositories } = await createMigratedDatabase();
  await importContentPack(repositories, pack);
  const questions = await repositories.questions.listPublished({ examId: exam.id, trackId: TRACK });
  return { repositories, questions };
};

/** A question about a specific concept, found in the real content bank. */
const questionFor = (questions: readonly Question[], conceptId: string): Question => {
  const question = questions.find((entry) => entry.conceptIds.includes(conceptId));
  if (question === undefined) {
    throw new Error(`No content question covers "${conceptId}".`);
  }
  return question;
};

const choiceThatIs = (question: Question, correct: boolean): string => {
  if (correct) return question.correctChoiceId;
  const wrong = question.choices.find((choice) => choice.id !== question.correctChoiceId);
  if (wrong === undefined) throw new Error('Question has no incorrect choice to pick.');
  return wrong.id;
};

const planWithPracticeTask = async (repositories: Repositories, targetCount: number) => {
  await repositories.studyPlans.savePlan(
    {
      id: 'plan-1',
      examId: exam.id,
      trackId: TRACK,
      weekStart: TODAY,
      generatedAt: NOW.toISOString(),
      isActive: true,
      payload: { version: 1 },
    },
    [
      {
        id: 'task-practice',
        planId: 'plan-1',
        day: TODAY,
        kind: 'practice',
        label: 'Practice set',
        targetCount,
        completedCount: 0,
        status: 'pending',
        position: 0,
      },
    ],
  );
};

describe('starting a session', () => {
  it('creates the session and its question order together', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 5,
      now: NOW,
    });

    expect(started.plan.questions).toHaveLength(5);
    expect(started.shortfall).toBe(false);
    expect(started.session.status).toBe('in-progress');
    expect(started.session.requestedCount).toBe(5);
    expect(started.session.timeLimitSeconds).toBeNull();

    const stored = await repositories.practice.getById(started.session.id);
    expect(stored?.startedAt).toBe(NOW.toISOString());
    const order = await repositories.practice.listQuestions(started.session.id);
    expect(order.map((entry) => entry.questionId)).toEqual(
      started.plan.questions.map((question) => question.id),
    );
  });

  it('serves the daily question as the one question it promises', async () => {
    const { repositories } = await seed();
    // Home promises a minute; the quiz route hands every mode its default count of
    // ten. The mode, not the route's default, decides what a daily question is.
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'daily-question',
      questionCount: 10,
      now: NOW,
    });

    expect(started.plan.questions).toHaveLength(1);
    expect(started.session.requestedCount).toBe(1);
    expect((await repositories.practice.getById(started.session.id))?.requestedCount).toBe(1);
  });

  it('keeps a drill inside the concepts it was asked for', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 4,
      conceptIds: ['vocabulary'],
      now: NOW,
    });
    expect(started.plan.questions.length).toBeGreaterThan(0);
    expect(
      started.plan.questions.every((question) => question.conceptIds.includes('vocabulary')),
    ).toBe(true);
  });

  it('reports a shortfall instead of pretending the bank is deeper than it is', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'random-set',
      questionCount: 500,
      now: NOW,
    });
    expect(started.shortfall).toBe(true);
    expect(started.plan.questions.length).toBeLessThan(500);
    expect(started.plan.questions.length).toBeGreaterThan(0);
  });

  it('carries a clock only for modes that are actually timed', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'timed-practice',
      questionCount: 10,
      timeLimitMinutes: exam.studyPolicy.timedPracticeMinutes,
      now: NOW,
    });
    const expected = exam.studyPolicy.timedPracticeMinutes * 60;
    expect(started.session.timeLimitSeconds).toBe(expected);
    expect(started.session.timeRemainingSeconds).toBe(expected);
  });
});

describe('submitting an answer', () => {
  it('writes the answer, mastery, activity and the session score in one go', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'vocabulary');
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 3,
      now: NOW,
    });

    const result = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: started.session.id,
      chosenChoiceId: choiceThatIs(question, true),
      dailyGoal: 10,
      now: NOW,
    });

    expect(result.correct).toBe(true);
    expect(result.masteryBefore).toBe('Learning');
    const mastery = await repositories.mastery.get('vocabulary');
    expect(mastery?.correctCount).toBe(1);
    expect(mastery?.wrongCount).toBe(0);
    expect(mastery?.lastAnsweredAt).toBe(NOW.toISOString());
    expect(mastery?.streak).toBe(1);

    const answers = await repositories.answers.listBySession(started.session.id);
    expect(answers).toHaveLength(1);
    expect(answers[0]?.questionId).toBe(question.id);
    expect(answers[0]?.source).toBe('practice');
    expect(answers[0]?.isCorrect).toBe(true);

    const activity = await repositories.activity.get(TODAY, exam.id);
    expect(activity?.questionsAnswered).toBe(1);
    expect(activity?.correctCount).toBe(1);

    const session = await repositories.practice.getById(started.session.id);
    expect(session?.correctCount).toBe(1);
  });

  it('decides correctness from the question, not from the caller', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'vocabulary');
    const result = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: choiceThatIs(question, false),
      dailyGoal: 10,
      now: NOW,
    });
    expect(result.correct).toBe(false);
    const mastery = await repositories.mastery.get('vocabulary');
    expect(mastery?.wrongCount).toBe(1);
    expect(mastery?.correctCount).toBe(0);
  });

  it('queues a missed concept for review, and never queues a correct one', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'sentence-completion');

    const missed = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: choiceThatIs(question, false),
      dailyGoal: 10,
      now: NOW,
    });
    expect(missed.queuedForReview).toBe(true);

    const item = await repositories.review.findByConcept(exam.id, 'sentence-completion', null);
    expect(item?.source).toBe('mistake');
    expect(item?.lapses).toBe(1);
    expect(item?.intervalDays).toBe(exam.studyPolicy.review.againIntervalDays);
    expect(Date.parse(item?.dueAt ?? '')).toBeGreaterThanOrEqual(NOW.getTime());

    // A second miss refreshes the same item rather than adding another.
    const again = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: choiceThatIs(question, false),
      dailyGoal: 10,
      now: NOW,
    });
    expect(again.queuedForReview).toBe(false);
    const refreshed = await repositories.review.findByConcept(exam.id, 'sentence-completion', null);
    expect(refreshed?.lapses).toBe(2);
    expect(await repositories.review.listAll(exam.id)).toHaveLength(1);

    const clean = await submitAnswer({
      repositories,
      exam,
      question: questionFor(questions, 'reading-comprehension'),
      sessionId: null,
      chosenChoiceId: choiceThatIs(questionFor(questions, 'reading-comprehension'), true),
      dailyGoal: 10,
      now: NOW,
    });
    expect(clean.queuedForReview).toBe(false);
    expect(
      await repositories.review.findByConcept(exam.id, 'reading-comprehension', null),
    ).toBeNull();
  });

  it('pushes a review item further out when the learner gets it right', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'sentence-completion');
    const answer = async (correct: boolean) =>
      submitAnswer({
        repositories,
        exam,
        question,
        sessionId: null,
        chosenChoiceId: choiceThatIs(question, correct),
        dailyGoal: 100,
        now: NOW,
      });

    // A concept the learner knows well, then one slip: the slip resets the schedule
    // to the "again" interval, and getting it right afterwards spaces it out again.
    for (let index = 0; index < 5; index += 1) await answer(true);
    await answer(false);
    const queued = await repositories.review.findByConcept(exam.id, 'sentence-completion', null);
    expect(queued?.intervalDays).toBe(exam.studyPolicy.review.againIntervalDays);

    await answer(true);
    const advanced = await repositories.review.findByConcept(exam.id, 'sentence-completion', null);

    expect(advanced?.reviews).toBe((queued?.reviews ?? 0) + 1);
    expect(advanced?.lastReviewedAt).toBe(NOW.toISOString());
    expect(advanced?.intervalDays).toBeGreaterThan(queued?.intervalDays ?? 0);
    expect(Date.parse(advanced?.dueAt ?? '')).toBeGreaterThan(Date.parse(queued?.dueAt ?? ''));
  });

  it('advances today\u2019s planned task and completes it when the target is met', async () => {
    const { repositories, questions } = await seed();
    await planWithPracticeTask(repositories, 2);
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 2,
      now: NOW,
    });

    await submitAnswer({
      repositories,
      exam,
      question: questionFor(questions, 'vocabulary'),
      sessionId: started.session.id,
      chosenChoiceId: choiceThatIs(questionFor(questions, 'vocabulary'), true),
      dailyGoal: 10,
      now: NOW,
    });
    let tasks = await repositories.studyPlans.listTasks('plan-1');
    expect(tasks[0]?.completedCount).toBe(1);
    expect(tasks[0]?.status).toBe('in-progress');

    await submitAnswer({
      repositories,
      exam,
      question: questionFor(questions, 'grammar-and-usage'),
      sessionId: started.session.id,
      chosenChoiceId: choiceThatIs(questionFor(questions, 'grammar-and-usage'), true),
      dailyGoal: 10,
      now: NOW,
    });
    tasks = await repositories.studyPlans.listTasks('plan-1');
    expect(tasks[0]?.completedCount).toBe(2);
    expect(tasks[0]?.status).toBe('completed');
  });

  it('marks the day\u2019s goal met once the learner reaches it', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'vocabulary');
    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: choiceThatIs(question, true),
      dailyGoal: 1,
      now: NOW,
    });
    const activity = await repositories.activity.get(TODAY, exam.id);
    expect(activity?.goalMet).toBe(true);
  });

  it('moves the level only when the evidence says so', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'vocabulary');

    // Five right answers is the evidence floor: the level moves where a level is due.
    let last: { masteryBefore: MasteryLevel; masteryAfter: MasteryLevel } = {
      masteryBefore: 'Learning',
      masteryAfter: 'Learning',
    };
    for (let index = 0; index < 5; index += 1) {
      const result = await submitAnswer({
        repositories,
        exam,
        question,
        sessionId: null,
        chosenChoiceId: choiceThatIs(question, true),
        dailyGoal: 10,
        now: NOW,
      });
      last = { masteryBefore: result.masteryBefore, masteryAfter: result.masteryAfter };
    }
    expect(last.masteryAfter).toBe('Mastered');
    const mastery = await repositories.mastery.get('vocabulary');
    expect(mastery === null ? null : masteryLevelFor(mastery, exam.studyPolicy.mastery)).toBe(
      'Mastered',
    );
  });

  it('credits the concept the question is really about', async () => {
    const { repositories, questions } = await seed();
    const question = questionFor(questions, 'percentages');
    const result = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId: choiceThatIs(question, true),
      dailyGoal: 10,
      now: NOW,
    });
    expect(result.primaryConceptId).toBe('percentages');
    expect(await repositories.mastery.get('percentages')).not.toBeNull();
    expect(await repositories.mastery.get('vocabulary')).toBeNull();
  });
});

describe('finishing a session', () => {
  it('marks it complete with the score its own answers produced', async () => {
    const { repositories, questions } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 2,
      now: NOW,
    });
    const question = questionFor(questions, 'vocabulary');
    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: started.session.id,
      chosenChoiceId: choiceThatIs(question, true),
      dailyGoal: 10,
      now: NOW,
    });

    const session = await repositories.practice.getById(started.session.id);
    await finishSession({
      repositories,
      sessionId: started.session.id,
      correctCount: session?.correctCount ?? 0,
      now: new Date(NOW.getTime() + 60_000),
    });

    const finished = await repositories.practice.getById(started.session.id);
    expect(finished?.status).toBe('completed');
    expect(finished?.correctCount).toBe(1);
    expect(finished?.completedAt).not.toBeNull();
    expect(await repositories.practice.findResumable(exam.id)).toBeNull();
  });

  it('leaves a session resumable when the learner walks away', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 3,
      now: NOW,
    });

    await pauseSession(repositories, started.session.id, NOW);
    expect((await repositories.practice.getById(started.session.id))?.status).toBe('paused');
    expect((await repositories.practice.findResumable(exam.id))?.id).toBe(started.session.id);

    // Pausing a finished session changes nothing.
    await finishSession({ repositories, sessionId: started.session.id, correctCount: 0, now: NOW });
    await pauseSession(repositories, started.session.id, NOW);
    expect((await repositories.practice.getById(started.session.id))?.status).toBe('completed');
  });

  it('keeps the first finish when a session is finished twice', async () => {
    const { repositories } = await seed();
    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'smart-drill',
      questionCount: 2,
      now: NOW,
    });

    const firstFinish = new Date(NOW.getTime() + 60_000);
    const strayTick = new Date(NOW.getTime() + 900_000);
    // Two finishes arriving together — the deadline's tick and a double tap —
    // are run in order, so the second one sees the session already completed.
    await Promise.all([
      finishSession({
        repositories,
        sessionId: started.session.id,
        correctCount: 1,
        now: firstFinish,
      }),
      finishSession({
        repositories,
        sessionId: started.session.id,
        correctCount: 1,
        now: strayTick,
      }),
    ]);

    const finished = await repositories.practice.getById(started.session.id);
    expect(finished?.completedAt).toBe(firstFinish.toISOString());
    expect(finished?.durationSeconds).toBe(60);
  });

  it('does nothing for a session that is not there', async () => {
    const { repositories } = await seed();
    await expect(
      finishSession({ repositories, sessionId: 'missing', correctCount: 0, now: NOW }),
    ).resolves.toBeUndefined();
    await expect(pauseSession(repositories, 'missing', NOW)).resolves.toBeUndefined();
  });

  it('offers a follow-up question only when the bank has one', async () => {
    const { repositories, questions } = await seed();
    const first = questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    // Every question in the bundled pack has related or same-concept siblings, so the
    // offer is honest here…
    expect(await hasSimilarQuestion({ repositories, exam, question: first })).toBe(true);

    // …and it is withheld when nothing in the bank relates to the question.
    const orphan: Question = {
      ...first,
      id: 'question-with-no-relations',
      trackIds: ['a-track-with-no-content'],
      conceptIds: ['a-concept-with-no-content'],
      relatedQuestionGroupId: 'a-group-with-no-content',
    };
    expect(await hasSimilarQuestion({ repositories, exam, question: orphan })).toBe(false);
  });

  it('starts a one-question session about the same idea', async () => {
    const { repositories, questions } = await seed();
    const first = questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    const started = await startSession({
      repositories,
      exam,
      trackId: TRACK,
      mode: 'try-another-like-this',
      questionCount: 1,
      similarToQuestionId: first.id,
      now: NOW,
    });

    expect(started.session.mode).toBe('try-another-like-this');
    expect(started.plan.questions).toHaveLength(1);
    const asked = started.plan.questions[0];
    expect(asked?.id).not.toBe(first.id);
    // "Like this" means the same idea: a related group, or failing that a concept.
    const sameIdea =
      asked?.relatedQuestionGroupId === first.relatedQuestionGroupId ||
      asked?.conceptIds.some((conceptId) => first.conceptIds.includes(conceptId));
    expect(sameIdea).toBe(true);
  });
});
