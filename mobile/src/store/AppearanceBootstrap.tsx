import { useEffect, useState, type ReactNode } from 'react';

import { loadAppSettings } from '@/services/app-settings';
import { createLogger } from '@/services/logging/logger';

import { AppearanceProvider, type AppearanceState } from './AppearanceProvider';
import { useLocalData } from './LocalDataProvider';

const log = createLogger('appearance');

/**
 * Appearance bootstrap.
 *
 * Theme and text size are stored preferences, so they must be read before the
 * first screen paints — otherwise every launch flashes the default theme and then
 * jumps to the learner's. The native splash stays up until the read settles; a
 * failed read falls back to defaults rather than blocking the app, because
 * appearance is a preference, not a prerequisite.
 *
 * Persistence is deliberately explicit: onboarding commits its draft in one
 * transaction and Settings saves each change. Nothing here writes to the database,
 * so a preview in the onboarding flow can never leak into stored state.
 */

export interface AppearanceBootstrapProps {
  readonly children: ReactNode;
}

export const AppearanceBootstrap = ({ children }: AppearanceBootstrapProps) => {
  const { status, repositories } = useLocalData();
  const [appearance, setAppearance] = useState<AppearanceState | null>(null);

  useEffect(() => {
    if (status !== 'ready' || repositories === null) return;
    let cancelled = false;
    void (async () => {
      let resolved: AppearanceState = { themePreference: 'device', textSize: 'standard' };
      try {
        const settings = await loadAppSettings(repositories);
        resolved = {
          themePreference: settings.themePreference,
          textSize: settings.textSize,
        };
      } catch (cause) {
        log.warn('could not read stored appearance; using defaults', { error: cause });
      }
      if (!cancelled) setAppearance(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [repositories, status]);

  if (status === 'starting') return null;
  if (status === 'ready' && appearance === null) return null;

  return <AppearanceProvider initial={appearance ?? undefined}>{children}</AppearanceProvider>;
};
