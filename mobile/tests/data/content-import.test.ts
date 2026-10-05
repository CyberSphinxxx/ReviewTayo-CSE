import { bootstrapLocalDatabase, importContentPack } from '@/data/local/content-import';
import { LATEST_SCHEMA_VERSION } from '@/data/local/migration-runner';
import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';
import type { ExamContentPack } from '@/domain/exams/types';

import { createMigratedDatabase } from '@tests/utils/database';
import { loadCsePack, loadFixturePack } from '@tests/utils/exam-fixtures';
import { restoreLogs, silenceLogs } from '@tests/utils/logs';

/**
 * Content import tests.
 *
 * They verify the promise the data layer makes to learners: bundled content is
 * queryable, re-importing unchanged content writes nothing, a version change
 * replaces content completely, and a broken pack can never leave half-stored
 * content behind.
 */
describe('content import', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  it('bootstrap migrates and imports a bundled pack exactly once', async () => {
    const pack = loadCsePack();
    const first = await bootstrapLocalDatabase(db, [pack]);

    expect(first.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(first.imports).toHaveLength(1);
    expect(first.imports[0]?.changed).toBe(true);
    expect(first.imports[0]?.questions).toBe(pack.questions.length);

    const stored = await repositories.content.getStoredExam(pack.exam.id);
    expect(stored).not.toBeNull();
    expect(stored?.questionCount).toBe(pack.questions.length);
    expect(stored?.contentVersion).toBe(pack.manifest.contentVersion);
    expect(await repositories.content.getMeta(`exam:${pack.exam.id}:contentVersion`)).toBe(
      pack.manifest.contentVersion,
    );

    // A second bootstrap on the same database must not rewrite content tables.
    const second = await bootstrapLocalDatabase(db, [pack]);
    expect(second.imports[0]?.changed).toBe(false);
  });

  it('stores subjects, concepts and questions that are queryable by filter', async () => {
    const pack = loadCsePack();
    await importContentPack(repositories, pack);

    const subjects = await repositories.content.listSubjects(pack.exam.id);
    expect(subjects.map((subject) => subject.id).sort()).toEqual(
      pack.exam.subjects.map((subject) => subject.id).sort(),
    );
    expect(await repositories.content.listConcepts(pack.exam.id)).toHaveLength(
      pack.exam.concepts.length,
    );

    const first = pack.questions[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    const fetched = await repositories.questions.getById(first.id);
    expect(fetched?.stem).toBe(first.stem);
    expect(fetched?.choices).toEqual(first.choices);

    const bySubject = await repositories.questions.countBySubject(pack.exam.id);
    expect(Object.values(bySubject).reduce((sum, count) => sum + count, 0)).toBe(
      pack.questions.length,
    );

    const verbal = await repositories.questions.listPublished({
      examId: pack.exam.id,
      subjectId: 'verbal-ability',
    });
    expect(verbal.length).toBeGreaterThan(0);
    expect(verbal.every((question) => question.subjectId === 'verbal-ability')).toBe(true);

    const professionalOnly = await repositories.questions.listPublished({
      examId: pack.exam.id,
      trackId: 'professional',
    });
    expect(professionalOnly.length).toBeGreaterThan(0);
  });

  it('returns questions in the requested order and omits unknown ids', async () => {
    const pack = loadCsePack();
    await importContentPack(repositories, pack);
    const [a, b, c] = pack.questions;
    expect(a && b && c).toBeTruthy();
    if (a === undefined || b === undefined || c === undefined) return;

    const fetched = await repositories.questions.getByIds([c.id, a.id, 'missing', b.id]);
    expect(fetched.map((question) => question.id)).toEqual([c.id, a.id, b.id]);
  });

  it('finds questions in the same related group, excluding the missed question', async () => {
    const pack = loadCsePack();
    await importContentPack(repositories, pack);
    const grouped = pack.questions.find(
      (question) => question.relatedQuestionGroupId !== undefined,
    );
    expect(grouped).toBeDefined();
    if (grouped?.relatedQuestionGroupId === undefined) return;

    const related = await repositories.questions.listByRelatedGroup(
      grouped.relatedQuestionGroupId,
      [grouped.id],
    );
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((question) => question.id !== grouped.id)).toBe(true);
    expect(
      related.every(
        (question) => question.relatedQuestionGroupId === grouped.relatedQuestionGroupId,
      ),
    ).toBe(true);
  });

  it('replaces content completely when the version changes', async () => {
    const pack = loadCsePack();
    await importContentPack(repositories, pack);

    const trimmed: ExamContentPack = {
      ...pack,
      manifest: { ...pack.manifest, contentVersion: '9.9.9-test' },
      questions: pack.questions.slice(0, 7),
    };
    const result = await importContentPack(repositories, trimmed);

    expect(result.changed).toBe(true);
    expect(await repositories.questions.countPublished({ examId: pack.exam.id })).toBe(7);
    expect(await repositories.content.getMeta(`exam:${pack.exam.id}:questionCount`)).toBe('7');
  });

  it('rolls back a replacement that fails halfway', async () => {
    silenceLogs();
    try {
      const pack = loadCsePack();
      await importContentPack(repositories, pack);
      const before = await repositories.questions.countPublished({ examId: pack.exam.id });

      // Duplicating a question id violates the primary key mid-transaction.
      const broken: ExamContentPack = {
        ...pack,
        questions: [...pack.questions, pack.questions[0] as (typeof pack.questions)[number]],
      };
      await expect(importContentPack(repositories, broken, { force: true })).rejects.toThrow(
        /Database operation failed/,
      );

      expect(await repositories.questions.countPublished({ examId: pack.exam.id })).toBe(before);
      expect(await repositories.content.getStoredExam(pack.exam.id)).not.toBeNull();
    } finally {
      restoreLogs();
    }
  });

  it('imports two different exams side by side', async () => {
    const cse = loadCsePack();
    const fixture = loadFixturePack();
    await importContentPack(repositories, cse);
    const cseCount = await repositories.questions.countPublished({ examId: cse.exam.id });

    await importContentPack(repositories, fixture);

    const stored = await repositories.content.listStoredExams();
    expect(stored.map((exam) => exam.examId).sort()).toEqual([cse.exam.id, fixture.exam.id].sort());
    expect(await repositories.questions.countPublished({ examId: cse.exam.id })).toBe(cseCount);
  });

  it('deletes an exam and all of its content', async () => {
    const pack = loadFixturePack();
    await importContentPack(repositories, pack);

    await repositories.content.deleteExam(pack.exam.id);

    expect(await repositories.content.getStoredExam(pack.exam.id)).toBeNull();
    expect(await repositories.questions.countPublished({ examId: pack.exam.id })).toBe(0);
    expect(await repositories.content.listSubjects(pack.exam.id)).toEqual([]);
  });
});
