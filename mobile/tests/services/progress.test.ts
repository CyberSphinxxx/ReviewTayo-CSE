import { importContentPack } from '@/data/local/content-import';
import type { Repositories } from '@/data/repositories';
import type { Question } from '@/domain/exams/types';
import { toIsoDate } from '@/domain/study-plan';
import { submitAnswer } from '@/services/practice';
import { loadConceptMastery, loadProgressOverview } from '@/services/progress';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Progress service.
 *
 * The overview and the mastery list, run against a real database with real answers in
 * it. What is asserted here is what the learner would notice: that the score moves when
 * they answer, that the week counts the work they actually did, that the subject called
 * out is the one they are getting wrong, and that Progress and Practice name the same
 * weakest area.
 */

const pack = loadCsePack();
const exam = pack.exam;
const policy = exam.studyPolicy;
const TRACK = 'professional';
const NOW = new Date();
/**
 * When the screen reads. Answers are written at `NOW` and a real read always happens
 * after them, so the overview is loaded a second later — the score window starts at the
 * read, and an answer at exactly that instant would otherwise fall outside it.
 */
const LATER = new Date(NOW.getTime() + 1000);
const DAILY_GOAL = 10;

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

const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const overviewFor = (
  repositories: Repositories,
  overrides: Partial<Parameters<typeof loadProgressOverview>[0]> = {},
) =>
  loadProgressOverview({
    repositories,
    exam,
    trackId: TRACK,
    examDate: null,
    dailyGoal: DAILY_GOAL,
    studyDays: ['Mon', 'Wed', 'Fri'],
    now: LATER,
    ...overrides,
  });

/** Records one answer to a real question; `correct: false` picks a wrong choice. */
const answer = async (
  repositories: Repositories,
  question: Question,
  correct: boolean,
): Promise<void> => {
  const chosen = correct
    ? question.correctChoiceId
    : (question.choices.find((choice) => choice.id !== question.correctChoiceId)?.id ?? 'x');
  await submitAnswer({
    repositories,
    exam,
    question,
    sessionId: null,
    chosenChoiceId: chosen,
    dailyGoal: DAILY_GOAL,
    now: NOW,
  });
};

const questionsFor = (questions: readonly Question[], subjectId: string): readonly Question[] =>
  questions.filter((question) => question.subjectId === subjectId);

const completedMock = async (
  repositories: Repositories,
  overrides: { readonly status?: string; readonly correctCount?: number } = {},
): Promise<void> => {
  await repositories.mock.create(
    {
      id: `mock-${overrides.status ?? 'completed'}`,
      examId: exam.id,
      trackId: TRACK,
      status: (overrides.status ?? 'completed') as 'completed' | 'in-progress',
      totalItems: 170,
      answeredCount: 170,
      correctCount: overrides.correctCount ?? 116,
      startedAt: daysAgo(3),
      updatedAt: daysAgo(3),
      completedAt: overrides.status === 'in-progress' ? null : daysAgo(3),
      expiresAt: new Date(NOW.getTime() + 3_600_000).toISOString(),
      pausedAt: null,
      remainingSeconds: null,
      payload: null,
    },
    [],
  );
};

