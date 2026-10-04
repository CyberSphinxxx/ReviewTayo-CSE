import { bundledContentPacks } from '@content/exams';
import {
  ExamRegistry,
  conceptsForSubject,
  questionsForSubject,
  subjectsForTrack,
} from '@/domain/exams/registry';
import { registerBundledPacks } from '@/domain/exams/bootstrap';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamContentPack } from '@/domain/exams/types';

import { loadFixturePack } from '@tests/utils/exam-fixtures';
import { restoreLogs, silenceLogs } from '@tests/utils/logs';

/** Exam registry behaviour, including rejection of duplicate registrations. */

/** A pack that must fail validation: unsupported schema version. */
const brokenPack = (): (typeof bundledContentPacks)[number] => ({
  manifest: { examId: 'broken', schemaVersion: 99, contentVersion: '1.0.0' },
  exam: { id: 'broken' },
  subjects: [],
  concepts: [],
  tracks: {},
  questions: [],
});

const loadCsePack = (): ExamContentPack => {
  const pack = bundledContentPacks[0];
  if (pack === undefined) throw new Error('CSE content pack missing');
  const result = validateContentPack(pack);
  if (result.pack === null) throw new Error('CSE pack failed validation');
  return result.pack;
};

describe('ExamRegistry', () => {
  it('registers a valid pack and exposes it by id', () => {
    const registry = new ExamRegistry();
    const result = registry.register(loadFixturePack());

    expect(result.ok).toBe(true);
    expect(registry.has('fixture-exam')).toBe(true);
    expect(registry.get('fixture-exam')?.config.name).toBe('Architecture Fixture Exam');
  });

  it('rejects a duplicate registration instead of silently replacing it', () => {
    const registry = new ExamRegistry();
    registry.register(loadFixturePack());

    const second = registry.register(loadFixturePack());

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('conflict');
      expect(second.error.message).toContain('already registered');
    }
    expect(registry.list()).toHaveLength(1);
  });

  it('allows an intentional replacement when content is updated', () => {
    const registry = new ExamRegistry();
    registry.register(loadFixturePack());

    const replaced = registry.replace(loadFixturePack());

    expect(replaced.ok).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });

  it('returns null for an unknown exam and throws only when explicitly required', () => {
    const registry = new ExamRegistry();

    expect(registry.get('nope')).toBeNull();
    expect(() => registry.require('nope')).toThrow(/not registered/);
  });

  it('lists registered exams', () => {
    const registry = new ExamRegistry();
    registry.register(loadFixturePack());
    registry.register(loadCsePack());

    expect(
      registry
        .list()
        .map((exam) => exam.id)
        .sort(),
    ).toEqual(['cse', 'fixture-exam']);
  });

  it('supports clearing for a clean test or sign-out state', () => {
    const registry = new ExamRegistry();
    registry.register(loadFixturePack());
    registry.clear();

    expect(registry.list()).toEqual([]);
  });
});

describe('registerBundledPacks', () => {
  afterEach(() => {
    restoreLogs();
  });

  it('registers every bundled pack and reports nothing as failed', () => {
    const registry = new ExamRegistry();
    const result = registerBundledPacks(bundledContentPacks, registry);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.failed).toEqual([]);
      expect(result.value.registered.map((pack) => pack.exam.id)).toEqual(['cse']);
    }
  });

  it('fails loudly when no pack can be loaded', () => {
    silenceLogs();
    const registry = new ExamRegistry();

    const result = registerBundledPacks([brokenPack()], registry);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('validation');
  });

  it('loads what it can and reports the packs it could not load', () => {
    silenceLogs();
    const registry = new ExamRegistry();

    const result = registerBundledPacks([...bundledContentPacks, brokenPack()], registry);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.registered).toHaveLength(1);
      expect(result.value.failed).toHaveLength(1);
    }
  });
});

describe('exam lookups are config-driven', () => {
  const { exam, questions } = loadCsePack();

  it('orders subjects by the track, not by hard-coded names', () => {
    expect(subjectsForTrack(exam, 'professional').map((subject) => subject.id)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'analytical-ability',
      'general-information',
    ]);
    expect(subjectsForTrack(exam, 'subprofessional').map((subject) => subject.id)).toEqual([
      'verbal-ability',
      'numerical-ability',
      'clerical-ability',
      'general-information',
    ]);
  });

  it('returns concepts in declared order for a subject', () => {
    expect(conceptsForSubject(exam, 'numerical-ability').map((concept) => concept.id)).toEqual([
      'basic-operations',
      'fractions-and-decimals',
      'percentages',
      'ratio-and-proportion',
      'word-problems',
    ]);
  });

  it('filters questions by track so Clerical never appears for Professional', () => {
    const professionalClerical = questionsForSubject(
      exam,
      questions,
      'clerical-ability',
      'professional',
    );
    const subProfessionalClerical = questionsForSubject(
      exam,
      questions,
      'clerical-ability',
      'subprofessional',
    );

    expect(professionalClerical).toEqual([]);
    expect(subProfessionalClerical.length).toBeGreaterThan(0);
  });

  it('excludes retired questions from subject queries', () => {
    const published = questionsForSubject(exam, questions, 'verbal-ability', 'professional');
    const first = published[0];
    if (first === undefined) throw new Error('expected published vocabulary questions');

    const withRetired = questionsForSubject(
      exam,
      [...questions, { ...first, id: 'retired-q', status: 'retired' }],
      'verbal-ability',
      'professional',
    );

    expect(withRetired.length).toBe(published.length);
  });

  it('ignores questions belonging to a different exam', () => {
    const first = questions[0];
    if (first === undefined) throw new Error('expected questions');

    const foreign = { ...first, id: 'foreign-q', examId: 'some-other-exam' };
    const result = questionsForSubject(
      exam,
      [...questions, foreign],
      first.subjectId,
      'professional',
    );

    expect(result.some((question) => question.id === 'foreign-q')).toBe(false);
  });
});
