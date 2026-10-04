import type { RawContentPack } from '@/domain/exams/types';

import exam from './exam.json';
import manifest from './manifest.json';
import questions from './questions.json';

/**
 * Architecture fixture exam.
 *
 * A deliberately non-CSE exam (library cataloguing and reference service) that
 * proves the engine is generic: it registers, resolves subjects and concepts, and
 * runs the shared quiz and blueprint code without any CSE change. It is used by
 * tests only and never shown to learners.
 */
export const fixtureContentPack: RawContentPack = {
  manifest,
  exam,
  subjects: exam.subjects,
  concepts: exam.concepts,
  tracks: { default: exam.tracks[0] },
  questions,
};
