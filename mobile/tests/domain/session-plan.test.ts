import { bundledContentPacks, fixtureContentPack } from '@content/exams';
import {
  buildDailyQuestionPlan,
  buildMockSessionPlan,
  buildSessionPlan,
  buildSimilarQuestionPlan,
  shuffle,
} from '@/domain/exams/session-plan';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamContentPack, Question } from '@/domain/exams/types';

import { seededRandom } from '@tests/utils/exam-fixtures';

/**
 * Generic session planning.
 *
 * The same functions are exercised against the CSE pack and the deliberately
 * non-CSE fixture exam. If any of these ever needed an exam-specific branch, the
 * fixture cases below would fail — which is the point of the fixture.
 */

const loadPack = (raw: unknown): ExamContentPack => {
  const result = validateContentPack(raw as Parameters<typeof validateContentPack>[0]);
  if (result.pack === null) throw new Error('pack invalid');
  return result.pack;
};

const cse = loadPack(bundledContentPacks[0]);
const fixture = loadPack(fixtureContentPack);

describe('shuffle', () => {
  it('keeps every element and the original array untouched', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input, seededRandom(7));

    expect([...output].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('buildSessionPlan', () => {
  it('returns the requested number of questions when content allows', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      { mode: 'smart-drill', trackId: 'professional', questionCount: 10 },
      { random: seededRandom(1) },
    );

    expect(plan.plannedCount).toBe(10);
    expect(plan.shortfall).toBe(false);
    expect(plan.questions.every((question) => question.examId === 'cse')).toBe(true);
  });

  it('never repeats a question inside one session', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      { mode: 'random-set', trackId: 'professional', questionCount: 30 },
      { random: seededRandom(2) },
    );

    const ids = plan.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports a shortfall rather than silently returning fewer questions', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      { mode: 'build-a-quiz', trackId: 'professional', questionCount: 500 },
      { random: seededRandom(3) },
    );

    expect(plan.shortfall).toBe(true);
    expect(plan.requestedCount).toBe(500);
    expect(plan.plannedCount).toBeGreaterThan(0);
    expect(plan.plannedCount).toBeLessThan(500);
  });

  it('honours a subject filter', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      {
        mode: 'practice-by-subject',
        trackId: 'subprofessional',
        questionCount: 6,
        subjectIds: ['clerical-ability'],
      },
      { random: seededRandom(4) },
    );

    expect(plan.plannedCount).toBe(6);
    expect(plan.questions.every((question) => question.subjectId === 'clerical-ability')).toBe(
      true,
    );
  });

  it('refuses to serve a subject the track does not examine', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      {
        mode: 'practice-by-subject',
        trackId: 'professional',
        questionCount: 6,
        subjectIds: ['clerical-ability'],
      },
      { random: seededRandom(5) },
    );

    expect(plan.plannedCount).toBe(0);
    expect(plan.shortfall).toBe(true);
  });

  it('honours a concept filter', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      {
        mode: 'mastery-rounds',
        trackId: 'professional',
        questionCount: 4,
        conceptIds: ['percentages'],
      },
      { random: seededRandom(6) },
    );

    expect(plan.questions.every((question) => question.conceptIds.includes('percentages'))).toBe(
      true,
    );
  });

  it('honours a difficulty filter', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      {
        mode: 'mastery-rounds',
        trackId: 'professional',
        questionCount: 4,
        difficulties: ['challenging'],
      },
      { random: seededRandom(7) },
    );

    expect(plan.questions.every((question) => question.difficulty === 'challenging')).toBe(true);
  });

  it('excludes questions the caller has already served', () => {
    const excluded = cse.questions.slice(0, 5).map((question) => question.id);
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      {
        mode: 'smart-drill',
        trackId: 'professional',
        questionCount: 25,
        excludeQuestionIds: excluded,
      },
      { random: seededRandom(8) },
    );

    expect(plan.questions.some((question) => excluded.includes(question.id))).toBe(false);
  });

  it('spreads the first questions across different concepts', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      { mode: 'smart-drill', trackId: 'professional', questionCount: 6 },
      { random: seededRandom(9) },
    );

    const firstConcepts = plan.questions.map((question) => question.conceptIds[0]);
    expect(new Set(firstConcepts).size).toBe(6);
  });

  it('reports the subject mix of the session', () => {
    const plan = buildSessionPlan(
      cse.exam,
      cse.questions,
      { mode: 'random-set', trackId: 'subprofessional', questionCount: 12 },
      { random: seededRandom(10) },
    );

    const total = Object.values(plan.subjectMix).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(12);
    expect(plan.subjectMix['clerical-ability']).toBeGreaterThanOrEqual(0);
  });

  it('returns an empty plan for a zero-question request', () => {
    const plan = buildSessionPlan(cse.exam, cse.questions, {
      mode: 'build-a-quiz',
      trackId: 'professional',
      questionCount: 0,
    });

    expect(plan.questions).toEqual([]);
    expect(plan.shortfall).toBe(false);
  });

  it('can serve only published questions', () => {
    const withRetired: Question[] = [
      ...cse.questions,
      {
        ...cse.questions[0]!,
        id: 'retired-1',
        status: 'retired',
      },
    ];

    const plan = buildSessionPlan(
      cse.exam,
      withRetired,
      { mode: 'random-set', trackId: 'professional', questionCount: 200 },
      { random: seededRandom(11) },
    );

    expect(plan.questions.some((question) => question.id === 'retired-1')).toBe(false);
  });
});

