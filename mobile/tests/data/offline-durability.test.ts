import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { importContentPack } from '@/data/local/content-import';
import type { DatabasePort } from '@/data/local/database-port';
import { LATEST_SCHEMA_VERSION, runMigrations } from '@/data/local/migration-runner';
import { createLocalRepositories } from '@/data/local/repositories';
import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { AnswerRecord, PracticeSessionRecord, Repositories } from '@/data/repositories';

import { loadFixturePack } from '@tests/utils/exam-fixtures';

/**
 * Offline durability tests.
 *
 * These use a file-backed database and reopen it, which is the only way to prove
 * the promise that matters on a commuter train: closing the app mid-session and
 * relaunching with no network keeps the learner exactly where they were.
 */

const NOW = '2026-10-06T08:00:00.000Z';

interface Launch {
  readonly db: DatabasePort;
  readonly repositories: Repositories;
}

const launch = async (location: string): Promise<Launch> => {
  const db = await openNodeDatabase({ location });
  const repositories = createLocalRepositories(db);
  await runMigrations(db);
  return { db, repositories };
};

describe('offline durability', () => {
  let directory: string;
  let location: string;
  let examId: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'reviewtayo-test-'));
    location = join(directory, 'reviewtayo.db');
    examId = loadFixturePack().exam.id;
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('keeps an unfinished session and its answers across a restart', async () => {
    const session: PracticeSessionRecord = {
      id: 'session-1',
      examId,
      trackId: 'fixture-track',
      mode: 'smart-drill',
      status: 'in-progress',
      requestedCount: 2,
      correctCount: 1,
      startedAt: NOW,
      updatedAt: NOW,
      completedAt: null,
      durationSeconds: 90,
      timeLimitSeconds: null,
      timeRemainingSeconds: null,
    };
    const answer: AnswerRecord = {
      id: 'answer-1',
      sessionId: 'session-1',
      questionId: 'q1',
      examId,
      subjectId: 'subject-a',
      conceptIds: ['concept-a'],
      chosenChoiceId: 'a',
      correctChoiceId: 'a',
      isCorrect: true,
      source: 'practice',
      answeredAt: NOW,
      timeSpentSeconds: 30,
    };

    const first = await launch(location);
    await importContentPack(first.repositories, loadFixturePack());
    await first.repositories.practice.create(session, ['q1', 'q2']);
    await first.repositories.answers.record(answer);
    await first.repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: { questionId: 'q1' },
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW,
    });
    await first.db.close();

    const second = await launch(location);
    const migration = await runMigrations(second.db);
    expect(migration.fromVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(migration.applied).toEqual([]);

    const resumed = await second.repositories.practice.findResumable(examId);
    expect(resumed?.id).toBe('session-1');
    expect(resumed?.correctCount).toBe(1);
    expect(await second.repositories.practice.listQuestions('session-1')).toHaveLength(2);
    expect(await second.repositories.answers.countAnswered(examId)).toBe(1);
    expect(await second.repositories.outbox.listReady('2026-10-06T08:00:00.000Z')).toHaveLength(1);
    expect(
      (await second.repositories.content.getStoredExam(examId))?.questionCount,
    ).toBeGreaterThan(0);

    await second.db.close();
  });

  it('does not rewrite unchanged content on a later launch', async () => {
    const first = await launch(location);
    const importResult = await importContentPack(first.repositories, loadFixturePack(), {
      importedAt: NOW,
    });
    expect(importResult.changed).toBe(true);
    await first.db.close();

    const second = await launch(location);
    const again = await importContentPack(second.repositories, loadFixturePack());
    expect(again.changed).toBe(false);
    expect(again.importedAt).toBe(NOW);
    expect((await second.repositories.content.getStoredExam(examId))?.importedAt).toBe(NOW);
    await second.db.close();
  });

  it('delivers a retried outbox event exactly once across restarts', async () => {
    const first = await launch(location);
    const event = await first.repositories.outbox.enqueue({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      payload: { questionId: 'q1' },
      idempotencyKey: 'answer:answer-1',
      occurredAt: NOW,
    });
    await first.repositories.outbox.markRetry(event.id, {
      error: 'offline',
      nextAttemptAt: '2026-10-06T08:05:00.000Z',
    });
    await first.db.close();

    const second = await launch(location);
    const ready = await second.repositories.outbox.listReady('2026-10-06T08:06:00.000Z');
    expect(ready.map((entry) => entry.id)).toEqual([event.id]);
    await second.repositories.outbox.markSent(ready[0]?.id ?? '');
    await second.db.close();

    const third = await launch(location);
    expect(await third.repositories.outbox.listReady('2026-10-07T00:00:00.000Z')).toEqual([]);
    expect(await third.repositories.outbox.listAll()).toHaveLength(1);
    expect(await third.repositories.outbox.countByStatus()).toEqual({
      pending: 0,
      sent: 1,
      dead: 0,
    });
    await third.db.close();
  });
});
