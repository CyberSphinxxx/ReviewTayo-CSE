import {
  API_CONTRACT_VERSION,
  API_PATHS,
  narrowPushEventsResult,
  type ApiTransport,
  type PushEventsBody,
  type SyncEventBody,
} from '@/data/remote';
import type { OutboxEventRecord, Repositories } from '@/data/repositories';
import {
  DEFAULT_BACKOFF,
  describeBackoff,
  isExhausted,
  nextAttemptAt,
  type BackoffPolicy,
} from '@/domain/sync';
import { createLogger } from '@/services/logging/logger';

/**
 * The outbox worker.
 *
 * One pass, not a daemon: it takes the events whose next attempt is due, sends
 * them one at a time with their idempotency key, and records what happened. A
 * delivery that fails is scheduled again with bounded backoff and jitter; one that
 * keeps failing is left dead rather than retried forever. Nothing here can throw —
 * sync failing must never interrupt studying (D-052).
 *
 * Delivery is at-least-once by design: the same event may be sent twice (a crash
 * between the write and the server's answer, a retry after a timeout), which is
 * exactly what the idempotency key makes safe on the other side.
 */

const log = createLogger('sync');

export const SYNC_STATE_KEYS = {
  lastSyncedAt: 'sync.lastSyncedAt',
  lastError: 'sync.lastError',
} as const;

export const MAX_BATCH = 25;

export type SyncStatus = 'offline' | 'synced' | 'retrying' | 'failed';

export interface SyncSummary {
  readonly status: SyncStatus;
  readonly attempted: number;
  readonly sent: number;
  readonly retried: number;
  readonly dead: number;
  /** Events still queued when the pass finished. */
  readonly pending: number;
  readonly nextAttemptAt: string | null;
  /** Safe to show a learner. */
  readonly message: string;
}

export interface SyncDependencies {
  readonly repositories: Repositories;
  readonly transport: ApiTransport;
  /** Attributed to the account's subject or the device's id; `null` when unknown. */
  readonly actorId?: string | null;
  readonly now?: Date;
  readonly limit?: number;
  readonly backoff?: BackoffPolicy;
  /** Injected so backoff is deterministic in tests. */
  readonly random?: () => number;
}

const eventBody = (event: OutboxEventRecord): SyncEventBody => ({
  id: event.id,
  eventType: event.eventType,
  entityType: event.entityType,
  entityId: event.entityId,
  idempotencyKey: event.idempotencyKey,
  occurredAt: event.occurredAt,
  payload: event.payload,
});

const emptySummary = (status: SyncStatus, message: string, pending: number): SyncSummary => ({
  status,
  attempted: 0,
  sent: 0,
  retried: 0,
  dead: 0,
  pending,
  nextAttemptAt: null,
  message,
});

