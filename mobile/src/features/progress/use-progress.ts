import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import { loadProgressOverview, type ProgressOverview } from '@/services/progress';

/**
 * Progress model.
 *
 * The tab asks how the learner is doing and answers from committed state, so it
 * reloads whenever it regains focus: answering one question moves the score, the
 * week's bars and the mastery of a concept, and a screen that showed yesterday's
 * numbers would be worse than no screen at all. Nothing is held between loads.
 */

export type ProgressStatus = 'loading' | 'ready' | 'error';

export const PROGRESS_EYEBROW = 'Progress';
export const PROGRESS_TITLE = 'How it is going.';

export interface ProgressModel {
  readonly status: ProgressStatus;
  readonly error: AppError | null;
  readonly eyebrow: string;
  readonly title: string;
  readonly overview: ProgressOverview | null;
  readonly reload: () => void;
}

/**
 * `now` is injected rather than defaulted in the body: the score's windows, the week
 * and the journey all read the clock, and a freshly constructed `Date` on every render
 * would make the loader a new function each time and reload the screen in a loop.
 */
export const useProgress = (repositories: Repositories, now?: Date): ProgressModel => {
  const [status, setStatus] = useState<ProgressStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);

  const load = useCallback(async () => {
    try {
      const clock = now ?? new Date();
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }

      setOverview(
        await loadProgressOverview({
          repositories,
          exam,
          trackId: profile?.trackId ?? exam.defaultTrackId,
          examDate: profile?.examDate ?? null,
          dailyGoal: profile?.dailyGoal ?? 0,
          studyDays: profile?.studyDays ?? [],
          now: clock,
        }),
      );

      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load Progress.'));
      setStatus('error');
    }
  }, [now, repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    status,
    error,
    eyebrow: PROGRESS_EYEBROW,
    title: PROGRESS_TITLE,
    overview,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
