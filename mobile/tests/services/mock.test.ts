import { importContentPack } from '@/data/local/content-import';
import type { Repositories } from '@/data/repositories';
import {
  answerMockItem,
  flagMockItem,
  loadMockResult,
  loadMockSession,
  loadMockSetup,
  pauseMock,
  resumeMock,
  startMock,
  submitMock,
} from '@/services/mock';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack, noShuffleRandom } from '@tests/utils/exam-fixtures';

/**
 * Mock exam service.
 *
 * The paper's whole life against a real database: what the setup promises, what starting
 * one stores, that answering inside the paper changes nothing about the learner until the
 * paper is submitted, that the clock only ever pauses and resumes by the time that was
 * left, and that submitting writes the paper through the one answer writer — once.
 */

const pack = loadCsePack();
const exam = pack.exam;
const TRACK = 'professional';

interface Fixture {
  readonly repositories: Repositories;
}

const seed = async (): Promise<Fixture> => {
  const { repositories } = await createMigratedDatabase();
  await importContentPack(repositories, pack);
  return { repositories };
};

const start = (repositories: Repositories, now = new Date()) =>
  startMock({ repositories, exam, trackId: TRACK, now, random: noShuffleRandom });

/** Local `YYYY-MM-DD`, which is the day an answer is recorded against. */
const localDay = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

