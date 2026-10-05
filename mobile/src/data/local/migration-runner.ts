import { createLogger } from '@/services/logging/logger';
import { AppError } from '@/domain/result';

import { initialSchemaMigration } from './migrations/001-initial-schema';
import type { DatabasePort, DatabaseTransaction } from './database-port';

/**
 * Migration framework.
 *
 * The schema version lives in SQLite's own `user_version`, which means a migration is
 * atomic with the version bump: either both happen or neither does. Rebuilding the
 * database is never an upgrade strategy — that would destroy study history, which
 * `MIGRATION-TESTS.md` explicitly forbids.
 */

const log = createLogger('migrations');

export interface Migration {
  /** Strictly increasing, starting at 1. */
  readonly version: number;
  readonly name: string;
  /** Applied in order inside one transaction. */
  readonly statements: readonly string[];
}

/** Every migration known to the app, in application order. */
export const migrations: readonly Migration[] = [initialSchemaMigration];

export const LATEST_SCHEMA_VERSION = migrations.reduce(
  (highest, migration) => Math.max(highest, migration.version),
  0,
);

export interface MigrationResult {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly applied: readonly string[];
}

const readUserVersion = async (db: DatabaseTransaction): Promise<number> => {
  const row = await db.queryOne<{ user_version: number }>('PRAGMA user_version');
  return typeof row?.user_version === 'number' ? row.user_version : 0;
};

/** `PRAGMA` cannot take bound parameters; the value is validated as an integer. */
const writeUserVersion = async (db: DatabaseTransaction, version: number): Promise<void> => {
  const safe = Math.trunc(version);
  if (!Number.isFinite(safe) || safe < 0) {
    throw new AppError('validation', `Refusing to write invalid schema version: ${version}`);
  }
  await db.execute(`PRAGMA user_version = ${safe}`);
};

const ensureVersionTable = async (db: DatabaseTransaction): Promise<void> => {
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_meta (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     schema_version INTEGER NOT NULL,
     installed_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`);
};

/**
 * Brings the database up to `targetVersion` (default: latest).
 *
 * Each migration runs in its own transaction, so a failure leaves the database at the
 * last fully applied version rather than half-upgraded.
 */
export const runMigrations = async (
  database: DatabasePort,
  options: { targetVersion?: number; all?: readonly Migration[] } = {},
): Promise<MigrationResult> => {
  const all = options.all ?? migrations;
  const target = options.targetVersion ?? all.reduce((max, m) => Math.max(max, m.version), 0);
  const ordered = [...all]
    .filter((migration) => migration.version <= target)
    .sort((a, b) => a.version - b.version);

  const fromVersion = await readUserVersion(database);
  const applied: string[] = [];
  const now = new Date().toISOString();

  await ensureVersionTable(database);
  await database.execute(
    `INSERT INTO schema_meta (id, schema_version, installed_at, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET schema_version = excluded.schema_version, updated_at = excluded.updated_at`,
    [fromVersion, now, now],
  );

  if (fromVersion > target) {
    // A downgrade would mean the app is older than the data, which is unrecoverable
    // without guessing: refuse loudly rather than corrupting records.
    throw new AppError(
      'unsupported',
      `Database schema version ${fromVersion} is newer than this app supports (${target}).`,
      { details: { fromVersion, target } },
    );
  }

  for (const migration of ordered) {
    if (migration.version <= fromVersion) continue;

    try {
      await database.transaction(async (tx) => {
        for (const statement of migration.statements) {
          await tx.execute(statement);
        }
        await writeUserVersion(tx, migration.version);
        await tx.execute('UPDATE schema_meta SET schema_version = ?, updated_at = ? WHERE id = 1', [
          migration.version,
          new Date().toISOString(),
        ]);
      });
      applied.push(`${migration.version}:${migration.name}`);
      log.info('migration applied', { version: migration.version, name: migration.name });
    } catch (error) {
      log.error('migration failed', error, { version: migration.version, name: migration.name });
      throw new AppError(
        'storage',
        `Migration ${migration.version} (${migration.name}) failed and was rolled back.`,
        { cause: error, details: { version: migration.version, name: migration.name } },
      );
    }
  }

  const toVersion = await readUserVersion(database);
  return { fromVersion, toVersion, applied };
};

/** Reads the current schema version without applying anything. */
export const getSchemaVersion = async (database: DatabasePort): Promise<number> =>
  readUserVersion(database);
