import { conceptsForSubject, subjectsForTrack } from '@/domain/exams';
import { masteryLevelFor } from '@/domain/exams/mastery';
import type { ExamRuleConfig, MasteryPolicy } from '@/domain/exams/types';

import { evidenceByConcept } from './continue-learning';
import type { ConceptEvidence, SubjectAccuracy, SubjectProgressRow } from './types';

/**
 * Subject progress.
 *
 * Learn's Subjects list answers "how far into this subject am I?" without inventing
 * a score. The bar is accuracy, because accuracy is the thing practice actually
 * moves; the line underneath names how many concepts have been mastered, and an
 * untouched subject says so rather than showing a confident zero percent.
 */

/** `62% accuracy · 1 of 6 mastered`, or that the subject has not been started. */
export const describeSubjectProgress = (input: {
  readonly conceptCount: number;
  readonly answered: number;
  readonly accuracy: number;
  readonly masteredCount: number;
}): string => {
  const concepts = `${input.conceptCount} ${input.conceptCount === 1 ? 'concept' : 'concepts'}`;
  if (input.answered <= 0) return `${concepts} · not started`;
  const percent = Math.round(input.accuracy * 100);
  return `${percent}% accuracy · ${input.masteredCount} of ${input.conceptCount} mastered`;
};

export const subjectProgressRows = (
  exam: ExamRuleConfig,
  trackId: string,
  accuracy: readonly SubjectAccuracy[],
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
): readonly SubjectProgressRow[] => {
  const accuracyBySubject = new Map(accuracy.map((row) => [row.subjectId, row]));
  const byConcept = evidenceByConcept(evidence);

  return subjectsForTrack(exam, trackId).map((subject) => {
    const concepts = conceptsForSubject(exam, subject.id);
    const row = accuracyBySubject.get(subject.id);
    const answered = row?.answered ?? 0;
    const correct = row?.correct ?? 0;
    const accuracyValue = answered > 0 ? correct / answered : 0;
    const masteredCount = concepts.filter((concept) => {
      const own = byConcept.get(concept.id);
      return own !== undefined && masteryLevelFor(own, policy) === 'Mastered';
    }).length;

    return {
      subjectId: subject.id,
      name: subject.name,
      shortName: subject.shortName,
      conceptCount: concepts.length,
      answered,
      correct,
      accuracy: accuracyValue,
      started: answered > 0,
      progress: accuracyValue,
      masteredCount,
      subtitle: describeSubjectProgress({
        conceptCount: concepts.length,
        answered,
        accuracy: accuracyValue,
        masteredCount,
      }),
    };
  });
};
