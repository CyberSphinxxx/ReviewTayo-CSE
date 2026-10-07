import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import type {
  AppSettingsRecord,
  Repositories,
  StoredExamRecord,
  UserExamProfileRecord,
} from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import type { OnboardingStepId } from '@/domain/onboarding';
import type { TextSizePreference, ThemePreference } from '@/domain/preferences';
import { toAppError, type AppError } from '@/domain/result';
import {
  deviceTimezone,
  loadAppSettings,
  saveAppSettings,
  type AppSettingsPatch,
} from '@/services/app-settings';
import { activeExam } from '@/services/exams';
import { useAppearance } from '@/store/AppearanceProvider';

/**
 * Settings model.
 *
 * Settings edits committed preferences (see `architecture/FEATURE-BOUNDARIES.md`):
 * appearance and reminders are saved the moment they change, while plan details
 * reopen the onboarding flow in edit mode so there is exactly one place that
 * defines what a valid plan is. Values are re-read on focus, so returning from an
 * edited plan shows the new answers immediately.
 */

export type SettingsStatus = 'loading' | 'ready' | 'error';

export interface SettingsModel {
  readonly status: SettingsStatus;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly profile: UserExamProfileRecord | null;
  readonly settings: AppSettingsRecord | null;
  readonly content: StoredExamRecord | null;
  readonly reload: () => void;
  readonly setTheme: (preference: ThemePreference) => void;
  readonly setTextSize: (textSize: TextSizePreference) => void;
  readonly setReminders: (enabled: boolean) => void;
  readonly openOnboarding: (step?: OnboardingStepId) => void;
}

export const useSettings = (repositories: Repositories): SettingsModel => {
  const appearance = useAppearance();
  const router = useRouter();
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [profile, setProfile] = useState<UserExamProfileRecord | null>(null);
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [content, setContent] = useState<StoredExamRecord | null>(null);

  const load = useCallback(async () => {
    try {
      const storedProfile = await repositories.profile.get();
      const resolved = activeExam(storedProfile?.examId);
      const [storedSettings, storedContent] = await Promise.all([
        loadAppSettings(repositories),
        resolved === null
          ? Promise.resolve<StoredExamRecord | null>(null)
          : repositories.content.getStoredExam(resolved.id),
      ]);
      setExam(resolved);
      setProfile(storedProfile);
      setSettings(storedSettings);
      setContent(storedContent);
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load your settings.'));
      setStatus('error');
    }
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const persist = useCallback(
    (patch: AppSettingsPatch) => {
      void saveAppSettings(repositories, patch)
        .then(setSettings)
        .catch((cause: unknown) => {
          setError(toAppError(cause, 'Could not save your preference.'));
        });
    },
    [repositories],
  );

  const setTheme = useCallback(
    (themePreference: ThemePreference) => {
      appearance.setThemePreference(themePreference);
      persist({ themePreference });
    },
    [appearance, persist],
  );

  const setTextSize = useCallback(
    (textSize: TextSizePreference) => {
      appearance.setTextSize(textSize);
      persist({ textSize });
    },
    [appearance, persist],
  );

  const setReminders = useCallback(
    (remindersEnabled: boolean) => {
      persist(
        remindersEnabled
          ? { remindersEnabled, reminderTimezone: deviceTimezone() }
          : { remindersEnabled },
      );
    },
    [persist],
  );

  const openOnboarding = useCallback(
    (step?: OnboardingStepId) => {
      router.push({
        pathname: '/onboarding',
        params: step === undefined ? { mode: 'edit' } : { mode: 'edit', step },
      });
    },
    [router],
  );

  return {
    status,
    error,
    exam,
    profile,
    settings,
    content,
    reload: () => {
      setStatus('loading');
      void load();
    },
    setTheme,
    setTextSize,
    setReminders,
    openOnboarding,
  };
};
