import { conceptsForSubject, subjectsForTrack } from '@/domain/exams';
import { masteryLevelFor } from '@/domain/exams/mastery';
import type { ExamRuleConfig, MasteryPolicy } from '@/domain/exams/types';

import { evidenceByConcept } from './continue-learning';
import type { ConceptEvidence, QuickSheet, StudyGuideSection, StudyGuidesSummary } from './types';

/**
 * Quick Sheets and Study Guides.
 *
 * Both are the same material read at different depths, and both come from the
 * exam's own concepts rather than from a separate hand-written corpus — a new exam
 * gets reference content the moment its concepts exist, and no reference text can
 * drift away from the questions it explains.
 *
 * - Quick Sheets are the one-line version: one card per subject.
 * - Study Guides are the full index: every subject, with how much of it is mastered.
 */

export const QUICK_SHEET_HINT = '2 min read';
/** Enough cards to scan in one glance; the Subjects list below carries the rest. */
export const QUICK_SHEET_LIMIT = 4;

export const quickSheets = (exam: ExamRuleConfig, trackId: string): readonly QuickSheet[] =>
  subjectsForTrack(exam, trackId)
    .map((subject) => conceptsForSubject(exam, subject.id)[0])
    .filter((concept) => concept !== undefined)
    .slice(0, QUICK_SHEET_LIMIT)
    .map((concept) => ({
      conceptId: concept.id,
      label: concept.name,
      hint: QUICK_SHEET_HINT,
    }));

/** `4 subjects · 22 concepts`. */
export const describeStudyGuides = (summary: StudyGuidesSummary): string =>
  `${summary.subjectCount} ${summary.subjectCount === 1 ? 'subject' : 'subjects'} · ${
    summary.conceptCount
  } ${summary.conceptCount === 1 ? 'concept' : 'concepts'}`;

export const studyGuides = (
  exam: ExamRuleConfig,
  trackId: string,
  evidence: readonly ConceptEvidence[],
  policy: MasteryPolicy,
): StudyGuidesSummary => {
  const byConcept = evidenceByConcept(evidence);

  const sections: readonly StudyGuideSection[] = subjectsForTrack(exam, trackId).map((subject) => {
    const concepts = conceptsForSubject(exam, subject.id);
    const masteredCount = concepts.filter((concept) => {
      const own = byConcept.get(concept.id);
      return own !== undefined && masteryLevelFor(own, policy) === 'Mastered';
    }).length;
    return {
      subjectId: subject.id,
      name: subject.name,
      conceptCount: concepts.length,
      masteredCount,
    };
  });

  const summary: StudyGuidesSummary = {
    sections,
    subjectCount: sections.length,
    conceptCount: sections.reduce((total, section) => total + section.conceptCount, 0),
    masteredCount: sections.reduce((total, section) => total + section.masteredCount, 0),
    line: '',
  };
  return { ...summary, line: describeStudyGuides(summary) };
};
