import { blueprintTotalItems, formatDuration, getSubject, resolveTiming } from '@/domain/exams';
import type { ExamRuleConfig, StudyPolicy } from '@/domain/exams/types';
import {
  accuracyOf,
  describeAccuracyPercent,
  smartDrillSpec,
  type SubjectAccuracy,
} from '@/domain/sessions';

import { weakestSubject } from './drill';
import type { PracticeAction, PracticeCatalogue } from './types';

/**
 * Practice catalogue.
 *
 * The approved prototype's Practice tab, expressed as data: one dominant Smart Drill,
 * two targeted actions, and everything else behind a single disclosure. Each action
 * carries its own request, so the screen never decides how a mode works — and a mode
 * that cannot honestly be offered (a weakest area for a learner with no history) is
 * simply absent rather than shown and then apologised for.
 */

export const SMART_DRILL_DESCRIPTION = 'Personalized from your recent practice';
export const RANDOM_SET_DESCRIPTION = 'Any subject, any difficulty';
export const BUILD_A_QUIZ_DESCRIPTION = 'Choose your own subjects and length';
export const MASTERY_ROUNDS_DESCRIPTION = 'Concepts you have not mastered yet';
export const PRACTICE_BY_SUBJECT_DESCRIPTION = 'One subject at a time';
export const TIMED_PRACTICE_DESCRIPTION = 'A clock, and no explanations until the end';
export const WEAKEST_AREA_DESCRIPTION = 'The subject with the most room to improve';

export interface CatalogueInput {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly policy: StudyPolicy;
  readonly dailyGoal: number;
  readonly accuracy: readonly SubjectAccuracy[];
}

export const practiceCatalogue = ({
  exam,
  trackId,
  policy,
  dailyGoal,
  accuracy,
}: CatalogueInput): PracticeCatalogue => {
  const drill = smartDrillSpec(dailyGoal, policy);

  const primary: PracticeAction = {
    id: 'smart-drill',
    mode: 'smart-drill',
    title: 'Smart Drill',
    meta: drill.meta,
    description: SMART_DRILL_DESCRIPTION,
    count: drill.count,
  };

  const weakest = weakestSubject(exam, trackId, accuracy, policy);
  const weakestName = weakest === null ? null : (getSubject(exam, weakest.subjectId)?.name ?? null);
  const targeted: PracticeAction[] = [];

  if (weakest !== null && weakestName !== null) {
    targeted.push({
      id: 'weakest-area',
      mode: 'weakest-area',
      title: 'Weakest Area',
      meta: `${weakestName} · ${describeAccuracyPercent(accuracyOf(weakest))}`,
      description: WEAKEST_AREA_DESCRIPTION,
      count: Math.max(1, policy.drillSize),
      subjectIds: [weakest.subjectId],
    });
  }

  if (policy.supportsTimedPractice) {
    targeted.push({
      id: 'timed-practice',
      mode: 'timed-practice',
      title: 'Timed Practice',
      meta: `${policy.timedPracticeQuestionCount} questions · ${formatDuration(
        policy.timedPracticeMinutes,
      )}`,
      description: TIMED_PRACTICE_DESCRIPTION,
      count: Math.max(1, policy.timedPracticeQuestionCount),
      timeLimitMinutes: Math.max(1, policy.timedPracticeMinutes),
    });
  }

  const timing = resolveTiming(exam, trackId);
  const more: PracticeAction[] = [];

  if (policy.supportsSmartDrill) {
    more.push({
      id: 'random-set',
      mode: 'random-set',
      title: 'Random Set',
      meta: `${Math.max(1, policy.drillSize)} questions`,
      description: RANDOM_SET_DESCRIPTION,
      count: Math.max(1, policy.drillSize),
    });
  }

  if (policy.supportsBuildAQuiz) {
    more.push({
      id: 'build-a-quiz',
      mode: 'build-a-quiz',
      title: 'Build a Quiz',
      meta: 'Your choice',
      description: BUILD_A_QUIZ_DESCRIPTION,
      count: Math.max(1, policy.drillSize),
    });
  }

  if (policy.supportsMasteryRounds) {
    more.push({
      id: 'mastery-rounds',
      mode: 'mastery-rounds',
      title: 'Mastery Rounds',
      meta: `${Math.max(1, policy.drillSize)} questions`,
      description: MASTERY_ROUNDS_DESCRIPTION,
      count: Math.max(1, policy.drillSize),
    });
  }

  more.push({
    id: 'practice-by-subject',
    mode: 'practice-by-subject',
    title: 'Practice by Subject',
    meta: 'Pick one',
    description: PRACTICE_BY_SUBJECT_DESCRIPTION,
    count: Math.max(1, policy.drillSize),
  });

  more.push({
    id: 'mock-exam',
    mode: 'mock-exam',
    title: 'Mock Exam',
    meta: `${blueprintTotalItems(exam, trackId)} items · ${formatDuration(timing.totalMinutes)}`,
    description: 'Timed, weighted the way the real exam is',
    count: blueprintTotalItems(exam, trackId),
    timeLimitMinutes: Math.max(1, timing.totalMinutes),
  });

  return { primary, targeted, more };
};

/** Every action the catalogue offers, in presentation order. */
export const allActions = (catalogue: PracticeCatalogue): readonly PracticeAction[] => [
  catalogue.primary,
  ...catalogue.targeted,
  ...catalogue.more,
];

/** Looks an action up by the mode the quiz route was opened with. */
export const actionForMode = (catalogue: PracticeCatalogue, mode: string): PracticeAction | null =>
  allActions(catalogue).find((action) => action.mode === mode) ?? null;
