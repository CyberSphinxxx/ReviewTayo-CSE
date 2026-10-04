import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { AppearanceProvider } from '@/store/AppearanceProvider';
import { ThemeProvider, type TextSizePreference, type ThemePreference } from '@/theme';

/**
 * Test renderer that supplies the providers every screen expects.
 *
 * Tests can pin the theme and text size, which is how light/dark and
 * Standard/Large/Extra-Large rendering is verified without a device. The
 * providers are supplied through the `wrapper` option (rather than by wrapping the
 * element) so `rerender` keeps them in the tree.
 * `@testing-library/react-native` v14 renders asynchronously, so every helper here
 * returns a promise that must be awaited.
 */

export interface ProviderOptions {
  readonly themePreference?: ThemePreference;
  readonly textSize?: TextSizePreference;
}

export const withProviders = (
  ui: ReactElement,
  { themePreference = 'light', textSize = 'standard' }: ProviderOptions = {},
): ReactElement => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppearanceProvider initial={{ themePreference, textSize }}>
      <ThemeProvider preference={themePreference} textSize={textSize}>
        {children}
      </ThemeProvider>
    </AppearanceProvider>
  );
  return <Wrapper>{ui}</Wrapper>;
};

export const renderWithProviders = async (
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
): Promise<RenderResult> => {
  const { themePreference = 'light', textSize = 'standard', ...renderOptions } = options;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppearanceProvider initial={{ themePreference, textSize }}>
      <ThemeProvider preference={themePreference} textSize={textSize}>
        {children}
      </ThemeProvider>
    </AppearanceProvider>
  );
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