describe('Mock exam service', () => {
  it('describes the paper before it starts, shortfall and all', async () => {
    const { repositories } = await seed();
    const setup = await loadMockSetup({ repositories, exam, trackId: TRACK });

    expect(setup.summary.trackId).toBe(TRACK);
    expect(setup.summary.trackName).toBe('Professional');
    expect(setup.summary.totalItems).toBe(170);
    expect(setup.summary.durationLabel).toBe('3h 10m');
    expect(setup.summary.allowPause).toBe(true);
    expect(setup.sections.map((section) => section.subjectId)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'analytical-ability',
      'general-information',
    ]);
    expect(setup.sections.every((section) => section.subjectName.length > 0)).toBe(true);
    // The bank cannot fill a 170-item paper yet, and the setup says so rather than
    // pretending the simulation is complete.
    expect(setup.allocation.shortfall).toBe(true);
    expect(setup.shortfallNote).toContain('72 of the 170');
    expect(setup.totalAvailable).toBe(72);
  });

  it('starts a paper with every item stored and the exam’s own deadline', async () => {
    const { repositories } = await seed();
    const now = new Date(2026, 9, 8, 9);
    const state = await start(repositories, now);

    expect(state.session.status).toBe('in-progress');
    expect(state.items).toHaveLength(72);
    expect(state.paper).toHaveLength(72);
    expect(state.session.totalItems).toBe(72);
    expect(state.remainingSeconds).toBe(190 * 60);
    expect(state.expired).toBe(false);
    expect(state.index).toBe(0);
    expect(state.progressLine).toBe('0 of 72 answered');
    expect(state.items.every((item) => item.chosenChoiceId === null)).toBe(true);
    // Nothing is written as an answer yet: a paper nobody sat changes nothing.
    expect(await repositories.answers.countAnswered(exam.id)).toBe(0);
  });

  it('answers, marks and moves without touching the learner’s record', async () => {
    const { repositories } = await seed();
    const state = await start(repositories);
    const question = state.paper[0];
    expect(question).toBeDefined();
    if (question === undefined) return;

    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question,
      chosenChoiceId: question.correctChoiceId,
    });
    await flagMockItem({
      repositories,
      sessionId: state.session.id,
      questionId: question.id,
      flagged: true,
    });

    const open = await loadMockSession({ repositories, exam });
    expect(open?.items[0]?.chosenChoiceId).toBe(question.correctChoiceId);
    expect(open?.items[0]?.isCorrect).toBe(true);
    expect(open?.items[0]?.flagged).toBe(true);
    expect(open?.progressLine).toBe('1 of 72 answered');
    expect((await repositories.mock.getById(state.session.id))?.answeredCount).toBe(1);
    // Mastery, the review queue, the day's activity and the streak wait for submission.
    expect(await repositories.mastery.listByExam(exam.id)).toHaveLength(0);
    expect(await repositories.answers.countAnswered(exam.id)).toBe(0);
    expect(await repositories.activity.get(localDay(new Date()), exam.id)).toBeNull();
  });

  it('lets an answer be changed inside the paper', async () => {
    const { repositories } = await seed();
    const state = await start(repositories);
    const question = state.paper[0];
    if (question === undefined) return;
    const wrong = question.choices.find((choice) => choice.id !== question.correctChoiceId);

    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question,
      chosenChoiceId: wrong?.id ?? 'x',
    });
    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question,
      chosenChoiceId: question.correctChoiceId,
    });

    const open = await loadMockSession({ repositories, exam });
    expect(open?.items[0]?.isCorrect).toBe(true);
    expect(open?.progressLine).toBe('1 of 72 answered');
    expect((await repositories.mock.getById(state.session.id))?.correctCount).toBe(1);
  });

  it('pauses the clock on a stored remainder and resumes it from there', async () => {
    const { repositories } = await seed();
    const now = new Date(2026, 9, 8, 9);
    const state = await start(repositories, now);

    await pauseMock({
      repositories,
      sessionId: state.session.id,
      now: new Date(now.getTime() + 10 * 60_000),
    });

    const paused = await loadMockSession({
      repositories,
      exam,
      now: new Date(now.getTime() + 3_600_000),
    });
    expect(paused?.session.status).toBe('paused');
    expect(paused?.expired).toBe(false);
    expect(paused?.remainingSeconds).toBe(180 * 60);

    const resumedAt = new Date(now.getTime() + 5 * 3_600_000);
    await resumeMock({ repositories, sessionId: state.session.id, now: resumedAt });

    const resumed = await loadMockSession({ repositories, exam, now: resumedAt });
    expect(resumed?.session.status).toBe('in-progress');
    expect(resumed?.remainingSeconds).toBe(180 * 60);
    expect(resumed?.expired).toBe(false);
  });

  it('expires a paper left open past its deadline, without losing it', async () => {
    const { repositories } = await seed();
    const now = new Date(2026, 9, 8, 9);
    await start(repositories, now);

    const later = new Date(now.getTime() + 4 * 3_600_000);
    const open = await loadMockSession({ repositories, exam, now: later });

    expect(open?.expired).toBe(true);
    expect(open?.remainingSeconds).toBe(0);
    expect(open?.items).toHaveLength(72);
  });

  it('submits through the answer writer, which is what makes a mock count', async () => {
    const { repositories } = await seed();
    const now = new Date(2026, 9, 8, 9);
    const state = await start(repositories, now);
    const [first, second] = state.paper;
    if (first === undefined || second === undefined) return;

    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question: first,
      chosenChoiceId: first.correctChoiceId,
    });
    const wrong = second.choices.find((choice) => choice.id !== second.correctChoiceId);
    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question: second,
      chosenChoiceId: wrong?.id ?? 'x',
    });

    const result = await submitMock({
      repositories,
      exam,
      sessionId: state.session.id,
      dailyGoal: 10,
      now,
    });

    expect(result.total).toBe(72);
    expect(result.answered).toBe(2);
    expect(result.correct).toBe(1);
    expect(result.scorePercent).toBe(1);
    expect(result.skipped).toBe(70);
    expect(result.subjects).toHaveLength(4);

    const stored = await repositories.mock.getById(state.session.id);
    expect(stored?.status).toBe('completed');
    expect(stored?.completedAt).not.toBeNull();
    expect(stored?.answeredCount).toBe(2);
    expect(stored?.correctCount).toBe(1);

    // The paper's answers are real answers: mastery, the review queue, the day's activity
    // and the streak all saw them.
    const answers = await repositories.answers.listBySession(state.session.id);
    expect(answers).toHaveLength(2);
    expect(answers.every((answer) => answer.source === 'mock')).toBe(true);
    expect(await repositories.mastery.listByExam(exam.id)).toHaveLength(2);
    const mastery = await repositories.mastery.listByExam(exam.id);
    expect(mastery.filter((row) => row.correctCount === 1)).toHaveLength(1);
    expect(mastery.filter((row) => row.wrongCount === 1)).toHaveLength(1);
    const reviewItems = await repositories.review.listAll(exam.id);
    expect(reviewItems).toHaveLength(1);
    expect(reviewItems[0]?.source).toBe('mistake');
    const activity = await repositories.activity.get(localDay(new Date(2026, 9, 8)), exam.id);
    expect(activity?.questionsAnswered).toBe(2);
    expect(activity?.correctCount).toBe(1);
  });

  it('cannot count the same item twice when a paper is submitted again', async () => {
    const { repositories } = await seed();
    const state = await start(repositories);
    const question = state.paper[0];
    if (question === undefined) return;
    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question,
      chosenChoiceId: question.correctChoiceId,
    });

    const first = await submitMock({
      repositories,
      exam,
      sessionId: state.session.id,
      dailyGoal: 10,
    });
    const second = await submitMock({
      repositories,
      exam,
      sessionId: state.session.id,
      dailyGoal: 10,
    });

    expect(first.correct).toBe(1);
    expect(second.correct).toBe(1);
    expect(await repositories.answers.listBySession(state.session.id)).toHaveLength(1);
    expect(
      (await repositories.mastery.get(question.conceptIds[0] ?? 'vocabulary'))?.correctCount,
    ).toBe(1);
  });

  it('reads a submitted paper back as its result, and an open one as nothing', async () => {
    const { repositories } = await seed();
    const state = await start(repositories);
    expect(await loadMockResult({ repositories, exam, sessionId: state.session.id })).toBeNull();

    await submitMock({ repositories, exam, sessionId: state.session.id, dailyGoal: 10 });
    const result = await loadMockResult({ repositories, exam, sessionId: state.session.id });

    expect(result?.total).toBe(72);
    expect(result?.expired).toBe(false);
    expect(result?.recommendation.kind).toBe('retake');
  });

  it('marks a paper submitted at the buzzer as expired rather than complete', async () => {
    const { repositories } = await seed();
    const now = new Date(2026, 9, 8, 9);
    const state = await start(repositories, now);
    const question = state.paper[0];
    if (question === undefined) return;
    await answerMockItem({
      repositories,
      sessionId: state.session.id,
      question,
      chosenChoiceId: question.correctChoiceId,
    });

    const result = await submitMock({
      repositories,
      exam,
      sessionId: state.session.id,
      dailyGoal: 10,
      expired: true,
      now: new Date(now.getTime() + 200 * 60_000),
    });

    expect(result.expired).toBe(true);
    expect(result.answered).toBe(1);
    expect((await repositories.mock.getById(state.session.id))?.status).toBe('expired');
    // An attempt that ran out of time still produced a result.
    expect(
      await loadMockResult({ repositories, exam, sessionId: state.session.id }),
    ).not.toBeNull();
  });

  it('refuses to submit a paper that is no longer on the device', async () => {
    const { repositories } = await seed();
    await expect(
      submitMock({ repositories, exam, sessionId: 'missing', dailyGoal: 10 }),
    ).rejects.toThrow(/no longer on this device/);
  });
});
