import type { DatabasePort } from '@/data/local/database-port';
import { runMigrations } from '@/data/local/migration-runner';
import { createLocalRepositories } from '@/data/local/repositories';
import type { Repositories } from '@/data/repositories';
import type { ExamContentPack } from '@/domain/exams/types';
import { createLogger } from '@/services/logging/logger';

const log = createLogger('content-import');

export interface ContentImportOptions {
  /** Re-imports even when the stored version matches. Used by developer tools. */
  readonly force?: boolean;
  readonly importedAt?: string;
}

export interface ContentImportResult {
  readonly examId: string;
  readonly contentVersion: string;
  /** False when the stored content was already current and nothing was written. */
  readonly changed: boolean;
  readonly questions: number;
  readonly subjects: number;
  readonly concepts: number;
  readonly importedAt: string;
}

export interface LocalDatabaseBootstrapResult {
  readonly schemaVersion: number;
  readonly imports: readonly ContentImportResult[];
}

const metaKey = (examId: string, field: string): string => `exam:${examId}:${field}`;

/**
 * Imports one validated content pack.
 *
 * Re-importing an unchanged pack is a no-op, so startup never rewrites content
 * tables. A changed pack is replaced atomically; a pack that fails to write
 * leaves the previous content — and all learner history — exactly as it was.
 */
export const importContentPack = async (
  repositories: Repositories,
  pack: ExamContentPack,
  options: ContentImportOptions = {},
): Promise<ContentImportResult> => {
  const importedAt = options.importedAt ?? new Date().toISOString();
  const examId = pack.exam.id;
  const contentVersion = pack.manifest.contentVersion;
  const existing = await repositories.content.getStoredExam(examId);

  if (!options.force && existing !== null && existing.contentVersion === contentVersion) {
    log.info('content already current', { examId, contentVersion });
    return {
      examId,
      contentVersion,
      changed: false,
      questions: existing.questionCount,
      subjects: pack.exam.subjects.length,
      concepts: pack.exam.concepts.length,
      importedAt: existing.importedAt,
    };
  }

  await repositories.content.replaceExam(pack, { importedAt });
  await repositories.content.setMeta(metaKey(examId, 'contentVersion'), contentVersion, {
    updatedAt: importedAt,
  });
  await repositories.content.setMeta(metaKey(examId, 'importedAt'), importedAt, {
    updatedAt: importedAt,
  });
  await repositories.content.setMeta(
    metaKey(examId, 'questionCount'),
    String(pack.questions.length),
    {
      updatedAt: importedAt,
    },
  );

  log.info('content imported', {
    examId,
    contentVersion,
    questions: pack.questions.length,
  });

  return {
    examId,
    contentVersion,
    changed: true,
    questions: pack.questions.length,
    subjects: pack.exam.subjects.length,
    concepts: pack.exam.concepts.length,
    importedAt,
  };
};

/**
 * Prepares the local database for use: migrates it, then imports every validated
 * bundled pack. Called once at startup, before any learner data is written.
 */
export const bootstrapLocalDatabase = async (
  database: DatabasePort,
  packs: readonly ExamContentPack[],
  options: { repositories?: Repositories; force?: boolean } = {},
): Promise<LocalDatabaseBootstrapResult> => {
  const repositories = options.repositories ?? createLocalRepositories(database);
  const migration = await runMigrations(database);

  const imports: ContentImportResult[] = [];
  for (const pack of packs) {
    imports.push(await importContentPack(repositories, pack, { force: options.force }));
  }

  log.info('local database ready', {
    schemaVersion: migration.toVersion,
    exams: imports.map((entry) => entry.examId),
  });

  return { schemaVersion: migration.toVersion, imports };
};
