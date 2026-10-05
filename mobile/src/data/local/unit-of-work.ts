import type { DatabasePort, DatabaseTransaction } from './database-port';

/**
 * Unit of work.
 *
 * Several repositories often have to change together — submitting an answer writes the
 * answer, updates mastery, schedules review and appends an outbox event. Receiving the
 * transaction lets those writes stay atomic without nesting transactions, which neither
 * engine supports.
 */
export interface UnitOfWork {
  run<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
}

export const createUnitOfWork = (database: DatabasePort): UnitOfWork => ({
  run: (work) => database.transaction(work),
});

/** The transaction a repository method should use: an active one, or a fresh one. */
export const resolveTransaction = (
  database: DatabasePort,
  transaction?: DatabaseTransaction,
): DatabaseTransaction => transaction ?? database;

/**
 * Runs `work` inside the caller's transaction when one is active, otherwise inside
 * a fresh transaction. Repositories use this for every multi-statement write.
 */
export const withTransaction = async <T>(
  database: DatabasePort,
  transaction: DatabaseTransaction | undefined,
  work: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> => (transaction !== undefined ? work(transaction) : database.transaction(work));
