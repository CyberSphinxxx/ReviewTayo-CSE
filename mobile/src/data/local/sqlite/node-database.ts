import { DatabaseSync } from 'node:sqlite';

import { asStorageError } from '@/data/local/database-port';
import type { DatabasePort, DatabaseTransaction, SqlValue } from '@/data/local/database-port';

/**
 * Test/CI implementation of the database port, backed by Node's built-in SQLite.
 *
 * It exists so migrations, constraints, transactions and repository queries are
 * exercised against a real SQLite engine — the same SQL text that ships — without an
 * emulator or a native build step. It is never bundled into the app.
 */

type Row = Record<string, unknown>;

class NodeTransaction implements DatabaseTransaction {
  constructor(protected readonly database: DatabaseSync) {}

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    try {
      this.database.prepare(sql).run(...(params as never[]));
    } catch (error) {
      throw asStorageError(sql, error);
    }
  }

  async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    try {
      const rows = this.database.prepare(sql).all(...(params as never[])) as Row[];
      return rows as T[];
    } catch (error) {
      throw asStorageError(sql, error);
    }
  }

  async queryOne<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }
}

class NodeDatabase extends NodeTransaction implements DatabasePort {
  readonly name: string;
  private inTransaction = false;

  constructor(
    private readonly db: DatabaseSync,
    name: string,
  ) {
    super(db);
    this.name = name;
  }

  /**
   * Mirrors the device adapter exactly, including refusing to nest: composing work
   * atomically is done by passing a transaction into repository calls, so a test can
   * never pass while the real engine would fail.
   */
  async transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      throw asStorageError(
        'transaction',
        new Error('Nested transactions are not supported. Pass the active transaction instead.'),
      );
    }
    this.db.exec('BEGIN');
    this.inTransaction = true;
    try {
      const result = await work(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // The original failure is the useful one; a rollback failure is secondary.
      }
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

export interface NodeDatabaseOptions {
  /** `:memory:` by default so each test starts from a clean database. */
  readonly location?: string;
}

export const openNodeDatabase = async (
  options: NodeDatabaseOptions = {},
): Promise<DatabasePort> => {
  const database = new DatabaseSync(options.location ?? ':memory:');
  database.exec('PRAGMA foreign_keys = ON;');
  return new NodeDatabase(database, options.location ?? ':memory:');
};
