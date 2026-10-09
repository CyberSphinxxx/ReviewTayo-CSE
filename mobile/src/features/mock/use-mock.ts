import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import type { MockResult } from '@/domain/mock';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import {
  loadMockSession,
  loadMockSetup,
  startMock,
  submitMock,
  type MockSessionState,
  type MockSetup,
} from '@/services/mock';

/**
 * Mock exam model.
 *
 * One screen with three faces, decided by what is actually stored: a setup screen when
 * there is no paper, the paper itself when there is one, and the result once it has been
 * submitted. A paper whose clock ran out while the app was closed is submitted on the way
 * in rather than resumed: the learner cannot be given back minutes the examination has
 * already taken, and the attempt that produced is still theirs to see.
 */

export type MockStatus = 'loading' | 'setup' | 'running' | 'result' | 'error';

export const MOCK_EYEBROW = 'Mock Exam';
export const MOCK_SETUP_TITLE = 'Simulation';
export const MOCK_RUNNING_TITLE = 'Examination';
export const MOCK_RESULT_TITLE = 'Result';

export interface MockModel {
  readonly status: MockStatus;
  readonly error: AppError | null;
  readonly eyebrow: string;
  readonly title: string;
  readonly exam: ExamRuleConfig | null;
  /** The learner's own daily goal, so a submitted paper counts towards the day. */
  readonly dailyGoal: number;
  readonly setup: MockSetup | null;
  readonly session: MockSessionState | null;
  readonly result: MockResult | null;
  readonly starting: boolean;
  /** Called by the setup screen; starts a paper and moves to it. */
  readonly start: () => void;
  /** Called by the runner when the paper has been submitted. */
  readonly completed: (result: MockResult) => void;
  readonly reload: () => void;
}

interface LoadedMock {
  readonly exam: ExamRuleConfig;
  readonly trackId: string;
  readonly dailyGoal: number;
}

export const useMock = (repositories: Repositories, now?: Date): MockModel => {
  const [status, setStatus] = useState<MockStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [setup, setSetup] = useState<MockSetup | null>(null);
  const [session, setSession] = useState<MockSessionState | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [loaded, setLoaded] = useState<LoadedMock | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const clock = now ?? new Date();
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }

      const trackId = profile?.trackId ?? exam.defaultTrackId;
      const dailyGoal = profile?.dailyGoal ?? 0;
      setLoaded({ exam, trackId, dailyGoal });

      const open = await loadMockSession({ repositories, exam, now: clock });
      if (open === null) {
        setSetup(await loadMockSetup({ repositories, exam, trackId }));
        setSession(null);
        setResult(null);
        setError(null);
        setStatus('setup');
        return;
      }

      if (open.expired) {
        const submitted = await submitMock({
          repositories,
          exam,
          sessionId: open.session.id,
          dailyGoal,
          expired: true,
          now: clock,
        });
        setResult(submitted);
        setSession(null);
        setError(null);
        setStatus('result');
        return;
      }

      setSession(open);
      setResult(null);
      setError(null);
      setStatus('running');
    } catch (cause) {
      setError(toAppError(cause, 'Could not open the mock exam.'));
      setStatus('error');
    }
  }, [now, repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const start = useCallback(async () => {
    if (loaded === null) return;
    setStarting(true);
    try {
      const started = await startMock({
        repositories,
        exam: loaded.exam,
        trackId: loaded.trackId,
      });
      setSession(started);
      setResult(null);
      setSetup(null);
      setStatus('running');
    } catch (cause) {
      setError(toAppError(cause, 'Could not start the mock exam.'));
      setStatus('error');
    } finally {
      setStarting(false);
    }
  }, [loaded, repositories]);

  const completed = useCallback((submitted: MockResult) => {
    setResult(submitted);
    setSession(null);
    setStatus('result');
  }, []);

  return {
    status,
    error,
    eyebrow: MOCK_EYEBROW,
    exam: loaded?.exam ?? null,
    dailyGoal: loaded?.dailyGoal ?? 0,
    title:
      status === 'running'
        ? MOCK_RUNNING_TITLE
        : status === 'result'
          ? MOCK_RESULT_TITLE
          : MOCK_SETUP_TITLE,
    setup,
    session,
    result,
    starting,
    start: () => {
      void start();
    },
    completed,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
