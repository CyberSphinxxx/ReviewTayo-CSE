import { Text } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';

import type { DatabasePort } from '@/data/local/database-port';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import { AppearanceBootstrap } from '@/store/AppearanceBootstrap';
import { useAppearance } from '@/store/AppearanceProvider';
import { LocalDataProvider } from '@/store/LocalDataProvider';

import { createMigratedDatabase } from '@tests/utils/database';
import { renderWithProviders } from '@tests/utils/render';

/**
 * Appearance bootstrap.
 *
 * Theme and text size are stored preferences, and a launch that paints the default
 * theme first and then jumps to the learner's is a visible defect. These tests
 * record every value the app ever observes, so the claim "hydrates before the first
 * paint" is verified rather than assumed.
 */

const observed: string[] = [];

const AppearanceProbe = () => {
  const { themePreference, textSize } = useAppearance();
  observed.push(`${themePreference}|${textSize}`);
  return <Text testID="appearance">{`${themePreference}|${textSize}`}</Text>;
};

const renderBootstrap = async (openDatabase: () => Promise<DatabasePort>) =>
  renderWithProviders(
    <LocalDataProvider openDatabase={openDatabase}>
      <AppearanceBootstrap>
        <AppearanceProbe />
      </AppearanceBootstrap>
    </LocalDataProvider>,
  );

beforeEach(() => {
  observed.length = 0;
});

describe('AppearanceBootstrap', () => {
  it('applies the stored appearance without ever painting the default', async () => {
    const { db, repositories } = await createMigratedDatabase();
    await repositories.settings.save({
      themePreference: 'dark',
      textSize: 'extra',
      remindersEnabled: false,
      reminderTime: '19:00',
      reminderTimezone: null,
      updatedAt: '2026-10-01T00:00:00.000Z',
    });

    await renderBootstrap(async () => db);

    await waitFor(() => {
      expect(screen.getByTestId('appearance')).toHaveTextContent('dark|extra');
    });
    // The first — and only — appearance the tree observed is the stored one.
    expect(observed[0]).toBe('dark|extra');
    expect(observed).not.toContain('device|standard');
  });

  it('coerces a preference written by an older build instead of resetting it', async () => {
    const { db } = await createMigratedDatabase();
    // Written as raw SQL on purpose: this is a row an earlier build left behind,
    // which the current typed repository cannot express.
    await db.execute(
      `INSERT INTO app_settings
         (id, theme_preference, text_size, reminders_enabled, reminder_time,
          reminder_timezone, updated_at)
       VALUES (1, 'sepia', 'extra-large', 0, '19:00', NULL, '2026-10-01T00:00:00.000Z')`,
    );

    await renderBootstrap(async () => db);

    // An unknown theme falls back, the renamed text size is preserved.
    await waitFor(() => {
      expect(screen.getByTestId('appearance')).toHaveTextContent('device|extra');
    });
  });

  it('falls back to defaults when storage cannot be read, rather than blocking', async () => {
    const db = await openNodeDatabase();
    // Opening the app's data store fails; appearance is a preference, not a
    // prerequisite, so the tree must still mount.
    await renderBootstrap(async () => {
      await db.close();
      throw new Error('disk unavailable');
    });

    await waitFor(() => {
      expect(screen.getByTestId('appearance')).toHaveTextContent('device|standard');
    });
  });
});
