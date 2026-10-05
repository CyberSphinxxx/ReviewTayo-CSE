import * as Crypto from 'expo-crypto';

/**
 * Identifier generation.
 *
 * Every persisted entity that originates on the device gets its id here, so the
 * same code path produces ids in the app and in tests (where `expo-crypto` is
 * deterministically mocked). Ids are opaque strings: repositories never parse
 * them, and sync identifies events by idempotency key rather than by id shape.
 */
export const createId = (prefix?: string): string => {
  const value = Crypto.randomUUID();
  return prefix === undefined ? value : `${prefix}_${value}`;
};
