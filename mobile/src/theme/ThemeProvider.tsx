import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type Theme } from './theme';
import type { ResolvedThemeMode, TextSizePreference, ThemePreference } from './tokens';

interface ThemeContextValue {
  readonly theme: Theme;
  readonly preference: ThemePreference;
  readonly textSize: TextSizePreference;
  /** The preference actually in effect once `device` has been resolved. */
  readonly resolvedMode: ResolvedThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  readonly preference: ThemePreference;
  readonly textSize: TextSizePreference;
  readonly children: ReactNode;
}

/**
 * Resolves the appearance preference into a concrete theme.
 *
 * State lives in settings (SQLite) and is passed in, so this provider stays a pure
 * projection of user preference — which is what makes theme switching testable
 * without a database.
 */
export const ThemeProvider = ({ preference, textSize, children }: ThemeProviderProps) => {
  const systemScheme = useColorScheme();
  const resolvedMode: ResolvedThemeMode =
    preference === 'device' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: createTheme(resolvedMode, textSize),
      preference,
      textSize,
      resolvedMode,
    }),
    [preference, resolvedMode, textSize],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return value;
};

/** Primary hook for screens and components. */
export const useTheme = (): Theme => useThemeContext().theme;
