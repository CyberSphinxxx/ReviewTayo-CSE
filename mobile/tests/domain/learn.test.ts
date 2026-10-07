import {
  conceptReference,
  continueLearning,
  CONTINUE_EYEBROW,
  describeLesson,
  QUICK_SHEET_HINT,
  QUICK_SHEET_LIMIT,
  quickSheets,
  START_EYEBROW,
  studyGuides,
  subjectProgressRows,
  guideSections,
  type ConceptEvidence,
} from '@/domain/learn';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Learn domain.
 *
 * Learn makes four claims and each one is derived here rather than rendered: which
 * concept to read next, which quick sheets to offer, how far into each subject the
 * learner is, and what the study guides contain. The CSE pack is used deliberately —
 * its two tracks examine different subjects, so track handling is exercised for real
 * instead of against a fixture that has one track.
 */

const { exam } = loadCsePack();
const policy = exam.studyPolicy.mastery;

const evidence = (
  conceptId: string,
  correctCount: number,
  wrongCount: number,
  lastAnsweredAt: string | null = null,
): ConceptEvidence => ({ conceptId, correctCount, wrongCount, lastAnsweredAt });

const ids = (rows: readonly { readonly conceptId: string }[]): string[] =>
  rows.map((row) => row.conceptId);

describe('continue learning', () => {
  it('starts a new learner at the first lesson of their track', () => {
    const next = continueLearning(exam, 'professional', [], policy);
    expect(next).not.toBeNull();
    if (next === null) return;

    expect(next.kind).toBe('start');
    expect(next.eyebrow).toBe(START_EYEBROW);
    expect(next.concept.conceptId).toBe('vocabulary');
    expect(next.concept.subjectName).toBe('Verbal Ability');
    expect(next.mastery).toBe('Learning');
    expect(next.lessonLine).toBe('Lesson 1 of 5');
  });

  it('resumes the concept the learner is partway through', () => {
    const next = continueLearning(
      exam,
      'professional',
      [evidence('sentence-completion', 2, 1, '2026-10-05T09:00:00.000Z')],
      policy,
    );
    expect(next).not.toBeNull();
    if (next === null) return;

    expect(next.kind).toBe('resume');
    expect(next.eyebrow).toBe(CONTINUE_EYEBROW);
    expect(next.concept.conceptId).toBe('sentence-completion');
    expect(next.concept.subjectName).toBe('Verbal Ability');
    // Two right and one wrong is Developing under the CSE thresholds, not Strong.
    expect(next.mastery).toBe('Developing');
    expect(next.lessonLine).toBe('Lesson 3 of 5');
  });

  it('picks the most recently answered concept when several are open', () => {
    const next = continueLearning(
      exam,
      'professional',
      [
        evidence('vocabulary', 1, 0, '2026-10-01T09:00:00.000Z'),
        evidence('grammar-and-usage', 3, 1, '2026-10-06T09:00:00.000Z'),
      ],
      policy,
    );
    expect(next?.concept.conceptId).toBe('grammar-and-usage');
  });

  it('does not chase a concept the learner has already mastered', () => {
    const next = continueLearning(
      exam,
      'professional',
      [evidence('vocabulary', 9, 0, '2026-10-06T09:00:00.000Z')],
      policy,
    );
    expect(next?.kind).toBe('start');
    // The first mastered lesson is skipped rather than recommended again.
    expect(next?.concept.conceptId).toBe('grammar-and-usage');
  });

  it('has nothing to recommend once every lesson is mastered', () => {
    const everything = exam.concepts.map((concept) => evidence(concept.id, 8, 0));
    expect(continueLearning(exam, 'professional', everything, policy)).toBeNull();
  });

  it('ignores a lesson that belongs to another track', () => {
    // Clerical Ability is examined by the Sub-Professional track only.
    const clerical = [evidence('alphabetizing-and-filing', 2, 0, '2026-10-06T09:00:00.000Z')];

    const professional = continueLearning(exam, 'professional', clerical, policy);
    expect(professional?.kind).toBe('start');
    expect(professional?.concept.conceptId).toBe('vocabulary');

    const subprofessional = continueLearning(exam, 'subprofessional', clerical, policy);
    expect(subprofessional?.kind).toBe('resume');
    expect(subprofessional?.concept.conceptId).toBe('alphabetizing-and-filing');
    expect(subprofessional?.concept.subjectName).toBe('Clerical Ability');
    expect(subprofessional?.lessonLine).toBe('Lesson 1 of 4');
  });

  it('falls back to the whole ladder when a track is unknown', () => {
    const next = continueLearning(exam, 'no-such-track', [], policy);
    expect(next?.concept.conceptId).toBe('vocabulary');
  });

  it('describes a lesson as its position in the subject', () => {
    const next = continueLearning(exam, 'professional', [evidence('word-problems', 1, 0)], policy);
    expect(next).not.toBeNull();
    if (next === null) return;

    expect(next.lessonLine).toBe(describeLesson(next.concept));
    expect(next.lessonLine).toBe('Lesson 5 of 5');
  });
});

