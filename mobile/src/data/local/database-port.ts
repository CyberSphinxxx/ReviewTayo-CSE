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

export const NESTED_TRANSACTION_MESSAGE =
  'Nested transactions are not supported. Pass the active transaction instead.';

export interface TransactionGate {
  /** True while a queued transaction's work is executing. */
  readonly isActive: boolean;
  /** Runs `execute` after every transaction queued before it. */
  run<T>(execute: () => Promise<T>): Promise<T>;
}

/**
 * Serializes top-level transactions on both engines.
 *
 * Two writes that arrive at the same instant — the deadline ticking while an
 * answer is being saved, a bookmark tapped during a submit — are not a nesting
 * bug: they must take turns. Before this gate, the second write was refused with
 * a spurious "nested transaction" error, so a real save failed and the learner
 * was told their work did not happen. A call made from *inside* another
 * transaction's work — the mistake the refusal exists to catch — would wait
 * forever, so an arrival while a transaction is open is bounded by `nestGuardMs`:
 * a genuine race resolves in milliseconds, and anything still waiting at the
 * limit is the nesting error and is refused with the same message as before.
 */
export const createTransactionGate = (
  options: { readonly nestGuardMs?: number } = {},
): TransactionGate => {
  const nestGuardMs = options.nestGuardMs ?? 5_000;
  let tail: Promise<void> = Promise.resolve();
  let active = false;

  const enqueue = <T>(execute: () => Promise<T>): Promise<T> => {
    const turn = tail.then(async () => {
      active = true;
      try {
        return await execute();
      } finally {
        active = false;
      }
    });
    tail = turn.then(
      () => undefined,
      () => undefined,
    );
    return turn;
  };

  /** Waits out the transaction that is open, or gives up as a nesting mistake. */
  const waitOut = (): Promise<void> => {
    const open = tail;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(asStorageError('transaction', new Error(NESTED_TRANSACTION_MESSAGE)));
      }, nestGuardMs);
    });
    return Promise.race([
      open.then(
        () => undefined,
        () => undefined,
      ),
      timeout,
    ]).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
  };

  return {
    get isActive(): boolean {
      return active;
    },
    run<T>(execute: () => Promise<T>): Promise<T> {
      if (!active) return enqueue(execute);
      return waitOut().then(() => enqueue(execute));
    },
  };
};
