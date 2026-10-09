import type { AppSettingsRecord, Repositories, WriteOptions } from '@/data/repositories';
import type { TextSizePreference, ThemePreference } from '@/domain/preferences';
import { toTextSizePreference, toThemePreference } from '@/domain/preferences';
import { settingsEvent } from '@/domain/sync';

/**
 * App settings service.
 *
 * Settings are a single row, so "save a patch" means read, merge and write. The
 * service validates stored values against the domain vocabulary on the way out:
 * a row written by an older build must never crash a screen or silently produce an
 * unstyled theme.
 */

export const DEFAULT_REMINDER_TIME = '19:00';

export const defaultAppSettings = (nowIso: string): AppSettingsRecord => ({
  themePreference: 'device',
  textSize: 'standard',
  remindersEnabled: false,
  reminderTime: DEFAULT_REMINDER_TIME,
  reminderTimezone: null,
  updatedAt: nowIso,
});

/** Reads the stored settings row, falling back to defaults on a fresh install. */
export const loadAppSettings = async (
  repositories: Repositories,
  now: Date = new Date(),
): Promise<AppSettingsRecord> => {
  const stored = await repositories.settings.get();
  if (stored === null) return defaultAppSettings(now.toISOString());
  return {
    ...stored,
    themePreference: toThemePreference(stored.themePreference),
    textSize: toTextSizePreference(stored.textSize),
    reminderTime:
      typeof stored.reminderTime === 'string' && stored.reminderTime.length > 0
        ? stored.reminderTime
        : DEFAULT_REMINDER_TIME,
  };
};

export interface AppSettingsPatch {
  readonly themePreference?: ThemePreference;
  readonly textSize?: TextSizePreference;
  readonly remindersEnabled?: boolean;
  readonly reminderTime?: string;
  readonly reminderTimezone?: string | null;
}

export interface SaveSettingsOptions {
  readonly now?: Date;
  /** Set when the caller already has an open transaction to join. */
  readonly transaction?: WriteOptions['transaction'];
}

export const saveAppSettings = async (
  repositories: Repositories,
  patch: AppSettingsPatch,
  { now = new Date(), transaction }: SaveSettingsOptions = {},
): Promise<AppSettingsRecord> => {
  const current = await loadAppSettings(repositories, now);
  const next: AppSettingsRecord = {
    ...current,
    ...(patch.themePreference === undefined ? {} : { themePreference: patch.themePreference }),
    ...(patch.textSize === undefined ? {} : { textSize: patch.textSize }),
    ...(patch.remindersEnabled === undefined ? {} : { remindersEnabled: patch.remindersEnabled }),
    ...(patch.reminderTime === undefined ? {} : { reminderTime: patch.reminderTime }),
    ...(patch.reminderTimezone === undefined ? {} : { reminderTimezone: patch.reminderTimezone }),
    updatedAt: now.toISOString(),
  };
  const options = transaction === undefined ? {} : { transaction };
  await repositories.settings.save(next, options);
  // Settings sync as intents: the newest change wins on the server, which is why
  // the event is keyed by the instant the learner meant it rather than by a
  // per-device counter (D-054).
  await repositories.outbox.enqueue(settingsEvent(next), options);
  return next;
};

/** Best-effort device timezone for a study reminder; `null` when unavailable. */
export const deviceTimezone = (): string | null => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone.length > 0 ? zone : null;
  } catch {
    return null;
  }
};
