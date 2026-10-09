import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { describeHistoryLine } from '@/domain/review';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import { loadReviewOverview, type ReviewOverview } from '@/services/review';

/**
 * Review tab model.
 *
 * The tab answers one question — is there anything to do — and then gets out of the
 * way: a count, what it costs, and the four lists that explain where the learner
 * stands. It reloads on focus, because finishing a deck on the session route changes
 * every number here, and nothing on this screen is cached.
 */

export type ReviewStatus = 'loading' | 'ready' | 'error';

export const REVIEW_EYEBROW = 'Review';
export const REVIEW_TITLE = 'Review due today';
export const CAUGHT_UP_TITLE = "You're caught up.";
export const CAUGHT_UP_DESCRIPTION =
  'Nothing is due right now. Items appear here as your practice schedules them.';

export interface ReviewModel {
  readonly status: ReviewStatus;
  readonly error: AppError | null;
  readonly eyebrow: string;
  readonly title: string;
  readonly overview: ReviewOverview | null;
  /** True when nothing is due; the screen shows the caught-up state instead. */
  readonly caughtUp: boolean;
  /** `12 concepts this week`, or that nothing has been reviewed yet. */
  readonly historyLine: string;
  readonly reload: () => void;
}

interface LoadedReview {
  readonly overview: ReviewOverview;
  readonly historyLine: string;
}

export const useReview = (repositories: Repositories): ReviewModel => {
  const [status, setStatus] = useState<ReviewStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [loaded, setLoaded] = useState<LoadedReview | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }

      const overview = await loadReviewOverview({
        repositories,
        exam,
        trackId: profile?.trackId ?? exam.defaultTrackId,
      });

      setLoaded({ overview, historyLine: describeHistoryLine(overview.history.reviewedThisWeek) });
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load Review.'));
      setStatus('error');
    }
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const overview = loaded?.overview ?? null;

  return {
    status,
    error,
    eyebrow: REVIEW_EYEBROW,
    title: REVIEW_TITLE,
    overview,
    caughtUp: overview !== null && overview.dueCount === 0,
    historyLine: loaded?.historyLine ?? describeHistoryLine(0),
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
