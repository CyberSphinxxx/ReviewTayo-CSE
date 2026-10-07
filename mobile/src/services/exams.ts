import { examRegistry } from '@/domain/exams/registry';
import type { ExamRuleConfig } from '@/domain/exams/types';

/**
 * Active exam resolution.
 *
 * The app ships one exam today and the engine stays generic, so screens ask for
 * "the learner's exam" rather than for CSE. A stored profile wins; with no profile
 * yet (first launch) the first registered pack is used, which is also what a
 * multi-exam picker would replace later.
 */

export const activeExam = (examId?: string | null): ExamRuleConfig | null => {
  if (examId !== undefined && examId !== null && examId.length > 0) {
    return examRegistry.get(examId)?.config ?? null;
  }
  const [first] = examRegistry.list();
  return first ?? null;
};

/** Throws for callers that cannot proceed without an exam (tests and dev tools). */
export const requireActiveExam = (examId?: string | null): ExamRuleConfig => {
  const exam = activeExam(examId);
  if (exam === null) {
    throw new Error('No exam content is registered. Import a content pack before using exams.');
  }
  return exam;
};
