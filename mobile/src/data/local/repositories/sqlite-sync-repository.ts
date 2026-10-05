import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import { createId } from '@/services/ids';
import type {
  NewOutboxEvent,
  OutboxEventRecord,
  OutboxStatus,
  SyncOutboxRepository,
  SyncStateEntry,
  SyncStateRepository,
} from '@/data/repositories/sync-repository';
import type { WriteOptions } from '@/data/repositories/types';

import { decodePayload } from './mappers';

interface OutboxRow {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: string;
  occurred_at: string;
  attempt_count: number;
  next_attempt_at: string;
  idempotency_key: string;
  status: string;
  last_error: string | null;
}

const OUTBOX_SELECT = `
  SELECT id, event_type, entity_type, entity_id, payload, occurred_at,
         attempt_count, next_attempt_at, idempotency_key, status, last_error
  FROM sync_outbox`;

const toOutboxEvent = (row: OutboxRow): OutboxEventRecord => ({
  id: row.id,
  eventType: row.event_type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  payload: decodePayload<unknown>(row.payload),
  occurredAt: row.occurred_at,
  attemptCount: row.attempt_count,
  nextAttemptAt: row.next_attempt_at,
  idempotencyKey: row.idempotency_key,
  status: row.status as OutboxStatus,
  lastError: row.last_error,
});

export class SqliteSyncOutboxRepository implements SyncOutboxRepository {
  constructor(private readonly database: DatabasePort) {}

  async enqueue(event: NewOutboxEvent, options: WriteOptions = {}): Promise<OutboxEventRecord> {
    const id = event.id ?? createId('outbox');
    const occurredAt = event.occurredAt ?? new Date().toISOString();
    const nextAttemptAt = event.nextAttemptAt ?? occurredAt;

    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO sync_outbox
           (id, event_type, entity_type, entity_id, payload, occurred_at,
            attempt_count, next_attempt_at, idempotency_key, status, last_error)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', NULL)`,
        [
          id,
          event.eventType,
          event.entityType,
          event.entityId,
          jsonParam(event.payload),
          occurredAt,
          nextAttemptAt,
          event.idempotencyKey,
        ],
      );
    });

    const stored = await this.findByIdempotencyKey(event.idempotencyKey);
    if (stored === null) {
      throw new Error(`Outbox event ${id} vanished immediately after enqueue.`);
    }
    return stored;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<OutboxEventRecord | null> {
    const row = await this.database.queryOne<OutboxRow>(
      `${OUTBOX_SELECT} WHERE idempotency_key = ?`,
      [idempotencyKey],
    );
    return row === null ? null : toOutboxEvent(row);
  }

  async listReady(nowIso: string, limit = 25): Promise<OutboxEventRecord[]> {
    const rows = await this.database.query<OutboxRow>(
      `${OUTBOX_SELECT}
       WHERE status = 'pending' AND next_attempt_at <= ?
       ORDER BY occurred_at, id LIMIT ?`,
      [nowIso, limit],
    );
    return rows.map(toOutboxEvent);
  }

  async listAll(limit = 200): Promise<OutboxEventRecord[]> {
    const rows = await this.database.query<OutboxRow>(
      `${OUTBOX_SELECT} ORDER BY occurred_at, id LIMIT ?`,
      [limit],
    );
    return rows.map(toOutboxEvent);
  }

  async countByStatus(): Promise<Record<OutboxStatus, number>> {
    const rows = await this.database.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) AS count FROM sync_outbox GROUP BY status`,
    );
    const counts: Record<OutboxStatus, number> = { pending: 0, sent: 0, dead: 0 };
    for (const row of rows) {
      if (row.status === 'pending' || row.status === 'sent' || row.status === 'dead') {
        counts[row.status] = row.count;
      }
    }
    return counts;
  }

  async markSent(id: string, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`UPDATE sync_outbox SET status = 'sent', last_error = NULL WHERE id = ?`, [
        id,
      ]);
    });
  }

  async markRetry(
    id: string,
    failure: { error: string; nextAttemptAt: string },
    options: WriteOptions = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `UPDATE sync_outbox
         SET attempt_count = attempt_count + 1,
             last_error = ?,
             next_attempt_at = ?,
             status = 'pending'
         WHERE id = ?`,
        [failure.error, failure.nextAttemptAt, id],
      );
    });
  }

  async markDead(id: string, error: string, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`UPDATE sync_outbox SET status = 'dead', last_error = ? WHERE id = ?`, [
        error,
        id,
      ]);
    });
  }
}

export class SqliteSyncStateRepository implements SyncStateRepository {
  constructor(private readonly database: DatabasePort) {}

  async get(key: string): Promise<string | null> {
    const row = await this.database.queryOne<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = ?`,
      [key],
    );
    return row?.value ?? null;
  }

  async set(
    key: string,
    value: string,
    options: { updatedAt?: string; transaction?: WriteOptions['transaction'] } = {},
  ): Promise<void> {
    const updatedAt = options.updatedAt ?? new Date().toISOString();
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(
        `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, updatedAt],
      );
    });
  }

  async list(): Promise<SyncStateEntry[]> {
    const rows = await this.database.query<{ key: string; value: string; updated_at: string }>(
      `SELECT key, value, updated_at FROM sync_state ORDER BY key`,
    );
    return rows.map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at }));
  }

  async remove(key: string, options: WriteOptions = {}): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`DELETE FROM sync_state WHERE key = ?`, [key]);
    });
  }
}
