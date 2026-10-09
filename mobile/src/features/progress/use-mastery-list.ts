import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import { loadConceptMastery, type ConceptMasteryList } from '@/services/progress';

/**
 * Concept mastery list model.
 *
 * The one drill-down behind Progress: every concept in the track, weakest first, or
 * one subject's concepts when the list was opened from that subject's row. It reads
 * the same mastery the Progress screen just summarised, so the number in the header
 * and the rows underneath it are always the same read.
 */

export type MasteryListStatus = 'loading' | 'ready' | 'error';

export interface MasteryListModel {
  readonly status: MasteryListStatus;
  readonly error: AppError | null;
  readonly list: ConceptMasteryList | null;
  readonly reload: () => void;
}

export const useConceptMastery = (
  repositories: Repositories,
  subjectId?: string,
): MasteryListModel => {
  const [status, setStatus] = useState<MasteryListStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [list, setList] = useState<ConceptMasteryList | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }

      setList(
        await loadConceptMastery({
          repositories,
          exam,
          trackId: profile?.trackId ?? exam.defaultTrackId,
          ...(subjectId === undefined ? {} : { subjectId }),
        }),
      );
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load concept mastery.'));
      setStatus('error');
    }
  }, [repositories, subjectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    status,
    error,
    list,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
