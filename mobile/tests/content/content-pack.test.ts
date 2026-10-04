import { bundledContentPacks, testContentPacks } from '@content/exams';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamContentPack } from '@/domain/exams/types';

/**
 * Content validation gate.
 *
 * Any invalid content fails the build here rather than reaching a learner. This suite
 * is also exposed as `npm run validate:content`, so a content change can be verified
 * on its own without running the full test suite.
 */

const allPacks = [...bundledContentPacks, ...testContentPacks];

describe('bundled content packs', () => {
  it.each(allPacks.map((pack) => [readExamId(pack), pack] as const))(
    '%s validates without errors',
    (_name, pack) => {
      const result = validateContentPack(pack);
      const errors = result.issues.filter((issue) => issue.severity === 'error');

      expect(errors).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );

  it.each(allPacks.map((pack) => [readExamId(pack), pack] as const))(
    '%s has no validation warnings either',
    (_name, pack) => {
      const result = validateContentPack(pack);
      const warnings = result.issues.filter((issue) => issue.severity === 'warning');

      expect(warnings).toEqual([]);
    },
  );
});

const validatedCse = (): ExamContentPack => {
  const pack = bundledContentPacks[0];
  if (pack === undefined) throw new Error('CSE pack is missing');
  const result = validateContentPack(pack);
  if (result.pack === null) throw new Error('CSE pack did not validate');
  return result.pack;
};

describe('CSE content', () => {
  const { exam, questions } = validatedCse();

  it('declares both Professional and Sub-Professional tracks', () => {
    expect(exam.tracks.map((track) => track.id).sort()).toEqual([
      'professional',
      'subprofessional',
    ]);
    expect(exam.defaultTrackId).toBe('professional');
  });

  it('switches Analytical Ability for Clerical Ability between tracks', () => {
    const professional = exam.tracks.find((track) => track.id === 'professional');
    const subProfessional = exam.tracks.find((track) => track.id === 'subprofessional');

    expect(professional?.subjectIds).toContain('analytical-ability');
    expect(professional?.subjectIds).not.toContain('clerical-ability');
    expect(subProfessional?.subjectIds).toContain('clerical-ability');
    expect(subProfessional?.subjectIds).not.toContain('analytical-ability');
  });

  it('uses the configured mock sizes rather than a hard-coded number', () => {
    const professional = exam.tracks.find((track) => track.id === 'professional');
    const subProfessional = exam.tracks.find((track) => track.id === 'subprofessional');

    expect(professional?.blueprintOverride?.totalItems).toBe(170);
    expect(subProfessional?.blueprintOverride?.totalItems).toBe(165);
  });

  it('gives every subject published questions in each track that examines it', () => {
    for (const track of exam.tracks) {
      for (const subjectId of track.subjectIds) {
        const count = questions.filter(
          (question) =>
            question.subjectId === subjectId &&
            question.trackIds.includes(track.id) &&
            question.status === 'published',
        ).length;
        expect({ track: track.id, subjectId, hasQuestions: count > 0 }).toMatchObject({
          hasQuestions: true,
        });
      }
    }
  });

  it('covers every concept with at least three published questions', () => {
    for (const concept of exam.concepts) {
      const count = questions.filter(
        (question) => question.conceptIds.includes(concept.id) && question.status === 'published',
      ).length;
      expect({ concept: concept.id, count: count >= 3 }).toMatchObject({ count: true });
    }
  });

  it('groups related questions so "Try another like this" always has an alternative', () => {
    const groups = new Map<string, number>();
    for (const question of questions) {
      if (question.relatedQuestionGroupId === undefined) continue;
      groups.set(
        question.relatedQuestionGroupId,
        (groups.get(question.relatedQuestionGroupId) ?? 0) + 1,
      );
    }
    const singletons = [...groups.entries()].filter(([, count]) => count < 2);
    expect(singletons).toEqual([]);
  });

  it('keeps every question id globally unique and traceable to its content version', () => {
    const ids = questions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(questions.every((question) => question.contentVersion.length > 0)).toBe(true);
  });

  it('provides an explanation for every question', () => {
    expect(questions.every((question) => question.explanation.trim().length > 10)).toBe(true);
  });
});

function readExamId(pack: (typeof allPacks)[number]): string {
  const exam = pack.exam as { id?: unknown };
  return typeof exam.id === 'string' ? exam.id : 'unknown-exam';
}
