import * as SQLite from 'expo-sqlite';

import { createLogger } from '@/services/logging/logger';
import { asStorageError, createTransactionGate } from '@/data/local/database-port';
import type {
  DatabasePort,
  DatabaseTransaction,
  SqlValue,
  TransactionGate,
} from '@/data/local/database-port';

const log = createLogger('sqlite');

/**
 * Device implementation of the database port.
 *
 * Pragmas are applied on every open because SQLite settings such as `foreign_keys`
 * are per-connection: a study app that silently stops enforcing referential
 * integrity after a reconnect would corrupt mastery and review state.
 */

class ExpoTransaction implements DatabaseTransaction {
  constructor(protected readonly db: SQLite.SQLiteDatabase) {}

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    try {
      await this.db.runAsync(sql, params as SQLite.SQLiteBindValue[]);
    } catch (error) {
      throw asStorageError(sql, error);
    }
  }

  async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    try {
      return await this.db.getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
    } catch (error) {
      throw asStorageError(sql, error);
    }
  }

  async queryOne<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
    try {
      return await this.db.getFirstAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
    } catch (error) {
      throw asStorageError(sql, error);
    }
  }
}

class ExpoDatabase extends ExpoTransaction implements DatabasePort {
  readonly name: string;
  private readonly gate: TransactionGate = createTransactionGate();

  constructor(
    private readonly database: SQLite.SQLiteDatabase,
    name: string,
  ) {
    super(database);
    this.name = name;
  }

  /**
   * Runs `work` atomically. Concurrent top-level writes take turns via the
   * transaction gate — a timer tick finishing a session while an answer is being
   * saved must wait its turn rather than fail as a "nested" transaction. Nesting
   * itself is still refused rather than silently converted into a savepoint: use
   * cases that must change several repositories together receive the active
   * transaction instead (see `UnitOfWork`).
   */
  async transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.gate.run(async () => {
      let result: T | undefined;
      let failure: unknown;

      try {
        await this.database.withExclusiveTransactionAsync(async (txn) => {
          result = await work(new ExpoTransaction(txn));
        });
      } catch (error) {
        failure = error;
      }

      if (failure !== undefined) throw failure;
      return result as T;
    });
  }

  async close(): Promise<void> {
    try {
      await this.database.closeAsync();
    } catch (error) {
      log.warn('close failed', { error: String(error) });
    }
  }
}

export const applyPragmas = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
};

/** Opens (creating if needed) the on-device database. */
export const openExpoDatabase = async (name: string): Promise<DatabasePort> => {
  const database = await SQLite.openDatabaseAsync(name);
  await applyPragmas(database);
  return new ExpoDatabase(database, name);
};

/** Deletes the database file; used by the development reset tools. */
export const deleteExpoDatabase = async (name: string): Promise<void> => {
  await SQLite.deleteDatabaseAsync(name);
};
