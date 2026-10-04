import { validateContentPack } from '@/domain/exams/validation';

import { asRawPack, clonePack } from '@tests/utils/exam-fixtures';

/**
 * Negative validation tests.
 *
 * Each case breaks exactly one thing and asserts the specific issue code that results,
 * so the validator stays a reliable gate rather than a vague "invalid content" alarm.
 */

const codesFor = (pack: ReturnType<typeof clonePack>): readonly string[] =>
  validateContentPack(asRawPack(pack)).issues.map((issue) => issue.code);

const errorPathsFor = (pack: ReturnType<typeof clonePack>): readonly string[] =>
  validateContentPack(asRawPack(pack))
    .issues.filter((issue) => issue.severity === 'error')
    .map((issue) => issue.path);

describe('content pack validation', () => {
  it('accepts an untouched valid pack', () => {
    const result = validateContentPack(asRawPack(clonePack()));
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a duplicate concept id', () => {
    const pack = clonePack();
    const concepts = pack.concepts as Record<string, unknown>[];
    concepts.push({ ...concepts[0] });

    expect(codesFor(pack)).toContain('duplicate-id');
    expect(errorPathsFor(pack)).toContain('exam.concepts');
  });

  it('rejects a duplicate question id', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[1] = { ...questions[0] };

    expect(codesFor(pack)).toContain('duplicate-id');
  });

  it('rejects an unknown subject reference in a track', () => {
    const pack = clonePack();
    pack.tracks.default = {
      ...(pack.tracks.default as Record<string, unknown>),
      subjectIds: ['cataloguing', 'does-not-exist'],
    };

    expect(codesFor(pack)).toContain('missing-reference');
    expect(errorPathsFor(pack)).toContain('exam.tracks.default.subjectIds');
  });

  it('rejects a blueprint section pointing at an unknown subject', () => {
    const pack = clonePack();
    pack.exam.blueprint = {
      sections: [{ subjectId: 'ghost-subject', questionCount: 5 }],
      totalItems: 5,
    };

    expect(codesFor(pack)).toContain('missing-reference');
  });

  it('rejects a question whose correct choice does not exist', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], correctChoiceId: 'z' };

    expect(codesFor(pack)).toContain('answer-not-found');
  });

  it('rejects a question filed under a subject the track does not examine', () => {
    const pack = clonePack();
    const subjects = pack.subjects as Record<string, unknown>[];
    const concepts = pack.concepts as Record<string, unknown>[];

    subjects.push({
      id: 'extra-subject',
      name: 'Extra Subject',
      shortName: 'Extra',
      order: 9,
      conceptIds: ['extra-concept'],
    });
    concepts.push({ id: 'extra-concept', subjectId: 'extra-subject', name: 'Extra', tags: [] });

    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = {
      ...questions[0],
      subjectId: 'extra-subject',
      conceptIds: ['extra-concept'],
    };

    expect(codesFor(pack)).toContain('track-subject-mismatch');
  });

  it('rejects a question that references an unknown concept', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], conceptIds: ['missing-concept'] };

    expect(codesFor(pack)).toContain('missing-reference');
    expect(errorPathsFor(pack)).toContain('questions.fixture-cat-01.conceptIds');
  });

  it('rejects a question whose concept belongs to another subject', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], conceptIds: ['reference-interview'] };

    expect(codesFor(pack)).toContain('missing-reference');
  });

  it('rejects a question with no concept', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], conceptIds: [] };

    expect(codesFor(pack)).toContain('empty-collection');
  });

  it('rejects an unsupported schema version', () => {
    const pack = clonePack();
    pack.manifest = { ...pack.manifest, schemaVersion: 99 };

    expect(codesFor(pack)).toContain('schema-version-mismatch');
  });

  it('rejects a manifest that targets a different exam', () => {
    const pack = clonePack();
    pack.manifest = { ...pack.manifest, examId: 'some-other-exam' };

    expect(codesFor(pack)).toContain('manifest-mismatch');
  });

  it('rejects an invalid difficulty value', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], difficulty: 'impossible' };

    expect(codesFor(pack)).toContain('invalid-enum');
  });

  it('rejects a question with a single choice', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    const choices = questions[0]?.choices as Record<string, unknown>[];
    questions[0] = { ...questions[0], choices: [choices[0]] };

    expect(codesFor(pack)).toContain('empty-collection');
  });

  it('rejects mastery thresholds that do not increase', () => {
    const pack = clonePack();
    const studyPolicy = pack.exam.studyPolicy as Record<string, unknown>;
    studyPolicy.mastery = {
      levelCount: 4,
      developingThreshold: 0.8,
      strongThreshold: 0.6,
      masteredThreshold: 0.9,
      correctDelta: 1,
      wrongDelta: 1,
    };

    expect(codesFor(pack)).toContain('out-of-range');
  });

  it('rejects journey phases that share a horizon', () => {
    const pack = clonePack();
    const studyPolicy = pack.exam.studyPolicy as Record<string, unknown>;
    studyPolicy.journeyPhases = [
      { id: 'a', name: 'A', minDaysRemaining: 10, description: 'first' },
      { id: 'b', name: 'B', minDaysRemaining: 10, description: 'second' },
    ];

    expect(codesFor(pack)).toContain('duplicate-id');
  });

  it('rejects a blueprint total larger than the sum of its sections', () => {
    const pack = clonePack();
    pack.exam.blueprint = {
      sections: [{ subjectId: 'cataloguing', questionCount: 3 }],
      totalItems: 50,
    };

    expect(codesFor(pack)).toContain('invalid-blueprint');
  });

  it('rejects an empty subject list', () => {
    const pack = clonePack();
    pack.subjects = [];
    pack.concepts = [];

    expect(codesFor(pack)).toContain('empty-collection');
  });

  it('warns when a related-question group has only one member', () => {
    const pack = clonePack();
    const questions = pack.questions as Record<string, unknown>[];
    questions[0] = { ...questions[0], relatedQuestionGroupId: 'lonely-group' };

    const result = validateContentPack(asRawPack(pack));
    const warnings = result.issues.filter((issue) => issue.severity === 'warning');

    expect(warnings.map((issue) => issue.code)).toContain('orphan-question');
    expect(result.ok).toBe(true);
  });

  it('never returns a pack when an error is present', () => {
    const pack = clonePack();
    pack.manifest = { ...pack.manifest, examId: 'mismatch' };

    expect(validateContentPack(asRawPack(pack)).pack).toBeNull();
  });
});
