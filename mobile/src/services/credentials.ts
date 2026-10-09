import * as SecureStore from 'expo-secure-store';

import { AppError, toAppError } from '@/domain/result';

/**
 * Credential storage.
 *
 * Sign-in material — the account identity, the device id and the provider's tokens
 * — belongs in the platform keystore, not in SQLite and not in memory that a
 * restore would lose. The boundary is an interface so the auth service can be
 * tested with a memory store, and every real failure is normalised into a
 * `storage` AppError so a device without a keystore reports itself rather than
 * pretending to have saved something.
 */

export const CREDENTIAL_KEYS = {
  /** The signed-in account, as JSON. Absent means guest. */
  identity: 'reviewtayo.identity',
  /** The device's own id, generated once per install and kept. */
  deviceId: 'reviewtayo.device-id',
  /** The provider session used for the server handshake. */
  googleTokens: 'reviewtayo.google.tokens',
} as const;

export type CredentialKey = (typeof CREDENTIAL_KEYS)[keyof typeof CREDENTIAL_KEYS];

export interface CredentialStore {
  /** False when this device has no keystore; the app then stays a guest forever. */
  isAvailable(): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const storageFailure = (action: string, cause: unknown): AppError =>
  new AppError('storage', `Could not ${action} on this device.`, { cause });

class SecureCredentialStore implements CredentialStore {
  async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (cause) {
      throw storageFailure('read your saved account', cause);
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (cause) {
      throw storageFailure('save your account', cause);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (cause) {
      throw storageFailure('clear your saved account', cause);
    }
  }
}

export const createSecureCredentialStore = (): CredentialStore => new SecureCredentialStore();

/** Test seam and the fallback when a device has no keystore. */
export const createMemoryCredentialStore = (
  initial: Readonly<Record<string, string>> = {},
): CredentialStore => {
  const values = new Map<string, string>(Object.entries(initial));
  return {
    isAvailable: async () => true,
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    delete: async (key) => {
      values.delete(key);
    },
  };
};

/** Reads JSON from the store, treating anything unparseable as absent. */
export const readCredentialJson = async (store: CredentialStore, key: string): Promise<unknown> => {
  const raw = await store.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

/** Writes JSON to the store; a failed write is a `storage` AppError. */
export const writeCredentialJson = async (
  store: CredentialStore,
  key: string,
  value: unknown,
): Promise<void> => {
  try {
    await store.set(key, JSON.stringify(value));
  } catch (cause) {
    throw toAppError(cause, 'Could not save your account on this device.');
  }
};
