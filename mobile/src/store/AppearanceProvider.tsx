import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { TextSizePreference, ThemePreference } from '@/theme';

/**
 * Appearance state.
 *
 * Holds the theme and text-size preferences for the whole app. State lives here
 * rather than inside the theme provider so that the theme stays a pure projection
 * of preference, and so persistence can be attached without touching any screen:
 * later phases hydrate the initial value from the settings repository and write
 * changes back through the same setters.
 */

export interface AppearanceState {
  readonly themePreference: ThemePreference;
  readonly textSize: TextSizePreference;
}

export interface AppearanceContextValue extends AppearanceState {
  setThemePreference: (preference: ThemePreference) => void;
  setTextSize: (textSize: TextSizePreference) => void;
  /** Applies both values at once, used when onboarding commits its draft. */
  applyAppearance: (state: AppearanceState) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export interface AppearanceProviderProps {
  readonly initial?: Partial<AppearanceState>;
  readonly onChange?: (state: AppearanceState) => void;
  readonly children: ReactNode;
}

export const AppearanceProvider = ({ initial, onChange, children }: AppearanceProviderProps) => {
  const [state, setState] = useState<AppearanceState>({
    themePreference: initial?.themePreference ?? 'device',
    textSize: initial?.textSize ?? 'standard',
  });

  const update = useCallback(
    (next: AppearanceState) => {
      setState(next);
      onChange?.(next);
    },
    [onChange],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      themePreference: state.themePreference,
      textSize: state.textSize,
      setThemePreference: (themePreference) => update({ ...state, themePreference }),
      setTextSize: (textSize) => update({ ...state, textSize }),
      applyAppearance: update,
    }),
    [state, update],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
};

export const useAppearance = (): AppearanceContextValue => {
  const value = useContext(AppearanceContext);
  if (value === null) {
    throw new Error('useAppearance must be used inside <AppearanceProvider>.');
  }
  return value;
};
