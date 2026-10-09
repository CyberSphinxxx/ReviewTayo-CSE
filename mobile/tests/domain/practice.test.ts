import type { Question } from '@/domain/exams/types';
import {
  ADDED_TO_REVIEW_LINE,
  allActions,
  answerOutcome,
  CORRECT_HEADLINE,
  describeMasteryChange,
  describeScore,
  describeSessionSummary,
  drillConceptIds,
  isCorrectChoice,
  LOW_COVERAGE_ATTEMPTS,
  NEXT_LABEL,
  practiceCatalogue,
  RESULTS_LABEL,
  taskKindForMode,
  weakestSubject,
  weightConcepts,
  WRONG_HEADLINE,
} from '@/domain/practice';
import {
  accuracyOf,
  describeAccuracyPercent,
  type ConceptEvidence,
  type SubjectAccuracy,
} from '@/domain/sessions';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Practice domain.
 *
 * The drill's ranking, the catalogue and the feedback copy are the parts of Practice
 * that decide what the learner is asked and what they are told. They are asserted here
 * rather than through a screen, because a wrong ranking is a product fault however it
 * is rendered.
 */

const { exam } = loadCsePack();
const policy = exam.studyPolicy;
const TRACK = 'professional';

const evidence = (
  conceptId: string,
  correctCount: number,
  wrongCount: number,
  lastAnsweredAt: string | null = null,
): ConceptEvidence => ({ conceptId, correctCount, wrongCount, lastAnsweredAt });

const accuracy = (subjectId: string, answered: number, correct: number): SubjectAccuracy => ({
  subjectId,
  answered,
  correct,
});

const baseInput = {
  exam,
  trackId: TRACK,
  policy,
  accuracy: [] as readonly SubjectAccuracy[],
};

describe('smart drill ranking', () => {
  it('ranks material never seen highest when nothing else stands out', () => {
    const weights = weightConcepts({ ...baseInput, evidence: [] });
    expect(weights[0]?.conceptId).toBe('vocabulary');
    expect(weights[0]?.reasons).toContain('unseen');
    // Every concept is unseen here, so the ranking is the track's own order.
    expect(weights.map((weight) => weight.conceptId)[0]).toBe('vocabulary');
    expect(weights.every((weight) => weight.score === policy.smartDrillWeights.unseen)).toBe(true);
  });

  it('prefers a concept the learner keeps getting wrong', () => {
    const weights = weightConcepts({
      ...baseInput,
      // vocabulary is seen and shaky; everything else is unseen.
      evidence: [evidence('vocabulary', 1, 3)],
    });
    const vocabulary = weights.find((weight) => weight.conceptId === 'vocabulary');
    expect(vocabulary?.reasons).toContain('weakness');
    expect(vocabulary?.score).toBeGreaterThan(policy.smartDrillWeights.unseen);
  });

  it('counts a concept that is waiting in the review queue', () => {
    const weights = weightConcepts({
      ...baseInput,
      evidence: [evidence('vocabulary', 6, 0)],
      dueConceptIds: ['vocabulary'],
    });
    const vocabulary = weights.find((weight) => weight.conceptId === 'vocabulary');
    expect(vocabulary?.reasons).toEqual(['due-review']);
    expect(vocabulary?.score).toBe(policy.smartDrillWeights.dueReview);
  });

  it('treats thin coverage as a reason to revisit, and stops at the floor', () => {
    const thin = weightConcepts({
      ...baseInput,
      evidence: [evidence('vocabulary', 8, 0), evidence('grammar-and-usage', 1, 0)],
    }).find((weight) => weight.conceptId === 'grammar-and-usage');
    expect(thin?.attempts).toBe(1);
    expect(thin?.reasons).toContain('low-coverage');

    const deep = weightConcepts({
      ...baseInput,
      evidence: [evidence('grammar-and-usage', LOW_COVERAGE_ATTEMPTS, 0)],
    }).find((weight) => weight.conceptId === 'grammar-and-usage');
    expect(deep?.reasons).not.toContain('low-coverage');
    expect(deep?.score).toBe(0);
  });

  it('keeps the lesson just studied fresh in mind', () => {
    const weights = weightConcepts({
      ...baseInput,
      evidence: [evidence('vocabulary', 9, 0), evidence('analogy', 9, 0)],
      recentConceptIds: ['analogy'],
    });
    const analogy = weights.find((weight) => weight.conceptId === 'analogy');
    expect(analogy?.reasons).toEqual(['recent-lesson']);
    expect(analogy?.score).toBe(policy.smartDrillWeights.recentLesson);
  });

  it('is stable: ties keep the track order', () => {
    const first = weightConcepts({ ...baseInput, evidence: [] }).map((w) => w.conceptId);
    const second = weightConcepts({ ...baseInput, evidence: [] }).map((w) => w.conceptId);
    expect(first).toEqual(second);
    expect(first.slice(0, 3)).toEqual(['vocabulary', 'grammar-and-usage', 'sentence-completion']);
  });

  it('never ranks a concept from another track', () => {
    const ids = weightConcepts({ ...baseInput, evidence: [] }).map((weight) => weight.conceptId);
    expect(ids).not.toContain('alphabetizing-and-filing');
    expect(ids).toContain('number-series');
  });

  it('offers the top concepts, and nothing when nothing stands out', () => {
    expect(drillConceptIds({ ...baseInput, evidence: [] }, 3)).toEqual([
      'vocabulary',
      'grammar-and-usage',
      'sentence-completion',
    ]);
    // Everything seen, nothing weak, nothing due: there is no reason to prefer one.
    const settled = exam.concepts.map((concept) => evidence(concept.id, 9, 0));
    expect(drillConceptIds({ ...baseInput, evidence: settled }, 3)).toEqual([]);
    expect(drillConceptIds({ ...baseInput, evidence: [] }, 0)).toEqual([]);
  });
});

