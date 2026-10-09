import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import type { ApiFailure, ApiRequest, ApiTransport } from '@/data/remote';
import { err, ok, type Result } from '@/domain/result';
import { DEFAULT_BACKOFF } from '@/domain/sync';
import type { Question } from '@/domain/exams/types';
import { loadCsePack } from '@tests/utils/exam-fixtures';
import { createMigratedDatabase } from '@tests/utils/database';
import { importContentPack } from '@/data/local/content-import';
import { submitAnswer } from '@/services/practice';
import { saveAppSettings } from '@/services/app-settings';
import { removeSavedQuestion, saveQuestion } from '@/services/saved-questions';
import { SYNC_STATE_KEYS, loadSyncOverview, syncNow } from '@/services/sync';

/**
 * The outbox worker.
 *
 * Every rule the sync engine claims is exercised here against a real database: a
 * local write appends its event in the same transaction, a delivery failure backs
 * off instead of hammering, an event that cannot be delivered is left dead with its
 * reason, a long offline stretch drains in one pass, and nothing about a failed
 * sync can touch the learner's work.
 */

const NOW = new Date(2026, 9, 10, 9, 0, 0);
const LATER = new Date(2026, 9, 10, 10, 0, 0);
const pack = loadCsePack();
const exam = pack.exam;
const TRACK = 'professional';

const acceptedReply = (id: string): Result<unknown, ApiFailure> =>
  ok({ accepted: [id], rejected: [], serverTime: NOW.toISOString() });

const failure = (
  message: string,
  retryable: boolean,
  code: ApiFailure['code'] = 'network',
): ApiFailure => ({ message, status: retryable ? 503 : 400, retryable, code });

interface FakeTransport extends ApiTransport {
  readonly requests: ApiRequest[];
}

const fakeTransport = (
  options: {
    readonly available?: boolean;
    readonly isRemote?: boolean;
    readonly reply?: (request: ApiRequest, index: number) => Result<unknown, ApiFailure>;
  } = {},
): FakeTransport => {
  const requests: ApiRequest[] = [];
  return {
    name: 'fake',
    isRemote: options.isRemote ?? true,
    requests,
    isAvailable: async () => options.available ?? true,
    send: async (request) => {
      const index = requests.length;
      requests.push(request);
      return options.reply === undefined ? acceptedReply('unknown') : options.reply(request, index);
    },
  };
};