describe('buildDailyQuestionPlan', () => {
  it('returns exactly one question', () => {
    const plan = buildDailyQuestionPlan(cse.exam, cse.questions, 'professional');

    expect(plan.plannedCount).toBe(1);
    expect(plan.questions).toHaveLength(1);
  });

  it('avoids repeating the previous daily questions', () => {
    const excluded = cse.questions.slice(0, 20).map((question) => question.id);
    const plan = buildDailyQuestionPlan(cse.exam, cse.questions, 'professional', excluded, {
      random: seededRandom(12),
    });

    expect(excluded).not.toContain(plan.questions[0]?.id);
  });
});

describe('buildSimilarQuestionPlan', () => {
  it('prefers another question from the same related group', () => {
    const missed = cse.questions.find(
      (question) => question.relatedQuestionGroupId === 'cse-verbal-vocabulary-a',
    );
    if (missed === undefined) throw new Error('expected a vocabulary group question');

    const plan = buildSimilarQuestionPlan(cse.exam, cse.questions, missed, {
      random: seededRandom(13),
    });

    expect(plan.plannedCount).toBe(1);
    expect(plan.questions[0]?.relatedQuestionGroupId).toBe('cse-verbal-vocabulary-a');
    expect(plan.questions[0]?.id).not.toBe(missed.id);
  });

  it('falls back to the same concept when no group exists', () => {
    const missed: Question = {
      ...cse.questions[0]!,
      id: 'ungrouped',
      relatedQuestionGroupId: undefined,
      conceptIds: ['percentages'],
      subjectId: 'numerical-ability',
    };

    const plan = buildSimilarQuestionPlan(cse.exam, cse.questions, missed, {
      random: seededRandom(14),
    });

    expect(plan.plannedCount).toBe(1);
    expect(plan.questions[0]?.conceptIds).toContain('percentages');
  });
});

describe('buildMockSessionPlan', () => {
  it('follows the blueprint per subject for the fixture exam', () => {
    const { plan, allocation } = buildMockSessionPlan(fixture.exam, fixture.questions, 'default', {
      random: seededRandom(15),
    });

    expect(allocation.shortfall).toBe(false);
    expect(plan.plannedCount).toBe(10);
    expect(plan.subjectMix['cataloguing']).toBe(5);
    expect(plan.subjectMix['reference-service']).toBe(5);
  });

  it('reports a shortfall instead of under-delivering silently', () => {
    const thin = fixture.questions.slice(0, 3);
    const { plan, allocation } = buildMockSessionPlan(fixture.exam, thin, 'default', {
      random: seededRandom(16),
    });

    expect(allocation.shortfall).toBe(true);
    expect(allocation.requestedTotal).toBe(10);
    expect(plan.plannedCount).toBe(3);
    expect(plan.shortfall).toBe(true);
  });

  it('uses CSE track blueprints without any exam-specific code', () => {
    const professional = buildMockSessionPlan(cse.exam, cse.questions, 'professional', {
      random: seededRandom(17),
    });
    const subProfessional = buildMockSessionPlan(cse.exam, cse.questions, 'subprofessional', {
      random: seededRandom(18),
    });

    expect(professional.allocation.requestedTotal).toBe(170);
    expect(subProfessional.allocation.requestedTotal).toBe(165);
    expect(professional.allocation.shortfall).toBe(true);
  });

  it('never repeats a question within the mock', () => {
    const { plan } = buildMockSessionPlan(cse.exam, cse.questions, 'professional', {
      random: seededRandom(19),
    });

    const ids = plan.questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('multi-exam genericity', () => {
  it('plans sessions for a non-CSE exam with the same code path', () => {
    const plan = buildSessionPlan(
      fixture.exam,
      fixture.questions,
      { mode: 'smart-drill', trackId: 'default', questionCount: 5 },
      { random: seededRandom(20) },
    );

    expect(plan.plannedCount).toBe(5);

    const fixtureSubjectIds = fixture.exam.subjects.map((subject) => subject.id);
    expect(plan.questions.every((question) => fixtureSubjectIds.includes(question.subjectId))).toBe(
      true,
    );
  });

  it('resolves fixture subjects and concepts without CSE identifiers appearing', () => {
    const subjectIds = fixture.exam.subjects.map((subject) => subject.id);
    expect(subjectIds).toEqual(['cataloguing', 'reference-service']);
    expect(subjectIds).not.toContain('verbal-ability');
  });

  it('reads the fixture journey phases from config', () => {
    expect(fixture.exam.studyPolicy.journeyPhases.map((phase) => phase.id)).toEqual([
      'warm-up',
      'steady',
      'exam-week',
    ]);
  });

  it('uses the fixture drill size rather than CSE values', () => {
    expect(fixture.exam.studyPolicy.drillSize).toBe(5);
    expect(cse.exam.studyPolicy.drillSize).toBe(10);
  });
});
