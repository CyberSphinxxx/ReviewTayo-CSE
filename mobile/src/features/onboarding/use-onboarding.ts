import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import {
  firstActivityFor,
  isLastStep,
  MAX_DAILY_GOAL,
  MIN_DAILY_GOAL,
  nextStep,
  previousStep,
  stepIndex,
  stepIssue,
  toggleStudyDay,
  withAccount,
  withDailyGoal,
  withExamDate,
  withReminders,
  withSessionLength,
  withStartingPoint,
  withTrack,
  type AccountChoice,
  type FirstActivity,
  type OnboardingDraft,
  type OnboardingStepId,
  type SessionLength,
  type StartingPoint,
} from '@/domain/onboarding';
import type { ExamRuleConfig } from '@/domain/exams/types';
import type { TextSizePreference, ThemePreference } from '@/domain/preferences';
import { AppError, toAppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import {
  createExpoNotificationScheduler,
  syncStudyReminders,
  type NotificationScheduler,
} from '@/services/notifications';
import { commitOnboarding, loadOnboardingContext } from '@/services/onboarding';
import { useAppearance, type AppearanceState } from '@/store/AppearanceProvider';

/**
 * Onboarding state machine.
 *
 * Holds the ephemeral draft, loads stored answers to prefill it, and commits once
 * at completion. Navigation is left to the screen through `onCommitted`, so this
 * hook contains no router and its behaviour can be exercised through the model.
 */

export type OnboardingPhase = 'loading' | 'ready' | 'saving' | 'error';

export interface UseOnboardingOptions {
  /** Never null: the screen mounts this hook only once local data is ready. */
  readonly repositories: Repositories;
  /** Called after a successful commit; the screen decides where to go. */
  readonly onCommitted?: (startPractice: boolean) => void;
  readonly initialStep?: OnboardingStepId;
  /** Test seam; defaults to the device's own notification scheduler. */
  readonly scheduler?: NotificationScheduler;
}

export interface CustomGoalState {
  readonly open: boolean;
  readonly text: string;
}

export interface OnboardingModel {
  readonly phase: OnboardingPhase;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly draft: OnboardingDraft | null;
  readonly step: OnboardingStepId;
  /** 1-based step number for "Step N of 8". */
  readonly stepNumber: number;
  readonly customGoal: CustomGoalState;
  /** Non-null when the current step cannot be left yet. */
  readonly issue: string | null;
  readonly firstActivity: FirstActivity | null;
  readonly isLastStep: boolean;
  readonly selectAccount: (account: AccountChoice) => void;
  readonly selectTrack: (trackId: string) => void;
  readonly selectStartingPoint: (startingPoint: StartingPoint) => void;
  readonly setExamDate: (value: string) => void;
  readonly toggleDay: (weekday: number) => void;
  readonly selectSessionLength: (sessionLength: SessionLength) => void;
  readonly selectGoal: (dailyGoal: number) => void;
  readonly openCustomGoal: () => void;
  readonly setCustomGoal: (text: string) => void;
  readonly selectTheme: (preference: ThemePreference) => void;
  readonly selectTextSize: (textSize: TextSizePreference) => void;
  readonly setReminders: (enabled: boolean) => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly skip: () => void;
  readonly adjustPlan: () => void;
  readonly commit: (startPractice: boolean) => void;
  readonly retry: () => void;
}

const parseGoal = (text: string): number | null => {
  if (text.trim().length === 0) return null;
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : null;
};

export const useOnboarding = ({
  repositories,
  onCommitted,
  initialStep,
  scheduler,
}: UseOnboardingOptions): OnboardingModel => {
  const appearance = useAppearance();
  const [phase, setPhase] = useState<OnboardingPhase>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [step, setStep] = useState<OnboardingStepId>(initialStep ?? 'account');
  const [customGoal, setCustomGoal] = useState<CustomGoalState>({ open: false, text: '' });

  const committedRef = useRef(false);
  const initialAppearance = useRef<AppearanceState>({
    themePreference: appearance.themePreference,
    textSize: appearance.textSize,
  });
  const applyAppearance = appearance.applyAppearance;

  const load = useCallback(async () => {
    // The initial phase is already `loading`, and every state update here happens
    // after an await, so mounting the screen never sets state synchronously from
    // inside the effect below.
    try {
      const profile = await repositories.profile.get();
      const resolved = activeExam(profile?.examId);
      if (resolved === null) {
        throw new AppError('unsupported', 'No exam content is available yet.');
      }
      const context = await loadOnboardingContext(repositories, resolved);
      setExam(resolved);
      setDraft(context.draft);
      setError(null);
      setPhase('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load your plan.'));
      setPhase('error');
    }
  }, [repositories]);

  useEffect(() => {
    let cancelled = false;
    // Deferred to a microtask: the first render paints before the load starts, and
    // the effect body itself never sets state synchronously. A microtask (rather
    // than a timer) also resolves under test fake timers without extra clock work.
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // A theme/text-size preview stays a draft: leaving the flow without finishing
  // puts the learner's committed appearance back.
  useEffect(
    () => () => {
      if (!committedRef.current) applyAppearance(initialAppearance.current);
    },
    [applyAppearance],
  );

  const updateDraft = useCallback((updater: (current: OnboardingDraft) => OnboardingDraft) => {
    setDraft((current) => (current === null ? current : updater(current)));
  }, []);

  const selectAccount = useCallback(
    (account: AccountChoice) => updateDraft((current) => withAccount(current, account)),
    [updateDraft],
  );

  const selectTrack = useCallback(
    (trackId: string) => updateDraft((current) => withTrack(current, trackId)),
    [updateDraft],
  );

  const selectStartingPoint = useCallback(
    (startingPoint: StartingPoint) =>
      updateDraft((current) => withStartingPoint(current, startingPoint)),
    [updateDraft],
  );

  const setExamDate = useCallback(
    (value: string) => updateDraft((current) => withExamDate(current, value)),
    [updateDraft],
  );

  const toggleDay = useCallback(
    (weekday: number) => updateDraft((current) => toggleStudyDay(current, weekday)),
    [updateDraft],
  );

  const selectSessionLength = useCallback(
    (sessionLength: SessionLength) =>
      updateDraft((current) => withSessionLength(current, sessionLength)),
    [updateDraft],
  );

  const selectGoal = useCallback(
    (dailyGoal: number) => {
      setCustomGoal({ open: false, text: '' });
      updateDraft((current) => withDailyGoal(current, dailyGoal));
    },
    [updateDraft],
  );

  const openCustomGoal = useCallback(() => {
    setCustomGoal((current) => ({ ...current, open: true }));
  }, []);

  const changeCustomGoal = useCallback(
    (text: string) => {
      const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
      setCustomGoal({ open: true, text: digits });
      const value = parseGoal(digits);
      if (value !== null && value >= MIN_DAILY_GOAL && value <= MAX_DAILY_GOAL) {
        updateDraft((current) => withDailyGoal(current, value));
      }
    },
    [updateDraft],
  );

  const selectTheme = useCallback(
    (themePreference: ThemePreference) => {
      applyAppearance({ themePreference, textSize: appearance.textSize });
      updateDraft((current) => ({ ...current, themePreference }));
    },
    [appearance.textSize, applyAppearance, updateDraft],
  );

  const selectTextSize = useCallback(
    (textSize: TextSizePreference) => {
      applyAppearance({ themePreference: appearance.themePreference, textSize });
      updateDraft((current) => ({ ...current, textSize }));
    },
    [appearance.themePreference, applyAppearance, updateDraft],
  );

  const setReminders = useCallback(
    (enabled: boolean) => updateDraft((current) => withReminders(current, enabled)),
    [updateDraft],
  );

  const customGoalIssue = useMemo(() => {
    if (!customGoal.open || customGoal.text.trim().length === 0) return null;
    const value = parseGoal(customGoal.text);
    if (value === null || value < MIN_DAILY_GOAL || value > MAX_DAILY_GOAL) {
      return `Enter a number between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL}.`;
    }
    return null;
  }, [customGoal]);

  const issue = useMemo(() => {
    if (draft === null) return null;
    return customGoalIssue ?? stepIssue(draft, step);
  }, [customGoalIssue, draft, step]);

  const next = useCallback(() => {
    if (issue !== null || draft === null || isLastStep(step)) return;
    setStep(nextStep(step));
  }, [draft, issue, step]);

  const back = useCallback(() => setStep(previousStep(step)), [step]);

  const skip = useCallback(() => setStep(nextStep(step)), [step]);

  const adjustPlan = useCallback(() => setStep('level'), []);

  const commit = useCallback(
    (startPractice: boolean) => {
      if (exam === null || draft === null || issue !== null) return;
      setPhase('saving');
      setError(null);
      void (async () => {
        try {
          await commitOnboarding(repositories, { exam, draft });
          committedRef.current = true;
          applyAppearance({
            themePreference: draft.themePreference,
            textSize: draft.textSize,
          });
          // The plan just changed: reminders follow it in the same breath. Turning
          // reminders on during onboarding is the point of value, so that is when
          // permission is asked for — and the commit never fails because a
          // notification could not be scheduled.
          await syncStudyReminders({
            repositories,
            scheduler: scheduler ?? createExpoNotificationScheduler(),
            requestPermission: draft.remindersEnabled,
          });
          onCommitted?.(startPractice);
        } catch (cause) {
          setError(toAppError(cause, 'Could not save your plan.'));
          setPhase('error');
        }
      })();
    },
    [applyAppearance, draft, exam, issue, onCommitted, repositories, scheduler],
  );

  const retry = useCallback(() => {
    setError(null);
    if (draft !== null && exam !== null) {
      // A failed commit: keep the draft and let the learner press Continue again.
      setPhase('ready');
      return;
    }
    setPhase('loading');
    void load();
  }, [draft, exam, load]);

  const firstActivity = useMemo(
    () => (draft === null || exam === null ? null : firstActivityFor(draft, exam)),
    [draft, exam],
  );

  return {
    phase,
    error,
    exam,
    draft,
    step,
    stepNumber: stepIndex(step) + 1,
    customGoal,
    issue,
    firstActivity,
    isLastStep: isLastStep(step),
    selectAccount,
    selectTrack,
    selectStartingPoint,
    setExamDate,
    toggleDay,
    selectSessionLength,
    selectGoal,
    openCustomGoal,
    setCustomGoal: changeCustomGoal,
    selectTheme,
    selectTextSize,
    setReminders,
    next,
    back,
    skip,
    adjustPlan,
    commit,
    retry,
  };
};
