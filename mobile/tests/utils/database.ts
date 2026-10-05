import { runMigrations } from '@/data/local/migration-runner';
import { createLocalRepositories } from '@/data/local/repositories';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';

export interface TestDatabase {
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}

/** A fresh in-memory database migrated to the latest schema, with repositories wired. */
export const createMigratedDatabase = async (): Promise<TestDatabase> => {
  const db = await openNodeDatabase();
  await runMigrations(db);
  return { db, repositories: createLocalRepositories(db) };
};
