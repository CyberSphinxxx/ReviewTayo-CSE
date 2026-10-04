import { createLogger } from '@/services/logging/logger';
import { AppError, err, ok, type Result } from '@/domain/result';

import { examRegistry, type ExamRegistry } from './registry';
import type { ExamContentPack, RawContentPack } from './types';
import { formatValidationIssues, validateContentPack } from './validation';

const log = createLogger('content-bootstrap');

export interface BootstrapResult {
  readonly registered: readonly ExamContentPack[];
  readonly failed: readonly { readonly examId: string; readonly reason: string }[];
}

/**
 * Validates and registers bundled content packs.
 *
 * A pack that fails validation is reported and skipped rather than partially
 * loaded: half-imported content is worse than absent content, because it makes
 * mastery and review state reference questions that do not exist.
 */
export const registerBundledPacks = (
  packs: readonly RawContentPack[],
  registry: ExamRegistry = examRegistry,
): Result<BootstrapResult, AppError> => {
  const registered: ExamContentPack[] = [];
  const failed: { examId: string; reason: string }[] = [];

  for (const raw of packs) {
    const result = validateContentPack(raw);
    if (!result.ok || result.pack === null) {
      const reason = formatValidationIssues(
        result.issues.filter((issue) => issue.severity === 'error'),
      );
      log.error('content pack rejected', undefined, { reason });
      failed.push({ examId: readExamId(raw), reason });
      continue;
    }

    const registration = registry.register(result.pack);
    if (!registration.ok) {
      log.error('content pack registration failed', registration.error, {
        examId: result.pack.exam.id,
      });
      failed.push({ examId: result.pack.exam.id, reason: registration.error.message });
      continue;
    }

    registered.push(result.pack);
    log.info('content pack registered', {
      examId: result.pack.exam.id,
      contentVersion: result.pack.manifest.contentVersion,
      questions: result.pack.questions.length,
    });
  }

  if (registered.length === 0 && failed.length > 0) {
    return err(
      new AppError('validation', 'No content pack could be loaded.', {
        details: { failures: failed },
      }),
    );
  }

  return ok({ registered, failed });
};

const readExamId = (raw: RawContentPack): string => {
  if (typeof raw.manifest === 'object' && raw.manifest !== null) {
    const candidate = (raw.manifest as Record<string, unknown>).examId;
    if (typeof candidate === 'string') return candidate;
  }
  if (typeof raw.exam === 'object' && raw.exam !== null) {
    const candidate = (raw.exam as Record<string, unknown>).id;
    if (typeof candidate === 'string') return candidate;
  }
  return 'unknown';
};