describe('quick sheets', () => {
  it('offers one short card per subject in track order', () => {
    const sheets = quickSheets(exam, 'professional');
    expect(ids(sheets)).toEqual([
      'vocabulary',
      'basic-operations',
      'number-series',
      'philippine-constitution',
    ]);
    expect(sheets.every((sheet) => sheet.hint === QUICK_SHEET_HINT)).toBe(true);
    expect(sheets[0]?.label).toBe('Vocabulary');
  });

  it('follows the track the learner is on', () => {
    const sheets = ids(quickSheets(exam, 'subprofessional'));
    expect(sheets).toContain('alphabetizing-and-filing');
    expect(sheets).not.toContain('number-series');
  });

  it('stops at a scannable number of cards for an unknown track', () => {
    // An unknown track falls back to every subject the exam has. The row still has
    // to stay readable, so it is capped rather than growing without bound.
    const sheets = ids(quickSheets(exam, 'no-such-track'));
    expect(sheets).toHaveLength(QUICK_SHEET_LIMIT);
    expect(sheets).toContain('number-series');
    expect(sheets).toContain('alphabetizing-and-filing');
  });
});

describe('subject progress', () => {
  const accuracy = [
    { subjectId: 'verbal-ability', answered: 4, correct: 3 },
    { subjectId: 'clerical-ability', answered: 2, correct: 1 },
  ];

  it('measures each subject with the learner\u2019s own answers', () => {
    const rows = subjectProgressRows(exam, 'professional', accuracy, [], policy);
    expect(rows.map((row) => row.subjectId)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'analytical-ability',
      'general-information',
    ]);

    const verbal = rows[0];
    expect(verbal?.answered).toBe(4);
    expect(verbal?.accuracy).toBe(0.75);
    expect(verbal?.started).toBe(true);
    expect(verbal?.progress).toBe(0.75);
    expect(verbal?.conceptCount).toBe(5);
    expect(verbal?.subtitle).toBe('75% accuracy · 0 of 5 mastered');
  });

  it('says a subject is not started instead of showing a confident zero', () => {
    const rows = subjectProgressRows(exam, 'professional', accuracy, [], policy);
    const numerical = rows[1];
    expect(numerical?.started).toBe(false);
    expect(numerical?.progress).toBe(0);
    expect(numerical?.subtitle).toBe('5 concepts · not started');
  });

  it('counts mastery against the concepts the track actually examines', () => {
    const rows = subjectProgressRows(
      exam,
      'professional',
      accuracy,
      [evidence('vocabulary', 6, 0), evidence('percentages', 6, 0)],
      policy,
    );
    expect(rows[0]?.masteredCount).toBe(1);
    expect(rows[0]?.subtitle).toBe('75% accuracy · 1 of 5 mastered');
    // Percentages belongs to Numerical Ability, which has been answered for nothing.
    expect(rows[1]?.masteredCount).toBe(1);
  });

  it('shows the subjects of the track the learner is on', () => {
    const rows = subjectProgressRows(exam, 'subprofessional', accuracy, [], policy);
    expect(rows.map((row) => row.subjectId)).toContain('clerical-ability');
    expect(rows.map((row) => row.subjectId)).not.toContain('analytical-ability');
  });

  it('never reports an accuracy it cannot compute', () => {
    const rows = subjectProgressRows(
      exam,
      'professional',
      [{ subjectId: 'verbal-ability', answered: 0, correct: 0 }],
      [],
      policy,
    );
    expect(rows[0]?.accuracy).toBe(0);
    expect(rows[0]?.progress).toBe(0);
  });
});

