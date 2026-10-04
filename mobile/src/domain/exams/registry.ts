import { AppError, err, ok, type Result } from '@/domain/result';

import { resolveExamPhase, journeyTimeline, type ExamPhase } from './journey';
import type { ExamContentPack, ExamId, ExamRuleConfig, Question, SubjectId } from './types';

/**
 * Exam registry.
 *
 * The single lookup point for exam configuration. Generic services receive a
 * resolved `ExamRuleConfig`; they never branch on an exam id themselves, which is
 * what keeps a new exam a content change rather than a code change.
 */

export interface RegisteredExam {
  readonly config: ExamRuleConfig;
  readonly questions: readonly Question[];
  readonly contentVersion: string;
}

export class ExamRegistry {
  private readonly exams = new Map<ExamId, RegisteredExam>();

  /**
   * Registers an exam. Duplicate ids are rejected rather than overwritten: a
   * silent overwrite would make a content mistake indistinguishable from a code
   * mistake at runtime.
   */
  register(pack: ExamContentPack): Result<RegisteredExam> {
    const { exam } = pack;
    if (this.exams.has(exam.id)) {
      return err(
        new AppError('conflict', `Exam "${exam.id}" is already registered.`, {
          details: { examId: exam.id },
        }),
      );
    }

    const registered: RegisteredExam = {
      config: exam,
      questions: pack.questions,
      contentVersion: pack.manifest.contentVersion,
    };
    this.exams.set(exam.id, registered);
    return ok(registered);
  }

  /** Replaces an existing registration; used when applying a newer content pack. */
  replace(pack: ExamContentPack): Result<RegisteredExam> {
    const registered: RegisteredExam = {
      config: pack.exam,
      questions: pack.questions,
      contentVersion: pack.manifest.contentVersion,
    };
    this.exams.set(pack.exam.id, registered);
    return ok(registered);
  }

  has(examId: ExamId): boolean {
    return this.exams.has(examId);
  }

  get(examId: ExamId): RegisteredExam | null {
    return this.exams.get(examId) ?? null;
  }

  require(examId: ExamId): RegisteredExam {
    const exam = this.exams.get(examId);
    if (exam === undefined) {
      throw new AppError('not_found', `Exam "${examId}" is not registered.`, {
        details: { examId },
      });
    }
    return exam;
  }

  list(): readonly ExamRuleConfig[] {
    return [...this.exams.values()].map((entry) => entry.config);
  }

  clear(): void {
    this.exams.clear();
  }
}

/** Process-wide registry; the composition root registers bundled content into it. */
export const examRegistry = new ExamRegistry();

/** Convenience helpers that read the active exam config. */

export const getTrack = (exam: ExamRuleConfig, trackId: string) =>
  exam.tracks.find((track) => track.id === trackId) ?? null;

export const getSubject = (exam: ExamRuleConfig, subjectId: SubjectId) =>
  exam.subjects.find((subject) => subject.id === subjectId) ?? null;

export const getConcept = (exam: ExamRuleConfig, conceptId: string) =>
  exam.concepts.find((concept) => concept.id === conceptId) ?? null;

/** Subjects in presentation order for a track. */
export const subjectsForTrack = (exam: ExamRuleConfig, trackId: string) => {
  const track = getTrack(exam, trackId);
  if (track === null) return exam.subjects.slice().sort((a, b) => a.order - b.order);
  const order = new Map(track.subjectIds.map((id, index) => [id, index]));
  return exam.subjects
    .filter((subject) => order.has(subject.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
};

export const conceptsForSubject = (exam: ExamRuleConfig, subjectId: SubjectId) => {
  const subject = getSubject(exam, subjectId);
  if (subject === null) return [];
  const order = new Map(subject.conceptIds.map((id, index) => [id, index]));
  return exam.concepts
    .filter((concept) => concept.subjectId === subjectId)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
};

/** Questions that belong to a subject inside a track of this exam. */
export const questionsForSubject = (
  exam: ExamRuleConfig,
  questions: readonly Question[],
  subjectId: SubjectId,
  trackId: string,
): readonly Question[] =>
  questions.filter(
    (question) =>
      question.examId === exam.id &&
      question.subjectId === subjectId &&
      question.trackIds.includes(trackId) &&
      question.status === 'published',
  );

export const phaseFor = (
  exam: ExamRuleConfig,
  examDate: string | null,
  now: Date = new Date(),
): ExamPhase => resolveExamPhase(exam, examDate, now);

export { journeyTimeline };
