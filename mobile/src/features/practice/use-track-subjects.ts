import { useEffect, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { subjectsForTrack } from '@/domain/exams';
import type { ExamRuleConfig, SubjectDefinition } from '@/domain/exams/types';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';

/**
 * Subject picker.
 *
 * The two screens that ask the learner to choose: Build a Quiz and Practice by
 * Subject. Both need the same two things — the track's subjects in order, and how
 * much content each one actually has — so a subject with no questions is never
 * offered as a starting point.
 */

export type SubjectPickerStatus = 'loading' | 'ready' | 'error';

export interface TrackSubject {
  readonly subject: SubjectDefinition;
  readonly questionCount: number;
}

export interface TrackSubjectsModel {
  readonly status: SubjectPickerStatus;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly trackId: string;
  readonly subjects: readonly TrackSubject[];
  /** The exam's own default session size, used as the initial length. */
  readonly defaultCount: number;
}

export const useTrackSubjects = (repositories: Repositories): TrackSubjectsModel => {
  const [status, setStatus] = useState<SubjectPickerStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [trackId, setTrackId] = useState('');
  const [subjects, setSubjects] = useState<readonly TrackSubject[]>([]);
  const [defaultCount, setDefaultCount] = useState(10);

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
        const counts = await repositories.questions.countBySubject(resolved.id, {
          trackId: resolvedTrack,
        });
        if (cancelled) return;

        setExam(resolved);
        setTrackId(resolvedTrack);
        setSubjects(
          subjectsForTrack(resolved, resolvedTrack).map((subject) => ({
            subject,
            questionCount: counts[subject.id] ?? 0,
          })),
        );
        setDefaultCount(Math.max(1, resolved.studyPolicy.drillSize));
        setError(null);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(toAppError(cause, 'Could not load your subjects.'));
        setStatus('error');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  return { status, error, exam, trackId, subjects, defaultCount };
};