describe('study guides', () => {
  it('indexes every subject of the track', () => {
    const guides = studyGuides(exam, 'subprofessional', [], policy);
    expect(guides.subjectCount).toBe(4);
    expect(guides.conceptCount).toBe(18);
    expect(guides.line).toBe('4 subjects · 18 concepts');
    expect(guides.sections.map((section) => section.subjectId)).toContain('clerical-ability');
  });

  it('counts mastered concepts per subject', () => {
    const guides = studyGuides(
      exam,
      'professional',
      [evidence('number-series', 6, 0), evidence('logical-deduction', 6, 0)],
      policy,
    );
    const analytical = guides.sections.find(
      (section) => section.subjectId === 'analytical-ability',
    );
    expect(analytical?.masteredCount).toBe(2);
    expect(analytical?.conceptCount).toBe(4);
    expect(guides.masteredCount).toBe(2);
  });

  it('lists lessons in order and marks what has been studied', () => {
    const sections = guideSections(
      exam,
      'professional',
      [evidence('sentence-completion', 2, 1, '2026-10-06T09:00:00.000Z')],
      policy,
      'verbal-ability',
    );
    expect(sections).toHaveLength(1);
    const concepts = sections[0]?.concepts ?? [];
    expect(concepts.map((row) => row.concept.conceptId)).toEqual([
      'vocabulary',
      'grammar-and-usage',
      'sentence-completion',
      'reading-comprehension',
      'analogy',
    ]);
    expect(concepts[0]?.started).toBe(false);
    expect(concepts[0]?.mastery).toBe('Learning');
    expect(concepts[2]?.started).toBe(true);
    expect(concepts[2]?.mastery).toBe('Developing');
  });

  it('returns the whole guide when no subject is named', () => {
    const sections = guideSections(exam, 'professional', [], policy);
    expect(sections).toHaveLength(4);
    expect(sections.map((section) => section.name)).toEqual([
      'Verbal Ability',
      'Numerical Ability',
      'Analytical Ability',
      'General Information',
    ]);
  });

  it('has an empty guide for an unknown subject', () => {
    expect(guideSections(exam, 'professional', [], policy, 'nope')).toHaveLength(0);
  });
});

describe('concept reference', () => {
  it('describes a concept with its own content', () => {
    const reference = conceptReference(exam, 'sentence-completion', [], policy);
    expect(reference?.concept.name).toBe('Sentence Completion');
    expect(reference?.concept.subjectName).toBe('Verbal Ability');
    expect(reference?.concept.summary).toContain('signal words');
    expect(reference?.concept.tags).toContain('context-clues');
    expect(reference?.concept.lessonNumber).toBe(3);
    expect(reference?.started).toBe(false);
    expect(reference?.evidence).toBeNull();
  });

  it('carries the learner\u2019s own record when there is one', () => {
    const reference = conceptReference(
      exam,
      'reading-comprehension',
      [evidence('reading-comprehension', 6, 0)],
      policy,
    );
    expect(reference?.mastery).toBe('Mastered');
    expect(reference?.started).toBe(true);
    expect(reference?.evidence?.correctCount).toBe(6);
  });

  it('is null for a concept this exam does not have', () => {
    expect(conceptReference(exam, 'not-a-concept', [], policy)).toBeNull();
  });
});
