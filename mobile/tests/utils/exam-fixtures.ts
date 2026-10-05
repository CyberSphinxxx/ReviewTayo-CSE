import { cseContentPack, fixtureContentPack } from '@content/exams';
import { validateContentPack } from '@/domain/exams/validation';
import type { ExamContentPack, RawContentPack } from '@/domain/exams/types';

/**
 * Exam test fixtures.
 *
 * Deep-clones a known-good pack so negative validation tests can break exactly one
 * thing at a time and assert the specific issue code that results.
 */

export type MutablePack = {
  manifest: Record<string, unknown>;
  exam: Record<string, unknown>;
  subjects: unknown;
  concepts: unknown;
  tracks: Record<string, unknown>;
  questions: unknown[];
};

/**
 * Deep-clones the fixture pack and normalises it to a single source of truth:
 * subjects, concepts and tracks live only at pack level, exactly as the bundled CSE
 * pack does. Tests can then mutate one array and be certain it is the one the
 * validator reads.
 */
export const clonePack = (): MutablePack => {
  const cloned = JSON.parse(JSON.stringify(fixtureContentPack)) as MutablePack;
  delete cloned.exam.subjects;
  delete cloned.exam.concepts;
  delete cloned.exam.tracks;
  return cloned;
};

export const asRawPack = (pack: MutablePack): RawContentPack => pack as unknown as RawContentPack;

export const loadPack = (raw: RawContentPack): ExamContentPack => {
  const result = validateContentPack(raw);
  if (!result.ok || result.pack === null) {
    throw new Error(`Pack is invalid:\n${JSON.stringify(result.issues, null, 2)}`);
  }
  return result.pack;
};

export const loadFixturePack = (): ExamContentPack => loadPack(fixtureContentPack);

export const loadCsePack = (): ExamContentPack => loadPack(cseContentPack);

/**
 * Deterministic pseudo-random generator (mulberry32) so session planning tests
 * assert stable behaviour rather than occasionally flaky output.
 */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** Always returns the first candidate, for predictable selection in tests. */
export const noShuffleRandom = (): number => 0.999999;
