import { useEffect, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  conceptReference,
  guideSections,
  type ConceptReference,
  type GuideSection,
} from '@/domain/learn';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';

/**
 * Reference models.
 *
 * The two screens behind Learn — a subject's guide and one concept's page — read
 * the same committed state as Learn itself. They load once per id rather than on
 * focus: nothing they show can change while they are open.
 */

export type ReferenceStatus = 'loading' | 'ready' | 'error';

export interface ReferenceModel {
  readonly status: ReferenceStatus;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly trackId: string;
  readonly sections: readonly GuideSection[];
  readonly reference: ConceptReference | null;
}

export const useReference = (
  repositories: Repositories,
  ids: { readonly subjectId?: string; readonly conceptId?: string },
): ReferenceModel => {
  const [status, setStatus] = useState<ReferenceStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [trackId, setTrackId] = useState('');
  const [sections, setSections] = useState<readonly GuideSection[]>([]);
  const [reference, setReference] = useState<ConceptReference | null>(null);

  const { conceptId, subjectId } = ids;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profile = await repositories.profile.get();
        const resolved = activeExam(profile?.examId);
        if (resolved === null) {
          throw new Error('No exam content is available yet.');
        }
        const resolvedTrack = profile?.trackId ?? resolved.defaultTrackId;
        const evidence = await repositories.mastery.listByExam(resolved.id);
        const policy = resolved.studyPolicy.mastery;
        if (cancelled) return;

        setExam(resolved);
        setTrackId(resolvedTrack);
        setSections(guideSections(resolved, resolvedTrack, evidence, policy, subjectId));
        setReference(
          conceptId === undefined ? null : conceptReference(resolved, conceptId, evidence, policy),
        );
        setError(null);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(toAppError(cause, 'Could not load this reference.'));
        setStatus('error');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [conceptId, repositories, subjectId]);

  return { status, error, exam, trackId, sections, reference };
};