describe('sync worker', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  /** Imports the real bank and returns its first question on the Professional track. */
  const seed = async (): Promise<Question> => {
    await importContentPack(repositories, pack);
    const questions = await repositories.questions.listPublished({
      examId: exam.id,
      trackId: TRACK,
    });
    const question = questions[0];
    if (question === undefined) throw new Error('no questions');
    return question;
  };

  it('appends an answer event in the same transaction as the answer', async () => {
    const question = await seed();
    const chosenChoiceId = question.correctChoiceId;
    const questionId = question.id;

    const submitted = await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId,
      dailyGoal: 10,
      now: NOW,
    });
    expect(submitted.correct).toBe(true);

    const events = await repositories.outbox.listAll();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'answer.recorded',
      entityType: 'answer',
      status: 'pending',
      attemptCount: 0,
    });
    expect(events[0]?.idempotencyKey).toBe(`answer:${events[0]?.entityId ?? ''}`);
    expect(events[0]?.payload).toMatchObject({
      questionId,
      isCorrect: true,
      source: 'daily-question',
    });
  });

  it('appends settings and saved-question events from their own write sites', async () => {
    const question = await seed();
    const questionId = question.id;

    await saveAppSettings(repositories, { themePreference: 'dark' }, { now: NOW });
    await saveQuestion({ repositories, examId: exam.id, questionId, now: NOW });
    await removeSavedQuestion({ repositories, examId: exam.id, questionId, now: LATER });

    const events = await repositories.outbox.listAll();
    expect(events.map((event) => event.eventType)).toEqual([
      'settings.updated',
      'saved-question.saved',
      'saved-question.removed',
    ]);
    expect(events[0]?.idempotencyKey).toBe(`settings:${NOW.toISOString()}`);
    expect(events[1]?.idempotencyKey).toBe(`saved-question:${questionId}:${NOW.toISOString()}`);
    expect(events[2]?.idempotencyKey).toBe(`saved-question:${questionId}:${LATER.toISOString()}`);
  });

  it('leaves the outbox untouched when no backend is configured', async () => {
    const question = await seed();
    const chosenChoiceId = question.correctChoiceId;
    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId,
      dailyGoal: 0,
      now: NOW,
    });

    const transport = fakeTransport({ available: false, isRemote: false });
    const summary = await syncNow({ repositories, transport, now: NOW });

    expect(summary).toMatchObject({ status: 'offline', attempted: 0, pending: 1 });
    expect(summary.message).toContain('No backend is configured');
    expect(transport.requests).toHaveLength(0);

    const event = (await repositories.outbox.listAll())[0];
    expect(event?.attemptCount).toBe(0);
    expect(event?.status).toBe('pending');
  });

  it('marks a delivered event sent and records when it happened', async () => {
    await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: { questionId: 'q1' },
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({
      reply: () => acceptedReply('event-1'),
    });
    const summary = await syncNow({
      repositories,
      transport,
      actorId: 'device-1',
      now: NOW,
      random: () => 1,
    });

    expect(summary).toMatchObject({ status: 'synced', attempted: 1, sent: 1, pending: 0 });
    expect(summary.message).toBe('1 change synced.');
    expect(await repositories.syncState.get(SYNC_STATE_KEYS.lastSyncedAt)).toBe(NOW.toISOString());
    expect(await repositories.syncState.get(SYNC_STATE_KEYS.lastError)).toBeNull();

    // The request carried the event's key and the account it belongs to.
    expect(transport.requests[0]?.idempotencyKey).toBe('answer:answer-1');
    expect(transport.requests[0]?.body).toMatchObject({
      contractVersion: 1,
      data: { deviceId: 'device-1' },
    });
  });

  it('backs a retryable failure off instead of retrying it immediately', async () => {
    const event = await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({
      reply: () => err(failure('Could not reach the server.', true)),
    });
    const summary = await syncNow({ repositories, transport, now: NOW, random: () => 1 });

    expect(summary).toMatchObject({
      status: 'retrying',
      attempted: 1,
      sent: 0,
      retried: 1,
      dead: 0,
    });
    expect(summary.message).toBe('1 of 1 changes will be tried again.');
    expect(summary.nextAttemptAt).not.toBeNull();

    const stored = await repositories.outbox.findByIdempotencyKey('answer:answer-1');
    expect(stored?.attemptCount).toBe(1);
    expect(stored?.status).toBe('pending');
    expect(stored?.lastError).toBe('Could not reach the server.');
    expect((stored?.nextAttemptAt ?? '') > NOW.toISOString()).toBe(true);
    expect(DEFAULT_BACKOFF.maxAttempts).toBeGreaterThan(1);

    // Nothing is due yet, so a second pass does not touch the server.
    const before = transport.requests.length;
    const second = await syncNow({ repositories, transport, now: NOW });
    expect(second.attempted).toBe(0);
    expect(transport.requests.length).toBe(before);
    expect((await repositories.outbox.findByIdempotencyKey('answer:answer-1'))?.attemptCount).toBe(
      1,
    );
    expect(event.id).toBe(stored?.id);
  });

  it('delivers a retry once its backoff has elapsed, with the same key', async () => {
    await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({
      reply: (_request, index) =>
        index === 0 ? err(failure('offline', true)) : acceptedReply('event-1'),
    });

    await syncNow({ repositories, transport, now: NOW, random: () => 1 });
    const later = new Date(NOW.getTime() + 20 * 60_000);
    const summary = await syncNow({ repositories, transport, now: later, random: () => 1 });

    expect(summary).toMatchObject({ status: 'synced', sent: 1, retried: 0, pending: 0 });
    expect(transport.requests.map((request) => request.idempotencyKey)).toEqual([
      'answer:answer-1',
      'answer:answer-1',
    ]);
  });

  it('leaves an event dead, with its reason, when the failure is permanent', async () => {
    await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({
      reply: () => err(failure('The server rejected this change.', false, 'validation')),
    });
    const summary = await syncNow({ repositories, transport, now: NOW });

    expect(summary).toMatchObject({ status: 'failed', attempted: 1, sent: 0, dead: 1, pending: 0 });
    const stored = await repositories.outbox.findByIdempotencyKey('answer:answer-1');
    expect(stored?.status).toBe('dead');
    expect(stored?.lastError).toBe('The server rejected this change.');
    expect(await repositories.syncState.get(SYNC_STATE_KEYS.lastError)).toBe(
      'The server rejected this change.',
    );
  });

  it('abandons an event that has run out of attempts', async () => {
    const event = await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });
    await repositories.outbox.markRetry(event.id, {
      error: 'still offline',
      nextAttemptAt: NOW.toISOString(),
    });
    await repositories.outbox.markRetry(event.id, {
      error: 'still offline',
      nextAttemptAt: NOW.toISOString(),
    });

    const transport = fakeTransport({ reply: () => err(failure('still offline', true)) });
    const summary = await syncNow({
      repositories,
      transport,
      now: NOW,
      backoff: { ...DEFAULT_BACKOFF, maxAttempts: 3 },
    });

    expect(summary).toMatchObject({ status: 'failed', dead: 1, retried: 0 });
    expect((await repositories.outbox.findByIdempotencyKey('answer:answer-1'))?.status).toBe(
      'dead',
    );
  });

  it('treats a server rejection as final and keeps the server’s reason', async () => {
    await repositories.outbox.enqueue({
      id: 'event-1',
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({
      reply: () =>
        ok({
          accepted: [],
          rejected: [{ id: 'event-1', reason: 'unknown question' }],
          serverTime: NOW.toISOString(),
        }),
    });
    const summary = await syncNow({ repositories, transport, now: NOW });

    expect(summary).toMatchObject({ status: 'failed', dead: 1 });
    expect((await repositories.outbox.findByIdempotencyKey('answer:answer-1'))?.lastError).toBe(
      'unknown question',
    );
  });

  it('treats an unreadable response as final rather than retrying blind', async () => {
    await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const transport = fakeTransport({ reply: () => ok({ what: 'is this' }) });
    const summary = await syncNow({ repositories, transport, now: NOW });

    expect(summary).toMatchObject({ status: 'failed', dead: 1 });
  });

  it('drains a long offline stretch in one pass when the network returns', async () => {
    for (const index of [1, 2, 3]) {
      await repositories.outbox.enqueue({
        eventType: 'answer.recorded',
        entityType: 'answer',
        entityId: `answer-${index}`,
        payload: { index },
        idempotencyKey: `answer:answer-${index}`,
        occurredAt: new Date(NOW.getTime() + index * 1000).toISOString(),
      });
    }

    const offline = fakeTransport({ available: false });
    const whileOffline = await syncNow({ repositories, transport: offline, now: NOW });
    expect(whileOffline).toMatchObject({ status: 'offline', pending: 3 });
    expect(offline.requests).toHaveLength(0);

    const online = fakeTransport({
      reply: (request) => acceptedReply(request.idempotencyKey ?? 'event'),
    });
    const recovered = await syncNow({ repositories, transport: online, now: LATER });

    expect(recovered).toMatchObject({ status: 'synced', attempted: 3, sent: 3, pending: 0 });
    expect(online.requests).toHaveLength(3);
    expect(online.requests.map((request) => request.idempotencyKey)).toEqual([
      'answer:answer-1',
      'answer:answer-2',
      'answer:answer-3',
    ]);
  });

  it('never lets a failing sync interfere with the learner’s work', async () => {
    const question = await seed();
    const chosenChoiceId = question.correctChoiceId;

    await submitAnswer({
      repositories,
      exam,
      question,
      sessionId: null,
      chosenChoiceId,
      dailyGoal: 0,
      now: NOW,
    });
    expect(await repositories.answers.countAnswered(exam.id)).toBe(1);

    const throwing: ApiTransport = {
      name: 'throwing',
      isRemote: true,
      isAvailable: async () => true,
      send: async () => {
        throw new Error('the transport itself broke');
      },
    };
    const summary = await syncNow({ repositories, transport: throwing, now: NOW });

    expect(summary.status).toBe('failed');
    expect(summary.message).toContain('Your work is safe');
    expect(await repositories.answers.countAnswered(exam.id)).toBe(1);
    expect((await repositories.outbox.listAll())[0]?.status).toBe('pending');
  });

  it('reports what is waiting and whether this device can sync at all', async () => {
    const local = fakeTransport({ available: false, isRemote: false });
    await repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: {},
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW.toISOString(),
    });

    const localOverview = await loadSyncOverview({ repositories, transport: local });
    expect(localOverview).toMatchObject({
      available: false,
      pending: 1,
      pendingLine: '1 change waiting',
      line: 'Saved on this device',
    });
    expect(localOverview.retryNote).toContain('Retries for up to');

    const online = fakeTransport({ reply: () => acceptedReply('event-1') });
    await syncNow({ repositories, transport: online, now: NOW });

    const syncedOverview = await loadSyncOverview({ repositories, transport: online });
    expect(syncedOverview).toMatchObject({ pendingLine: 'Nothing waiting', line: 'Up to date' });
    expect(syncedOverview.lastSyncedAt).toBe(NOW.toISOString());
  });
});
