import { AppError } from '@/domain/result';

/**
 * Database port.
 *
 * Repositories depend on this narrow interface rather than on `expo-sqlite`, which
 * is what allows the entire persistence layer — migrations and all — to be verified
 * in CI against a real SQLite engine (see ADR-002). Only two adapters exist:
 * the device one and the Node one used by tests.
 *
 * All values are bound as parameters; SQL text is never built from values.
 */

/** Values a bound parameter may take on either engine. Booleans are stored as 0/1. */
export type SqlValue = string | number | null;

export interface DatabaseTransaction {
  execute(sql: string, params?: readonly SqlValue[]): Promise<void>;
  query<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
}

export interface DatabasePort extends DatabaseTransaction {
  /** Runs `work` atomically; a throw rolls the whole transaction back. */
  transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  /** Identifier for diagnostics only (never shown to learners). */
  readonly name: string;
}

/** Normalises boolean and undefined values into something both engines accept. */
export const toSqlValue = (value: unknown): SqlValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
};

export const jsonParam = (value: unknown): SqlValue => JSON.stringify(value ?? null);

export const parseJsonColumn = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    // A corrupt column must not crash a screen; the caller receives the fallback.
    return fallback;
  }
};

/**
 * Extracts the driver's own description of a failure.
 *
 * SQLite reports constraint violations only in the driver message
 * (`UNIQUE constraint failed: …`), and losing it would leave callers unable to tell
 * a duplicate key from a foreign-key or syntax problem.
 */
const describeCause = (cause: unknown): string | null => {
  if (typeof cause === 'string') return cause.trim().length > 0 ? cause : null;
  // Duck-typed rather than `instanceof Error`: a native driver can throw an Error
  // created in another realm, where `instanceof` is false even though the message is
  // perfectly readable.
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    const message = (cause as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return null;
};

/** Wraps a driver failure so callers receive a typed application error. */
export const asStorageError = (operation: string, cause: unknown): AppError => {
  const detail = describeCause(cause);
  return new AppError(
    'storage',
    detail
      ? `Database operation failed: ${operation} — ${detail}`
      : `Database operation failed: ${operation}`,
    { cause },
  );
};
