import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import {
  LATEST_SCHEMA_VERSION,
  getSchemaVersion,
  migrations,
  runMigrations,
  type Migration,
} from '@/data/local/migration-runner';
import type { DatabasePort } from '@/data/local/database-port';

import { restoreLogs, silenceLogs } from '@tests/utils/logs';

/**
 * Migration tests.
 *
 * These run against a real SQLite engine, so they verify what actually matters: that
 * study history survives an upgrade, that a failed migration cannot leave a
 * half-applied schema behind, and that a newer database is never silently downgraded.
 */

const tableNames = async (db: DatabasePort): Promise<string[]> => {
  const rows = await db.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return rows.map((row) => row.name);
};

describe('fresh install', () => {
  let db: DatabasePort;

  beforeEach(async () => {
    db = await openNodeDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('applies every migration and records the schema version', async () => {
    const result = await runMigrations(db);

    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(result.applied).toHaveLength(migrations.length);
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
  });

  it('creates the expected tables', async () => {
    await runMigrations(db);

    expect(await tableNames(db)).toEqual(
      expect.arrayContaining([
        'content_exams',
        'content_subjects',
        'content_concepts',
        'content_questions',
        'content_question_tracks',
        'content_question_concepts',
        'user_exam_profile',
        'app_settings',
        'practice_sessions',
        'practice_session_questions',
        'answers',
        'concept_mastery',
        'review_items',
        'saved_questions',
        'study_plans',
        'study_tasks',
        'mock_sessions',
        'mock_answers',
        'activity_days',
        'sync_outbox',
        'sync_state',
        'content_meta',
        'schema_meta',
      ]),
    );
  });

  it('creates the schema_meta row exactly once', async () => {
    await runMigrations(db);
    await runMigrations(db);

    const rows = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM schema_meta');
    expect(rows[0]?.count).toBe(1);
  });

  it('is idempotent when run again', async () => {
    await runMigrations(db);
    const second = await runMigrations(db);

    expect(second.applied).toEqual([]);
    expect(second.toVersion).toBe(LATEST_SCHEMA_VERSION);
  });
});

describe('upgrade path', () => {
  const versionTwo: Migration = {
    version: 2,
    name: 'test-add-note-column',
    statements: [`ALTER TABLE saved_questions ADD COLUMN note TEXT`],
  };
  const versionThree: Migration = {
    version: 3,
    name: 'test-add-note-index',
    statements: [`CREATE INDEX idx_saved_questions_note ON saved_questions(note)`],
  };

  let db: DatabasePort;

  beforeEach(async () => {
    db = await openNodeDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('preserves existing study history across an upgrade', async () => {
    await runMigrations(db, { all: [migrations[0] as Migration] });

    await db.execute(
      `INSERT INTO saved_questions (question_id, exam_id, saved_at) VALUES (?, ?, ?)`,
      ['cse-verbal-vocabulary-01', 'cse', '2026-10-01T08:00:00.000Z'],
    );
    await db.execute(
      `INSERT INTO concept_mastery (concept_id, exam_id, correct_count, wrong_count, level, streak, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['vocabulary', 'cse', 4, 1, 2, 3, '2026-10-01T08:00:00.000Z'],
    );

    const result = await runMigrations(db, { all: [migrations[0] as Migration, versionTwo] });

    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);

    const saved = await db.query<{ question_id: string }>(
      'SELECT question_id FROM saved_questions',
    );
    const mastery = await db.query<{ correct_count: number; streak: number }>(
      'SELECT correct_count, streak FROM concept_mastery',
    );

    expect(saved[0]?.question_id).toBe('cse-verbal-vocabulary-01');
    expect(mastery[0]).toMatchObject({ correct_count: 4, streak: 3 });
  });

  it('applies several pending migrations in order', async () => {
    await runMigrations(db, { all: [migrations[0] as Migration] });
    const result = await runMigrations(db, {
      all: [migrations[0] as Migration, versionTwo, versionThree],
    });

    expect(result.applied).toEqual(['2:test-add-note-column', '3:test-add-note-index']);
    expect(await getSchemaVersion(db)).toBe(3);
  });

  it('can stop at a target version for staged rollouts', async () => {
    const result = await runMigrations(db, {
      all: [migrations[0] as Migration, versionTwo, versionThree],
      targetVersion: 2,
    });

    expect(result.toVersion).toBe(2);
  });
});

describe('failure handling', () => {
  let db: DatabasePort;

  beforeEach(async () => {
    silenceLogs();
    db = await openNodeDatabase();
  });

  afterEach(async () => {
    restoreLogs();
    await db.close();
  });

  it('rolls back a failed migration and keeps the previous version', async () => {
    await runMigrations(db, { all: [migrations[0] as Migration] });

    const broken: Migration = {
      version: 2,
      name: 'broken',
      statements: [`CREATE TABLE should_not_exist (id TEXT PRIMARY KEY)`, `THIS IS NOT VALID SQL`],
    };

    await expect(runMigrations(db, { all: [migrations[0] as Migration, broken] })).rejects.toThrow(
      /broken/,
    );

    expect(await getSchemaVersion(db)).toBe(1);
    const names = await tableNames(db);
    expect(names).not.toContain('should_not_exist');
  });

  it('refuses to downgrade a newer database instead of guessing', async () => {
    await runMigrations(db, {
      all: [migrations[0] as Migration, { version: 2, name: 'v2', statements: ['SELECT 1'] }],
    });

    await expect(runMigrations(db, { all: [migrations[0] as Migration] })).rejects.toThrow(
      /newer than this app supports/,
    );
  });
});

describe('schema constraints', () => {
  let db: DatabasePort;

  beforeEach(async () => {
    db = await openNodeDatabase();
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it('enforces foreign keys on content tables', async () => {
    await expect(
      db.execute(
        `INSERT INTO content_subjects (id, exam_id, display_order, payload) VALUES (?, ?, ?, ?)`,
        ['verbal-ability', 'missing-exam', 1, '{}'],
      ),
    ).rejects.toThrow(/foreign key/i);
  });

  it('cascades content deletion from the exam down', async () => {
    await db.execute(
      `INSERT INTO content_exams (id, version, content_version, short_name, payload, imported_at)
       VALUES ('cse', 1, '1.0.0', 'CSE', '{}', '2026-10-05T00:00:00.000Z')`,
    );
    await db.execute(
      `INSERT INTO content_questions (id, exam_id, subject_id, difficulty, status, content_version, payload)
       VALUES ('q1', 'cse', 'verbal-ability', 'easy', 'published', '1.0.0', '{}')`,
    );
    await db.execute(
      `INSERT INTO content_question_tracks (question_id, track_id, exam_id) VALUES ('q1', 'professional', 'cse')`,
    );

    await db.execute(`DELETE FROM content_exams WHERE id = 'cse'`);

    const questions = await db.query('SELECT id FROM content_questions');
    const tracks = await db.query('SELECT question_id FROM content_question_tracks');
    expect(questions).toEqual([]);
    expect(tracks).toEqual([]);
  });

  it('allows only one answer per session and question', async () => {
    const insertAnswer = (id: string) =>
      db.execute(
        `INSERT INTO answers (id, session_id, question_id, exam_id, subject_id, concept_ids,
           chosen_choice_id, correct_choice_id, is_correct, source, answered_at)
         VALUES (?, 's1', 'q1', 'cse', 'verbal-ability', '["vocabulary"]', 'a', 'b', 0, 'practice', ?)`,
        [id, '2026-10-05T00:00:00.000Z'],
      );

    await insertAnswer('a1');
    await expect(insertAnswer('a2')).rejects.toThrow(/unique/i);
  });

  it('allows the same question in different sessions', async () => {
    const insertAnswer = (id: string, sessionId: string | null) =>
      db.execute(
        `INSERT INTO answers (id, session_id, question_id, exam_id, subject_id, concept_ids,
           chosen_choice_id, correct_choice_id, is_correct, source, answered_at)
         VALUES (?, ?, 'q1', 'cse', 'verbal-ability', '["vocabulary"]', 'a', 'b', 0, 'practice', ?)`,
        [id, sessionId, '2026-10-05T00:00:00.000Z'],
      );

    await insertAnswer('a1', 's1');
    await insertAnswer('a2', 's2');
    await insertAnswer('a3', null);
    await insertAnswer('a4', null);

    const rows = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM answers');
    expect(rows[0]?.count).toBe(4);
  });

  it('keeps one review item per concept and per question', async () => {
    const insertReview = (id: string, conceptId: string, questionId: string | null) =>
      db.execute(
        `INSERT INTO review_items (id, exam_id, concept_id, question_id, source, due_at,
           interval_days, created_at, updated_at)
         VALUES (?, 'cse', ?, ?, 'mistake', '2026-10-06T00:00:00.000Z', 1, ?, ?)`,
        [id, conceptId, questionId, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z'],
      );

    await insertReview('r1', 'vocabulary', 'cse-verbal-vocabulary-01');
    await insertReview('r2', 'vocabulary', 'cse-verbal-vocabulary-02');
    await insertReview('r3', 'vocabulary', null);

    await expect(insertReview('r4', 'vocabulary', null)).rejects.toThrow(/unique/i);
    await expect(insertReview('r5', 'vocabulary', 'cse-verbal-vocabulary-01')).rejects.toThrow(
      /unique/i,
    );
  });

  it('commits a transaction and rolls back a failing one', async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO app_settings (id, theme_preference, text_size, reminder_time, updated_at)
         VALUES (1, 'device', 'standard', '19:00', ?)`,
        ['2026-10-05T00:00:00.000Z'],
      );
    });

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(`UPDATE app_settings SET theme_preference = 'dark' WHERE id = 1`);
        throw new Error('deliberate failure');
      }),
    ).rejects.toThrow('deliberate failure');

    const rows = await db.query<{ theme_preference: string }>(
      'SELECT theme_preference FROM app_settings WHERE id = 1',
    );
    expect(rows[0]?.theme_preference).toBe('device');
  });
});
