import type { MasteryLevel } from '@/domain/exams/mastery';
import type { ConceptId, SubjectId } from '@/domain/exams/types';

/**
 * Learn shapes.
 *
 * Learn answers "what should I understand before I practise?" and reads only
 * committed state: the exam's own content, the learner's track, the answers they
 * have given and the mastery those answers imply. The stored records are
 * structurally larger than these, so a repository row can be passed straight in
 * while the domain stays free of the data layer.
 */

/** Mastery evidence for one concept, as Learn reads it. */
export interface ConceptEvidence {
  readonly conceptId: ConceptId;
  readonly correctCount: number;
  readonly wrongCount: number;
  readonly lastAnsweredAt: string | null;
}

/** Accuracy for one subject across every answer source. */
export interface SubjectAccuracy {
  readonly subjectId: SubjectId;
  readonly answered: number;
  readonly correct: number;
}

/** A concept as Learn presents it: named, and placed in its subject's lesson order. */
export interface LearnConcept {
  readonly conceptId: ConceptId;
  readonly subjectId: SubjectId;
  readonly name: string;
  readonly subjectName: string;
  /** The learner-facing summary; absent when the content does not supply one. */
  readonly summary: string | null;
  readonly tags: readonly string[];
  /** 1-based position within the subject's own lesson list. */
  readonly lessonNumber: number;
  readonly lessonCount: number;
}

/** The one thing Learn recommends doing next. */
export interface ContinueLearning {
  /** `resume` when the learner has already worked on the concept, `start` otherwise. */
  readonly kind: 'resume' | 'start';
  /** Section label: `Continue learning` or `Start here`. */
  readonly eyebrow: string;
  readonly concept: LearnConcept;
  readonly mastery: MasteryLevel;
  /** `Lesson 3 of 8`, the line under the concept name. */
  readonly lessonLine: string;
}

/** A short reference card: one concept's summary, readable in a couple of minutes. */
export interface QuickSheet {
  readonly conceptId: ConceptId;
  readonly label: string;
  readonly hint: string;
}

/** One subject's progress, as the Subjects list shows it. */
export interface SubjectProgressRow {
  readonly subjectId: SubjectId;
  readonly name: string;
  readonly shortName: string;
  readonly conceptCount: number;
  readonly answered: number;
  readonly correct: number;
  /** 0–1 accuracy across every answer source; `0` before the first answer. */
  readonly accuracy: number;
  /** False until the learner has answered at least one question on the subject. */
  readonly started: boolean;
  /** 0–1 bar value. Accuracy is the honest signal here: it is what practice moves. */
  readonly progress: number;
  readonly masteredCount: number;
  /** The supporting line: accuracy and mastery, or that the subject is untouched. */
  readonly subtitle: string;
}

/** One subject's entry in the Study Guides index. */
export interface StudyGuideSection {
  readonly subjectId: SubjectId;
  readonly name: string;
  readonly conceptCount: number;
  readonly masteredCount: number;
}

/** The Study Guides index as a whole. */
export interface StudyGuidesSummary {
  readonly sections: readonly StudyGuideSection[];
  readonly subjectCount: number;
  readonly conceptCount: number;
  readonly masteredCount: number;
  /** `4 subjects · 22 concepts`. */
  readonly line: string;
}
