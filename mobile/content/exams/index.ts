import { cseContentPack } from './cse';
import { fixtureContentPack } from './fixture-exam';
import type { RawContentPack } from '@/domain/exams/types';

/** Packs shipped inside the app and registered at startup. */
export const bundledContentPacks: readonly RawContentPack[] = [cseContentPack];

/** Test-only packs. Deliberately excluded from the bundle path above. */
export const testContentPacks: readonly RawContentPack[] = [fixtureContentPack];

export { cseContentPack, fixtureContentPack };