describe('weakest area', () => {
  it('is absent until a subject has been answered enough to judge', () => {
    const minimum = policy.weakestAreaMinimumAttempts;
    expect(
      weakestSubject(exam, TRACK, [accuracy('verbal-ability', minimum - 1, 0)], policy),
    ).toBeNull();
    expect(
      weakestSubject(
        exam,
        TRACK,
        [
          accuracy('verbal-ability', minimum + 2, minimum),
          accuracy('numerical-ability', minimum + 2, minimum + 2),
        ],
        policy,
      )?.subjectId,
    ).toBe('verbal-ability');
  });

  it('ignores a subject the track does not examine', () => {
    const minimum = policy.weakestAreaMinimumAttempts;
    expect(
      weakestSubject(exam, TRACK, [accuracy('clerical-ability', minimum + 4, 0)], policy),
    ).toBeNull();
    expect(
      weakestSubject(
        exam,
        'subprofessional',
        [accuracy('clerical-ability', minimum + 4, 1)],
        policy,
      )?.subjectId,
    ).toBe('clerical-ability');
  });

  it('reports the accuracy it is judging', () => {
    expect(describeAccuracyPercent(accuracyOf(accuracy('verbal-ability', 25, 16)))).toBe('64%');
    expect(describeAccuracyPercent(accuracyOf(accuracy('verbal-ability', 0, 0)))).toBe('0%');
  });
});

describe('practice catalogue', () => {
  const minimum = policy.weakestAreaMinimumAttempts;
  const judgeable = [accuracy('verbal-ability', minimum + 4, minimum)];

  it('sizes the primary action from the learner\u2019s own goal', () => {
    const catalogue = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 6,
      accuracy: [],
    });
    expect(catalogue.primary.mode).toBe('smart-drill');
    expect(catalogue.primary.count).toBe(6);
    expect(catalogue.primary.meta).toBe('6 questions · ~6 min');
    expect(catalogue.primary.description).toMatch(/recent practice/);
  });

  it('offers a weakest area only when the data supports one', () => {
    const without = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 10,
      accuracy: [],
    });
    expect(without.targeted.map((action) => action.id)).toEqual(['timed-practice']);

    const withArea = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 10,
      accuracy: judgeable,
    });
    const weakest = withArea.targeted[0];
    expect(weakest?.id).toBe('weakest-area');
    // Eight right out of twelve judged answers.
    expect(weakest?.meta).toBe('Verbal Ability · 67%');
    expect(weakest?.subjectIds).toEqual(['verbal-ability']);
  });

  it('takes timed practice straight from the exam policy', () => {
    const catalogue = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 10,
      accuracy: [],
    });
    const timed = catalogue.targeted.find((action) => action.id === 'timed-practice');
    expect(timed?.count).toBe(policy.timedPracticeQuestionCount);
    expect(timed?.timeLimitMinutes).toBe(policy.timedPracticeMinutes);
    expect(timed?.meta).toBe(
      `${policy.timedPracticeQuestionCount} questions · ${policy.timedPracticeMinutes}m`,
    );
  });

  it('keeps everything else behind one disclosure, with the mock weighted by the blueprint', () => {
    const catalogue = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 10,
      accuracy: [],
    });
    expect(catalogue.more.map((action) => action.id)).toEqual([
      'random-set',
      'build-a-quiz',
      'mastery-rounds',
      'practice-by-subject',
      'mock-exam',
    ]);
    const mock = catalogue.more.find((action) => action.id === 'mock-exam');
    expect(mock?.count).toBe(170);
    expect(mock?.meta).toBe('170 items · 3h 10m');
    expect(mock?.timeLimitMinutes).toBe(190);
  });

  it('offers the Sub-Professional mock for that track', () => {
    const catalogue = practiceCatalogue({
      exam,
      trackId: 'subprofessional',
      policy,
      dailyGoal: 10,
      accuracy: [],
    });
    expect(catalogue.more.find((action) => action.id === 'mock-exam')?.meta).toBe(
      '165 items · 2h 40m',
    );
  });

  it('drops the modes an exam says it does not support', () => {
    const narrow = {
      ...policy,
      supportsBuildAQuiz: false,
      supportsMasteryRounds: false,
      supportsTimedPractice: false,
    };
    const catalogue = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy: narrow,
      dailyGoal: 10,
      accuracy: [],
    });
    expect(catalogue.targeted).toEqual([]);
    expect(catalogue.more.map((action) => action.id)).not.toContain('build-a-quiz');
    expect(catalogue.more.map((action) => action.id)).not.toContain('mastery-rounds');
  });

  it('gives every action a request the quiz route could carry', () => {
    const catalogue = practiceCatalogue({
      exam,
      trackId: TRACK,
      policy,
      dailyGoal: 10,
      accuracy: judgeable,
    });
    for (const action of allActions(catalogue)) {
      expect(action.count).toBeGreaterThan(0);
      expect(action.meta.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
    }
  });
});

