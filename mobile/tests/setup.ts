/**
 * Global test setup.
 *
 * Only genuine platform boundaries are mocked: Expo native modules that cannot
 * run off-device. Domain logic, SQLite persistence and repositories all run for
 * real against `node:sqlite`, so tests exercise actual behaviour rather than
 * stand-ins.
 */

// Jest matchers such as `toBeOnTheScreen` ship with @testing-library/react-native
// v14 and are registered automatically when the library is imported.

// Deterministic, collision-free identifiers so persisted rows are reproducible.
// The `mock` prefix is required: jest hoists module factories above imports and
// only permits variables named `mock*` to be captured.
let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockIdCounter += 1;
    return `00000000-0000-4000-8000-${String(mockIdCounter).padStart(12, '0')}`;
  }),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
  };
});

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));
