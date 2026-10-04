import type { RawContentPack } from '@/domain/exams/types';

import concepts from './concepts.json';
import exam from './exam.json';
import manifest from './manifest.json';
import analytical from './questions/analytical.json';
import clerical from './questions/clerical.json';
import generalInformation from './questions/general-information.json';
import numerical from './questions/numerical.json';
import verbal from './questions/verbal.json';
import subjects from './subjects.json';
import professional from './tracks/professional.json';
import subprofessional from './tracks/subprofessional.json';

/**
 * Bundled CSE content pack.
 *
 * The pack ships inside the app so a fresh install is useful with no network at
 * all — a study app that needs to download before it can be used is not offline
 * first. The manifest carries `contentVersion`, so a newer remote pack can
 * supersede this one later without an app release.
 */
export const cseContentPack: RawContentPack = {
  manifest,
  exam,
  subjects,
  concepts,
  tracks: {
    professional,
    subprofessional,
  },
  questions: [...verbal, ...numerical, ...analytical, ...clerical, ...generalInformation],
};
