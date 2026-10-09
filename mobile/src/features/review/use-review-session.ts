import { useCallback, useEffect, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  describeDeckCompletion,
  type DeckCompletion,
  type ReviewCard,
  type ReviewOutcome,
} from '@/domain/review';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import { gradeReviewItem, loadReviewQueue } from '@/services/review';

/**
 * Review deck model.
 *
 * One card at a time, and every card is graded exactly once. Saying "Again" is a
 * statement about the learner, not a command to ask the card again in a minute: the
 * schedule already knows when to bring it back, so repeating it here would record two
 * lapses for one honest look at it. The deck therefore shrinks by one with either
 * answer, and the difference between the two lives in the schedule the learner does
 * not have to think about.
 */

export type ReviewSessionStatus = 'loading' | 'ready' | 'error' | 'finished';

export interface ReviewSessionModel {
  readonly status: ReviewSessionStatus;
  readonly error: AppError | null;
  /** A write that failed while the learner kept going; the card stays put. */
  readonly notice: AppError | null;
  readonly total: number;
  readonly graded: number;
  /** Cards still to grade. */
  readonly remaining: number;
  /** `3 of 12`, for the header. */
  readonly progressLabel: string;
  readonly current: ReviewCard | null;
  readonly revealed: boolean;
  readonly reveal: () => void;
  readonly again: () => void;
  readonly gotIt: () => void;
  /** Set once the deck is empty. */
  readonly completion: DeckCompletion | null;
  readonly reload: () => void;
}

/**
 * The state of a deck opened when nothing was due — reachable from a keep-alive deep
 * link, and worth saying plainly rather than claiming a session just happened.
 */
const NOTHING_DUE: DeckCompletion = {
  title: 'Review cleared.',
  description: 'Nothing was due.',
};

export const useReviewSession = (repositories: Repositories): ReviewSessionModel => {
  const [status, setStatus] = useState<ReviewSessionStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [notice, setNotice] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [queue, setQueue] = useState<readonly ReviewCard[]>([]);
  const [total, setTotal] = useState(0);
  const [graded, setGraded] = useState(0);
  /** Cards said "Again" to, which is what the completion copy reports back. */
  const [againCount, setAgainCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  /** Due items this deck could not cover, because the exam caps one day of review. */
  const [leftover, setLeftover] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profile = await repositories.profile.get();
        const resolved = activeExam(profile?.examId);
        if (resolved === null) {
          throw new Error('No exam content is available yet.');
        }
        const queueState = await loadReviewQueue({ repositories, exam: resolved });
        if (cancelled) return;

        setExam(resolved);
        setQueue(queueState.deck.cards);
        setTotal(queueState.deck.count);
        setGraded(0);
        setAgainCount(0);
        setRevealed(false);
        setLeftover(Math.max(0, queueState.dueCount - queueState.deck.count));
        setError(null);
        setStatus(queueState.deck.count === 0 ? 'finished' : 'ready');
      } catch (cause) {
        if (cancelled) return;
        setError(toAppError(cause, 'Could not open your review.'));
        setStatus('error');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt, repositories]);

  const current = queue[0] ?? null;

  const grade = useCallback(
    async (outcome: ReviewOutcome) => {
      const card = queue[0];
      if (card === undefined || exam === null) return;
      try {
        await gradeReviewItem({
          repositories,
          exam,
          itemId: card.itemId,
          outcome,
        });
        const remaining = queue.filter((entry) => entry.itemId !== card.itemId);
        setNotice(null);
        setRevealed(false);
        setQueue(remaining);
        setGraded((value) => value + 1);
        if (outcome === 'again') setAgainCount((value) => value + 1);
        // The last card is what ends a deck; the write happens first, so a session that
        // finished still rescheduled everything it graded.
        if (remaining.length === 0) setStatus('finished');
      } catch (cause) {
        setNotice(toAppError(cause, 'That review could not be saved.'));
      }
    },
    [exam, queue, repositories],
  );

  const reload = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  return {
    status,
    error,
    notice,
    total,
    graded,
    remaining: queue.length,
    progressLabel: total <= 0 ? '' : `${Math.min(graded + 1, total)} of ${total}`,
    current,
    revealed,
    reveal: () => setRevealed(true),
    again: () => {
      void grade('again');
    },
    gotIt: () => {
      void grade('got-it');
    },
    completion:
      status === 'finished'
        ? total === 0
          ? NOTHING_DUE
          : describeDeckCompletion({ again: againCount, leftover })
        : null,
    reload,
  };
};
