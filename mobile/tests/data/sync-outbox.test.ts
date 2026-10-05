import type { DatabasePort } from '@/data/local/database-port';
import type { AnswerRecord, Repositories } from '@/data/repositories';

import { createMigratedDatabase } from '@tests/utils/database';
import { restoreLogs, silenceLogs } from '@tests/utils/logs';

/**
 * Outbox tests.
 *
 * The contract they hold the implementation to: an event appended with a local
 * write is durable, a retry respects its backoff, a delivered event is never
 * picked up again, and idempotency keys make duplicates impossible.
 */

const NOW = '2026-10-06T08:00:00.000Z';
const LATER = '2026-10-06T09:00:00.000Z';

const newEvent = (overrides: Record<string, unknown> = {}) => ({
  eventType: 'answer.recorded',
  entityType: 'answer',
  entityId: 'answer-1',
  payload: { questionId: 'q1', isCorrect: true },
  idempotencyKey: 'answer:answer-1',
  occurredAt: NOW,
  ...overrides,
});

const answerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: 'answer-1',
  sessionId: 'session-1',
  questionId: 'q1',
  examId: 'cse',
  subjectId: 'verbal-ability',
  conceptIds: ['vocabulary'],
  chosenChoiceId: 'a',
  correctChoiceId: 'a',
  isCorrect: true,
  source: 'practice',
  answeredAt: NOW,
  timeSpentSeconds: 20,
  ...overrides,
});

describe('sync outbox', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  it('enqueues an event that is immediately ready for delivery', async () => {
    const event = await repositories.outbox.enqueue(newEvent());

    expect(event.status).toBe('pending');
    expect(event.attemptCount).toBe(0);
    expect(event.nextAttemptAt).toBe(NOW);
    expect(event.payload).toEqual({ questionId: 'q1', isCorrect: true });
    expect(event.lastError).toBeNull();

    const ready = await repositories.outbox.listReady(NOW);
    expect(ready.map((entry) => entry.id)).toEqual([event.id]);
  });

  it('rejects a duplicate idempotency key instead of queuing the same event twice', async () => {
    silenceLogs();
    try {
      await repositories.outbox.enqueue(newEvent());
      await expect(repositories.outbox.enqueue(newEvent())).rejects.toThrow(
        /Database operation failed/,
      );
      const all = await repositories.outbox.listAll();
      expect(all).toHaveLength(1);
    } finally {
      restoreLogs();
    }
  });

  it('does not pick up an event before its next attempt time', async () => {
    const immediate = await repositories.outbox.enqueue(newEvent());
    const delayed = await repositories.outbox.enqueue(
      newEvent({
        idempotencyKey: 'answer:answer-2',
        entityId: 'answer-2',
        nextAttemptAt: LATER,
      }),
    );

    expect((await repositories.outbox.listReady(NOW)).map((entry) => entry.id)).toEqual([
      immediate.id,
    ]);
    expect((await repositories.outbox.listReady(LATER)).map((entry) => entry.id)).toEqual([
      immediate.id,
      delayed.id,
    ]);
  });

  it('records a retry with backoff and delivers after it succeeds', async () => {
    const event = await repositories.outbox.enqueue(newEvent());

    await repositories.outbox.markRetry(event.id, {
      error: 'network unavailable',
      nextAttemptAt: '2026-10-06T08:05:00.000Z',
    });

    const retried = await repositories.outbox.findByIdempotencyKey('answer:answer-1');
    expect(retried?.attemptCount).toBe(1);
    expect(retried?.lastError).toBe('network unavailable');
    expect(retried?.status).toBe('pending');
    expect(await repositories.outbox.listReady('2026-10-06T08:04:59.000Z')).toEqual([]);
    expect(
      (await repositories.outbox.listReady('2026-10-06T08:05:00.000Z')).map((e) => e.id),
    ).toEqual([event.id]);

    await repositories.outbox.markSent(event.id);
    expect(await repositories.outbox.listReady(LATER)).toEqual([]);
    expect(await repositories.outbox.countByStatus()).toEqual({ pending: 0, sent: 1, dead: 0 });
  });

  it('moves an unrecoverable event to dead and keeps its error', async () => {
    const event = await repositories.outbox.enqueue(newEvent());
    await repositories.outbox.markDead(event.id, 'rejected by server: invalid payload');

    const dead = await repositories.outbox.findByIdempotencyKey('answer:answer-1');
    expect(dead?.status).toBe('dead');
    expect(dead?.lastError).toBe('rejected by server: invalid payload');
    expect(await repositories.outbox.listReady(LATER)).toEqual([]);
    expect(await repositories.outbox.countByStatus()).toEqual({ pending: 0, sent: 0, dead: 1 });
  });

  it('appends the event and the answer it describes in one transaction', async () => {
    await db.transaction(async (tx) => {
      await repositories.answers.record(answerRecord(), { transaction: tx });
      await repositories.outbox.enqueue(newEvent(), { transaction: tx });
    });

    expect(await repositories.answers.countAnswered('cse')).toBe(1);
    expect(await repositories.outbox.listAll()).toHaveLength(1);

    // A failing transaction leaves neither the answer nor the event behind.
    silenceLogs();
    try {
      await expect(
        db.transaction(async (tx) => {
          await repositories.answers.record(answerRecord({ id: 'answer-2', questionId: 'q2' }), {
            transaction: tx,
          });
          throw new Error('deliberate failure');
        }),
      ).rejects.toThrow('deliberate failure');
    } finally {
      restoreLogs();
    }
    expect(await repositories.answers.countAnswered('cse')).toBe(1);
    expect(await repositories.outbox.listAll()).toHaveLength(1);
  });

  it('stores sync state as durable key/value entries', async () => {
    expect(await repositories.syncState.get('cursor')).toBeNull();

    await repositories.syncState.set('cursor', '123', { updatedAt: NOW });
    await repositories.syncState.set('lastSyncAt', NOW, { updatedAt: NOW });

    expect(await repositories.syncState.get('cursor')).toBe('123');
    expect((await repositories.syncState.list()).map((entry) => entry.key)).toEqual([
      'cursor',
      'lastSyncAt',
    ]);

    await repositories.syncState.set('cursor', '456', { updatedAt: LATER });
    expect((await repositories.syncState.list()).find((e) => e.key === 'cursor')?.value).toBe(
      '456',
    );

    await repositories.syncState.remove('cursor');
    expect(await repositories.syncState.get('cursor')).toBeNull();
  });
});
