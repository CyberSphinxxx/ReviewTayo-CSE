import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { conceptsForTrack } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  drillConceptIds,
  practiceCatalogue,
  unmasteredConceptIds,
  type PracticeAction,
  type PracticeCatalogue,
} from '@/domain/practice';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';

/**
 * Practice model.
 *
 * Practice offers drills; it does not run them. This model decides which modes are
 * honestly available right now (a weakest area needs enough answers to name one), how
 * big each one is, and which concepts a Smart Drill or Mastery Round should cover —
 * then hands the screen a destination per action. Running the session belongs to the
 * quiz route.
 */

export type PracticeStatus = 'loading' | 'ready' | 'error';

export const PRACTICE_EYEBROW = 'Practice';
export const PRACTICE_TITLE = 'Sharpen it up.';

/** Where an action goes, and with what. */
export interface PracticeDestination {
  readonly pathname: '/quiz' | '/mock' | '/build-quiz' | '/subject-practice';
  readonly params?: Readonly<Record<string, string>>;
}

interface CatalogueState {
  readonly exam: ExamRuleConfig;
  readonly catalogue: PracticeCatalogue;
  /** Concepts a Smart Drill should cover, best first. */
  readonly drillConceptIds: readonly string[];
  /** Concepts still to be mastered, for Mastery Rounds. */
  readonly unmasteredConceptIds: readonly string[];
  /** How many concepts the track has, so "all of them" can be read as "no filter". */
  readonly conceptCount: number;
}

export interface PracticeModel {
  readonly status: PracticeStatus;
  readonly error: AppError | null;
  readonly eyebrow: string;
  readonly title: string;
  readonly catalogue: PracticeCatalogue | null;
  /** The learner's own goal, which sizes the primary action. */
  readonly dailyGoal: number;
  readonly destinationFor: (action: PracticeAction) => PracticeDestination;
  readonly reload: () => void;
}

export const usePractice = (repositories: Repositories): PracticeModel => {
  const [status, setStatus] = useState<PracticeStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [state, setState] = useState<CatalogueState | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }

      const trackId = profile?.trackId ?? exam.defaultTrackId;
      const goal = profile?.dailyGoal ?? 0;
      const [accuracy, evidence, dueItems] = await Promise.all([
        repositories.answers.subjectAccuracy(exam.id),
        repositories.mastery.listByExam(exam.id),
        repositories.review.listDue(exam.id, new Date().toISOString()),
      ]);

      setState({
        exam,
        catalogue: practiceCatalogue({
          exam,
          trackId,
          policy: exam.studyPolicy,
          dailyGoal: goal,
          accuracy,
        }),
        drillConceptIds: drillConceptIds(
          {
            exam,
            trackId,
            policy: exam.studyPolicy,
            accuracy,
            evidence,
            dueConceptIds: dueItems.map((item) => item.conceptId),
          },
          Math.max(1, exam.studyPolicy.drillSize * 2),
        ),
        unmasteredConceptIds: unmasteredConceptIds(
          exam,
          trackId,
          evidence,
          exam.studyPolicy.mastery,
        ),
        conceptCount: conceptsForTrack(exam, trackId).length,
      });
      setDailyGoal(goal);
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load Practice.'));
      setStatus('error');
    }
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const destinationFor = useCallback(
    (action: PracticeAction): PracticeDestination => {
      if (action.mode === 'mock-exam') return { pathname: '/mock' };
      if (action.mode === 'build-a-quiz') return { pathname: '/build-quiz' };
      if (action.mode === 'practice-by-subject') return { pathname: '/subject-practice' };

      const params: Record<string, string> = {
        mode: action.mode,
        count: String(action.count),
      };
      if (action.subjectIds !== undefined) params.subjects = action.subjectIds.join(',');
      if (action.timeLimitMinutes !== undefined) params.minutes = String(action.timeLimitMinutes);

      const concepts = state?.drillConceptIds ?? [];
      const unmastered = state?.unmasteredConceptIds ?? [];
      const total = state?.conceptCount ?? 0;
      const limit = Math.max(1, (state?.exam.studyPolicy.drillSize ?? 10) * 2);
      // A filter that names every concept is not a filter: sending it would put the
      // whole syllabus in the URL and read as a narrowing that never happened.
      if (action.mode === 'smart-drill' && concepts.length > 0 && concepts.length < total) {
        params.concepts = concepts.join(',');
      }
      if (action.mode === 'mastery-rounds' && unmastered.length > 0 && unmastered.length < total) {
        params.concepts = unmastered.slice(0, limit).join(',');
      }

      return { pathname: '/quiz', params };
    },
    [state],
  );

  return {
    status,
    error,
    eyebrow: PRACTICE_EYEBROW,
    title: PRACTICE_TITLE,
    catalogue: state?.catalogue ?? null,
    dailyGoal,
    destinationFor,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
