import { useCallback, useEffect, useState } from 'react';

import type { MockItemRecord, Repositories } from '@/data/repositories';
import type { ExamRuleConfig, Question } from '@/domain/exams/types';
import {
  MOCK_LOW_TIME_SECONDS,
  describeMockProgress,
  flaggedCount,
  remainingSeconds,
  type MockClock,
  type MockResult,
} from '@/domain/mock';
import { toAppError } from '@/domain/result';
import { answerMockItem, flagMockItem, pauseMock, resumeMock, submitMock } from '@/services/mock';
import type { MockSessionState } from '@/services/mock';

/**
 * The running paper.
 *
 * The runner owns exactly four things: which question is on screen, what the learner has
 * marked, how much time is left, and when the paper ends. The clock is derived from the
 * session's own stored deadline on every tick rather than counted down, so throttled
 * timers, backgrounding and mid-paper pauses cannot make the examination longer than the
 * exam says it is (D-038), and the paper is submitted the moment the clock reaches zero.
 *
 * Nothing here reveals whether an answer was right: a mock exam is the one place in the
 * app where the learner does not get told until the end.
 */

export interface MockRunnerModel {
  readonly items: readonly MockItemRecord[];
  readonly paper: readonly Question[];
  readonly index: number;
  readonly current: Question | null;
  readonly currentItem: MockItemRecord | null;
  readonly total: number;
  readonly answered: number;
  readonly flagged: number;
  readonly remaining: number;
  readonly isLowOnTime: boolean;
  readonly isPaused: boolean;
  readonly gridOpen: boolean;
  readonly submitting: boolean;
  readonly notice: string | null;
  readonly progressLine: string;
  readonly choose: (choiceId: string) => void;
  readonly goTo: (index: number) => void;
  readonly next: () => void;
  readonly previous: () => void;
  readonly toggleFlag: () => void;
  readonly toggleGrid: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly submit: () => void;
  readonly retrySubmit: () => void;
}

export interface UseMockRunnerInput {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly session: MockSessionState;
  readonly dailyGoal: number;
  readonly onSubmitted: (result: MockResult) => void;
}

export const useMockRunner = ({
  repositories,
  exam,
  session,
  dailyGoal,
  onSubmitted,
}: UseMockRunnerInput): MockRunnerModel => {
  const sessionId = session.session.id;
  const [items, setItems] = useState<readonly MockItemRecord[]>(session.items);
  const [paper] = useState<readonly Question[]>(session.paper);
  const [index, setIndex] = useState(session.index);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [clock, setClock] = useState<MockClock>({
    expiresAt: session.session.expiresAt,
    pausedAt: session.session.pausedAt,
    remainingSeconds: session.session.remainingSeconds,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const remaining = remainingSeconds(clock, new Date(nowMs));
  const isPaused = clock.pausedAt !== null;

  const submitPaper = useCallback(
    async (expired: boolean) => {
      setSubmitting(true);
      setNotice(null);
      try {
        const result = await submitMock({
          repositories,
          exam,
          sessionId,
          dailyGoal,
          expired,
          now: new Date(),
        });
        onSubmitted(result);
      } catch (cause) {
        setNotice(toAppError(cause, 'Could not submit the paper.').message);
      }
    },
    [dailyGoal, exam, onSubmitted, repositories, sessionId],
  );

  // The clock is re-read from the session's own deadline every second, and the moment it
  // reaches zero the paper is submitted with what was answered: there is no way to buy back
  // time, so there is nothing to ask the learner about first.
  useEffect(() => {
    if (clock.pausedAt !== null) return;
    const tick = (): void => {
      setNowMs(Date.now());
      if (!submitting && remainingSeconds(clock, new Date()) <= 0) {
        void submitPaper(true);
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clock, submitting, submitPaper]);

  const submit = useCallback(() => {
    if (submitting) return;
    void submitPaper(false);
  }, [submitPaper, submitting]);

  const persist = useCallback(
    async (
      questionId: string,
      patch: { readonly chosenChoiceId?: string; readonly flagged?: boolean },
    ) => {
      setNotice(null);
      try {
        if (patch.chosenChoiceId !== undefined) {
          const question = paper.find((entry) => entry.id === questionId);
          if (question === undefined) return;
          await answerMockItem({
            repositories,
            sessionId,
            question,
            chosenChoiceId: patch.chosenChoiceId,
          });
        }
        if (patch.flagged !== undefined) {
          await flagMockItem({ repositories, sessionId, questionId, flagged: patch.flagged });
        }
      } catch (cause) {
        setNotice(toAppError(cause, 'Could not save that.').message);
      }
    },
    [paper, repositories, sessionId],
  );

  const choose = useCallback(
    (choiceId: string) => {
      const item = items[index];
      if (item === undefined || submitting) return;
      // The paper shows the choice immediately; the write follows.
      setItems((current) =>
        current.map((entry) =>
          entry.questionId === item.questionId ? { ...entry, chosenChoiceId: choiceId } : entry,
        ),
      );
      void persist(item.questionId, { chosenChoiceId: choiceId });
    },
    [index, items, persist, submitting],
  );

  const toggleFlag = useCallback(() => {
    const item = items[index];
    if (item === undefined) return;
    const flagged = !item.flagged;
    setItems((current) =>
      current.map((entry) =>
        entry.questionId === item.questionId ? { ...entry, flagged } : entry,
      ),
    );
    void persist(item.questionId, { flagged });
  }, [index, items, persist]);

  const goTo = useCallback(
    (target: number) => {
      setIndex(Math.max(0, Math.min(target, Math.max(0, paper.length - 1))));
      setGridOpen(false);
    },
    [paper.length],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  const pause = useCallback(() => {
    setClock((current) => ({
      ...current,
      pausedAt: new Date().toISOString(),
      remainingSeconds: remainingSeconds(current, new Date(nowMs)),
    }));
    void pauseMock({ repositories, sessionId }).catch((cause: unknown) => {
      setNotice(toAppError(cause, 'Could not pause the paper.').message);
    });
  }, [nowMs, repositories, sessionId]);

  const resume = useCallback(() => {
    setClock((current) => ({
      expiresAt: new Date(
        Date.now() + Math.max(0, current.remainingSeconds ?? 0) * 1000,
      ).toISOString(),
      pausedAt: null,
      remainingSeconds: null,
    }));
    void resumeMock({ repositories, sessionId }).catch((cause: unknown) => {
      setNotice(toAppError(cause, 'Could not resume the paper.').message);
    });
  }, [repositories, sessionId]);

  const answered = items.filter((item) => item.chosenChoiceId !== null).length;

  return {
    items,
    paper,
    index,
    current: paper[index] ?? null,
    currentItem: items[index] ?? null,
    total: items.length,
    answered,
    flagged: flaggedCount(items),
    remaining,
    isLowOnTime: remaining <= MOCK_LOW_TIME_SECONDS,
    isPaused,
    gridOpen,
    submitting,
    notice,
    progressLine: describeMockProgress(items),
    choose,
    goTo,
    next,
    previous,
    toggleFlag,
    toggleGrid: () => setGridOpen((open) => !open),
    pause,
    resume,
    submit,
    retrySubmit: () => {
      void submitPaper(true);
    },
  };
};