describe('Progress service', () => {
  it('is honest before the learner has answered anything', async () => {
    const { repositories } = await seed();
    const overview = await overviewFor(repositories);

    expect(overview.score.value).toBe(0);
    expect(overview.score.trend.direction).toBe('unknown');
    expect(overview.needsAttention).toBeNull();
    expect(overview.recentMock).toBeNull();
    expect(overview.mastery.line).toContain('not started yet');
    expect(overview.subjects).toHaveLength(4);
    expect(overview.subjects.every((row) => row.percent === '0%' && !row.started)).toBe(true);
    expect(overview.week.questions).toBe(0);
    expect(overview.week.line).toBe('No questions answered this week yet');
  });

  it('moves the score and the week with the answers the learner gives', async () => {
    const { repositories, questions } = await seed();
    const subject = questionsFor(questions, 'verbal-ability').slice(0, 4);
    expect(subject).toHaveLength(4);
    for (const question of subject) {
      await answer(repositories, question, true);
    }

    const overview = await overviewFor(repositories);

    expect(overview.score.value).toBeGreaterThan(0);
    expect(overview.score.components.accuracy).toBe(1);
    // One day of the week's seven had work in it.
    expect(overview.score.components.consistency).toBeCloseTo(1 / 7, 5);
    // Nothing was done last week, so there is nowhere to have gone but up.
    expect(overview.score.trend.direction).toBe('improving');
    expect(overview.week.questions).toBe(4);
    expect(overview.week.correct).toBe(4);
    expect(overview.week.days.find((day) => day.day === toIsoDate(NOW))?.questions).toBe(4);
  });

  it('reports subject accuracy with the row the subject row is built from', async () => {
    const { repositories, questions } = await seed();
    const subject = questionsFor(questions, 'numerical-ability').slice(0, 2);
    await answer(repositories, subject[0] as Question, true);
    await answer(repositories, subject[1] as Question, false);

    const overview = await overviewFor(repositories);
    const row = overview.subjects.find((entry) => entry.subjectId === 'numerical-ability');

    expect(row?.percent).toBe('50%');
    expect(row?.accuracy).toBeCloseTo(0.5, 5);
    expect(row?.started).toBe(true);
    expect(row?.line).toContain('50% accuracy');
    expect(overview.subjects.find((entry) => entry.subjectId === 'verbal-ability')?.started).toBe(
      false,
    );
  });

  it('names the weakest subject the learner has answered enough of', async () => {
    const { repositories, questions } = await seed();
    const verbal = questionsFor(questions, 'verbal-ability').slice(
      0,
      policy.weakestAreaMinimumAttempts,
    );
    for (const question of verbal) {
      await answer(repositories, question, false);
    }
    await answer(repositories, questionsFor(questions, 'numerical-ability')[0] as Question, true);

    const overview = await overviewFor(repositories);

    expect(overview.needsAttention?.subjectId).toBe('verbal-ability');
    expect(overview.needsAttention?.subjectName).toBe('Verbal Ability');
    expect(overview.needsAttention?.line).toBe('0% accuracy');
    expect(overview.needsAttention?.count).toBe(Math.max(1, policy.drillSize));
    expect(overview.subjects.find((row) => row.subjectId === 'verbal-ability')?.isWeakest).toBe(
      true,
    );
  });

  it('summarises the mastery the answers wrote, not a separate count', async () => {
    const { repositories, questions } = await seed();
    const subject = questionsFor(questions, 'analytical-ability');
    const firstConcept = subject[0]?.conceptIds[0];
    const sameConcept = subject.filter((question) => question.conceptIds[0] === firstConcept);
    for (const question of sameConcept) {
      await answer(repositories, question, true);
    }

    const overview = await overviewFor(repositories);

    expect(overview.mastery.started).toBe(1);
    // Four right answers is where the content and the evidence floor leave a concept:
    // perfect accuracy, but not yet five answers of proof.
    expect(overview.mastery.strong).toBe(1);
    expect(overview.mastery.mastered).toBe(0);
    expect(overview.mastery.solidRatio).toBeCloseTo(1 / overview.mastery.total, 5);
    expect(overview.mastery.line).toBe(`0 of ${overview.mastery.total} mastered · 1 started`);
  });

  it('uses the learner\u2019s own study days for the weekly goal', async () => {
    const { repositories } = await seed();

    const planned = await overviewFor(repositories, { studyDays: ['Mon', 'Wed', 'Fri'] });
    const flexible = await overviewFor(repositories, { studyDays: [] });

    expect(planned.week.plannedDays).toBe(3);
    expect(planned.week.target).toBe(DAILY_GOAL * 3);
    expect(planned.week.goalLine).toBe('0 of 3 study days');
    expect(flexible.week.target).toBe(0);
    expect(flexible.week.goalLine).toBe('');
  });

  it('places the learner on the journey from their exam date', async () => {
    const { repositories } = await seed();
    const examDate = toIsoDate(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 45));

    const overview = await overviewFor(repositories, { examDate });

    expect(overview.journey.activeId).toBe('accuracy');
    expect(overview.journey.stops).toHaveLength(exam.studyPolicy.journeyPhases.length);
    expect(overview.journey.line).toContain('Accuracy Phase');
    expect(overview.journey.stops[0]?.status).toBe('done');
  });

  it('shows the last completed mock and ignores one still in progress', async () => {
    const { repositories } = await seed();
    expect((await overviewFor(repositories)).recentMock).toBeNull();

    await completedMock(repositories, { status: 'in-progress' });
    expect((await overviewFor(repositories)).recentMock).toBeNull();

    await completedMock(repositories, { correctCount: 116 });
    const overview = await overviewFor(repositories);

    expect(overview.recentMock?.subtitle).toBe('Professional · 68%');
    expect(overview.recentMock?.title).toBe('Full mock · 3 days ago');
    expect(overview.recentMock?.scorePercent).toBe(68);
  });

  it('lists every concept in the track, least mastered first', async () => {
    const { repositories } = await seed();
    const list = await loadConceptMastery({ repositories, exam, trackId: TRACK });

    expect(list.title).toBe('Concept mastery');
    expect(list.isSubject).toBe(false);
    expect(list.rows).toHaveLength(18);
    expect(list.subtitle).toBe('18 concepts · not started yet');
  });

  it('narrows the list to a subject without leaving the track', async () => {
    const { repositories } = await seed();

    const verbal = await loadConceptMastery({
      repositories,
      exam,
      trackId: TRACK,
      subjectId: 'verbal-ability',
    });
    const clerical = await loadConceptMastery({
      repositories,
      exam,
      trackId: TRACK,
      subjectId: 'clerical-ability',
    });

    expect(verbal.title).toBe('Verbal Ability');
    expect(verbal.isSubject).toBe(true);
    expect(verbal.rows).toHaveLength(5);
    expect(verbal.rows.every((row) => row.subjectName === 'Verbal Ability')).toBe(true);
    // Clerical Ability belongs to the other track, so it is not part of this learner's
    // syllabus at all.
    expect(clerical.rows).toHaveLength(0);
  });

  it('shows mastery moving from the answers the learner gives', async () => {
    const { repositories, questions } = await seed();
    const conceptId = questionsFor(questions, 'general-information')[0]?.conceptIds[0] ?? '';
    const sameConcept = questionsFor(questions, 'general-information').filter(
      (question) => question.conceptIds[0] === conceptId,
    );

    await answer(repositories, sameConcept[0] as Question, false);
    const afterMiss = await loadConceptMastery({ repositories, exam, trackId: TRACK });
    const missed = afterMiss.rows.find((row) => row.conceptId === conceptId);
    expect(missed?.started).toBe(true);
    expect(missed?.level).toBe('Learning');

    for (const question of sameConcept.slice(0, 4)) {
      await answer(repositories, question, true);
    }
    const afterPractice = await loadConceptMastery({ repositories, exam, trackId: TRACK });
    const improved = afterPractice.rows.find((row) => row.conceptId === conceptId);

    expect(improved?.attempts).toBe(5);
    expect(improved?.level).toBe('Strong');
    expect(improved?.accuracy).toBeCloseTo(4 / 5, 5);
  });
});
