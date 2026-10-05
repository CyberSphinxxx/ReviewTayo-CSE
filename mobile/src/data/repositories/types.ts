import type { DatabaseTransaction } from '@/data/local/database-port';

/**
 * Shared write option for repositories.
 *
 * Passing the active transaction lets a use case change several repositories
 * atomically — submitting an answer writes the answer, mastery, review state and
 * an outbox event together — without any repository opening a nested transaction.
 */
export interface WriteOptions {
  readonly transaction?: DatabaseTransaction;
}