describe('answer feedback', () => {
  const question: Question = {
    id: 'q-1',
    examId: 'cse',
    trackIds: ['professional'],
    subjectId: 'verbal-ability',
    conceptIds: ['vocabulary'],
    difficulty: 'standard',
    stem: 'Plentiful means…',
    choices: [
      { id: 'a', text: 'available in large amounts' },
      { id: 'b', text: 'scarce' },
    ],
    correctChoiceId: 'a',
    explanation: 'Plentiful means available in large amounts.',
    simplifiedExplanation: 'Think of a plentiful harvest.',
    status: 'published',
    contentVersion: '1.0.0',
  };

  it('checks the chosen choice against the question itself', () => {
    expect(isCorrectChoice(question, 'a')).toBe(true);
    expect(isCorrectChoice(question, 'b')).toBe(false);
    expect(isCorrectChoice(question, 'not-a-choice')).toBe(false);
  });

  it('names a move up, a slip back, and stays silent when nothing changed', () => {
    expect(describeMasteryChange('Vocabulary', 'Developing', 'Strong')).toBe(
      'Vocabulary is now Strong.',
    );
    expect(describeMasteryChange('Vocabulary', 'Strong', 'Learning')).toBe(
      'Vocabulary slipped back to Learning.',
    );
    expect(describeMasteryChange('Vocabulary', 'Strong', 'Strong')).toBe('');
  });

  it('affirms a correct answer without over-explaining it', () => {
    const outcome = answerOutcome({
      question,
      chosenChoiceId: 'a',
      conceptName: 'Vocabulary',
      masteryBefore: 'Developing',
      masteryAfter: 'Strong',
      queuedForReview: false,
      isLastQuestion: false,
    });
    expect(outcome.correct).toBe(true);
    expect(outcome.headline).toBe(CORRECT_HEADLINE);
    expect(outcome.simplifiedExplanation).toBeNull();
    expect(outcome.masteryLine).toBe('Vocabulary is now Strong.');
    expect(outcome.reviewLine).toBeNull();
    expect(outcome.nextLabel).toBe(NEXT_LABEL);
  });

  it('explains a miss plainly and says where it went', () => {
    const outcome = answerOutcome({
      question,
      chosenChoiceId: 'b',
      conceptName: 'Vocabulary',
      masteryBefore: 'Strong',
      masteryAfter: 'Strong',
      queuedForReview: true,
      isLastQuestion: true,
    });
    expect(outcome.correct).toBe(false);
    expect(outcome.headline).toBe(WRONG_HEADLINE);
    expect(outcome.simplifiedExplanation).toBe(question.simplifiedExplanation);
    expect(outcome.reviewLine).toBe(ADDED_TO_REVIEW_LINE);
    expect(outcome.masteryLine).toBe('');
    expect(outcome.nextLabel).toBe(RESULTS_LABEL);
  });

  it('describes the running score and the end of a session', () => {
    expect(describeScore(3, 7)).toBe('3 of 7 correct');
    expect(describeSessionSummary(5, 10)).toMatch(/5 of 10 correct/);
    expect(describeSessionSummary(10, 10)).toMatch(/clean sheet/);
    expect(describeSessionSummary(0, 0)).toBe('Nothing to mark yet.');
  });
});

describe('planned task mapping', () => {
  it('credits the task kind a session answers for', () => {
    expect(taskKindForMode('smart-drill')).toBe('practice');
    expect(taskKindForMode('timed-practice')).toBe('practice');
    expect(taskKindForMode('review-due')).toBe('review');
    expect(taskKindForMode('mock-exam')).toBe('mock');
  });
});
