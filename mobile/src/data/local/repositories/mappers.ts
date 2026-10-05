import type { SqlValue } from '@/data/local/database-port';

/** Shared row helpers. Values are decoded defensively: one corrupt row must not crash a screen. */

export const isoNow = (): string => new Date().toISOString();

export const toSqlBool = (value: boolean): number => (value ? 1 : 0);

export const fromSqlBool = (value: unknown): boolean => value === 1 || value === true;

export const placeholders = (count: number): string =>
  Array.from({ length: count }, () => '?').join(', ');

/**
 * Decodes a JSON payload column. Returns `null` for a missing or unparseable value
 * so callers can skip the row instead of surfacing a JSON error to a learner.
 */
export const decodePayload = <T>(payload: unknown): T | null => {
  if (typeof payload !== 'string' || payload.length === 0) return null;
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
};

export const clampPositiveInt = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded >= 0 ? rounded : fallback;
};

export type SqlParams = SqlValue[];
