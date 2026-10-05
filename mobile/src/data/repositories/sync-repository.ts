import type { DatabaseTransaction } from '@/data/local/database-port';

import type { WriteOptions } from './types';

export const OUTBOX_STATUSES = ['pending', 'sent', 'dead'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export interface NewOutboxEvent {
  /** Optional caller-supplied id; generated when omitted. */
  readonly id?: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly occurredAt?: string;
  /** Deterministic key that makes at-least-once delivery safe to retry. */
  readonly idempotencyKey: string;
  readonly nextAttemptAt?: string;
}

export interface OutboxEventRecord {
  readonly id: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly payload: unknown;
  readonly occurredAt: string;
  readonly attemptCount: number;
  readonly nextAttemptAt: string;
  readonly idempotencyKey: string;
  readonly status: OutboxStatus;
  readonly lastError: string | null;
}

/**
 * Outbox.
 *
 * Local writes append an event inside the same transaction that makes the change,
 * so a crash can never lose or invent a remote event. The worker only ever moves
 * rows forward: ready → retry (with backoff) → sent, or → dead.
 */
export interface SyncOutboxRepository {
  enqueue(event: NewOutboxEvent, options?: WriteOptions): Promise<OutboxEventRecord>;
  findByIdempotencyKey(idempotencyKey: string): Promise<OutboxEventRecord | null>;
  /** Pending events whose next attempt is due, oldest first. */
  listReady(nowIso: string, limit?: number): Promise<OutboxEventRecord[]>;
  listAll(limit?: number): Promise<OutboxEventRecord[]>;
  countByStatus(): Promise<Record<OutboxStatus, number>>;
  markSent(id: string, options?: WriteOptions): Promise<void>;
  markRetry(
    id: string,
    failure: { error: string; nextAttemptAt: string },
    options?: WriteOptions,
  ): Promise<void>;
  markDead(id: string, error: string, options?: WriteOptions): Promise<void>;
}

export interface SyncStateEntry {
  readonly key: string;
  readonly value: string;
  readonly updatedAt: string;
}

export interface SyncStateRepository {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { updatedAt?: string; transaction?: DatabaseTransaction },
  ): Promise<void>;
  list(): Promise<SyncStateEntry[]>;
  remove(key: string, options?: WriteOptions): Promise<void>;
}