/** One pass over the events that are due. */
export const syncNow = async ({
  repositories,
  transport,
  actorId = null,
  now = new Date(),
  limit = MAX_BATCH,
  backoff = DEFAULT_BACKOFF,
  random,
}: SyncDependencies): Promise<SyncSummary> => {
  try {
    const available = await transport.isAvailable().catch(() => false);
    if (!available) {
      const counts = await repositories.outbox.countByStatus();
      return emptySummary(
        'offline',
        transport.isRemote
          ? 'Waiting for a connection. Your work is saved and will sync.'
          : 'No backend is configured in this build, so nothing leaves this device yet.',
        counts.pending,
      );
    }

    const ready = await repositories.outbox.listReady(now.toISOString(), limit);
    if (ready.length === 0) {
      const counts = await repositories.outbox.countByStatus();
      return emptySummary('synced', 'Everything on this device is up to date.', counts.pending);
    }

    let sent = 0;
    let retried = 0;
    let dead = 0;
    let lastFailure: string | null = null;
    let soonest: string | null = null;

    for (const event of ready) {
      const body: PushEventsBody = { deviceId: actorId, events: [eventBody(event)] };
      const response = await transport.send({
        path: API_PATHS.pushEvents,
        method: 'POST',
        body: { contractVersion: API_CONTRACT_VERSION, data: body },
        idempotencyKey: event.idempotencyKey,
      });

      if (!response.ok) {
        const failure = response.error;
        const exhausted = isExhausted(event.attemptCount, backoff);
        if (failure.retryable && !exhausted) {
          const at = nextAttemptAt(event.attemptCount, now, backoff, random ?? (() => 0.5));
          await repositories.outbox.markRetry(
            event.id,
            { error: failure.message, nextAttemptAt: at },
            {},
          );
          retried += 1;
          lastFailure = failure.message;
          if (soonest === null || at < soonest) soonest = at;
        } else {
          // Permanent, or out of attempts: keep it and its reason rather than
          // retrying for ever.
          await repositories.outbox.markDead(event.id, failure.message);
          dead += 1;
          lastFailure = failure.message;
        }
        continue;
      }

      const narrowed = narrowPushEventsResult(response.value);
      if (!narrowed.ok) {
        await repositories.outbox.markDead(event.id, narrowed.error.message);
        dead += 1;
        lastFailure = narrowed.error.message;
        continue;
      }

      const rejection = narrowed.value.rejected.find((entry) => entry.id === event.id);
      if (rejection !== undefined) {
        await repositories.outbox.markDead(event.id, rejection.reason);
        dead += 1;
        lastFailure = rejection.reason;
        continue;
      }

      await repositories.outbox.markSent(event.id);
      sent += 1;
    }

    const counts = await repositories.outbox.countByStatus();
    const nowIso = now.toISOString();

    if (lastFailure !== null) {
      await repositories.syncState.set(SYNC_STATE_KEYS.lastError, lastFailure, {
        updatedAt: nowIso,
      });
    }
    if (sent > 0) {
      await repositories.syncState.set(SYNC_STATE_KEYS.lastSyncedAt, nowIso, {
        updatedAt: nowIso,
      });
    }

    const status: SyncStatus = dead > 0 ? 'failed' : retried > 0 ? 'retrying' : 'synced';
    const message =
      dead > 0
        ? (lastFailure ?? 'Some saved work could not be sent.')
        : retried > 0
          ? `${retried} of ${ready.length} changes will be tried again.`
          : sent > 0
            ? `${sent} ${sent === 1 ? 'change' : 'changes'} synced.`
            : 'Everything on this device is up to date.';

    log.info('sync pass', { status, sent, retried, dead, pending: counts.pending });

    return {
      status,
      attempted: ready.length,
      sent,
      retried,
      dead,
      pending: counts.pending,
      nextAttemptAt: soonest,
      message,
    };
  } catch (cause) {
    log.warn('sync pass failed', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return emptySummary('failed', 'Sync hit a problem. Your work is safe and will try again.', 0);
  }
};

export interface SyncOverview {
  readonly available: boolean;
  readonly isRemote: boolean;
  readonly pending: number;
  readonly sent: number;
  readonly dead: number;
  readonly lastSyncedAt: string | null;
  readonly lastError: string | null;
  /** One honest line for the settings row. */
  readonly line: string;
  /** `2 changes waiting` — the queued-work line, or `Nothing waiting` when clear. */
  readonly pendingLine: string;
  readonly retryNote: string;
}

export const loadSyncOverview = async ({
  repositories,
  transport,
}: {
  readonly repositories: Repositories;
  readonly transport: ApiTransport;
}): Promise<SyncOverview> => {
  const [counts, lastSyncedAt, lastError, available] = await Promise.all([
    repositories.outbox.countByStatus(),
    repositories.syncState.get(SYNC_STATE_KEYS.lastSyncedAt).catch(() => null),
    repositories.syncState.get(SYNC_STATE_KEYS.lastError).catch(() => null),
    transport.isAvailable().catch(() => false),
  ]);

  const pendingLine =
    counts.pending === 0
      ? 'Nothing waiting'
      : `${counts.pending} ${counts.pending === 1 ? 'change' : 'changes'} waiting`;

  const line = !available
    ? transport.isRemote
      ? 'Offline — saved on this device'
      : 'Saved on this device'
    : counts.pending > 0
      ? 'Syncing…'
      : lastSyncedAt === null
        ? 'Ready to sync'
        : 'Up to date';

  return {
    available,
    isRemote: transport.isRemote,
    pending: counts.pending,
    sent: counts.sent,
    dead: counts.dead,
    lastSyncedAt,
    lastError,
    line,
    pendingLine,
    retryNote: describeBackoff(),
  };
};
