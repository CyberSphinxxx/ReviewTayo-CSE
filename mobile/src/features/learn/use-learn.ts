import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  continueLearning,
  quickSheets,
  studyGuides,
  subjectProgressRows,
  type ContinueLearning,
  type QuickSheet,
  type StudyGuidesSummary,
  type SubjectProgressRow,
} from '@/domain/learn';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';

/**
 * Learn model.
 *
 * Learn answers "what should I understand next?". It reads committed state only —
 * the exam's content, the learner's track, the answers they have given and the
 * mastery those imply — and reloads whenever the tab regains focus, so switching
 * track in Settings or finishing a drill is reflected the next time it is opened.
 */

export type LearnStatus = 'loading' | 'ready' | 'error';

export const LEARN_EYEBROW = 'Learn';
export const LEARN_TITLE = 'Understand it first.';

export interface LearnModel {
  readonly status: LearnStatus;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly trackId: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly continue: ContinueLearning | null;
  readonly sheets: readonly QuickSheet[];
  readonly subjects: readonly SubjectProgressRow[];
  readonly guides: StudyGuidesSummary | null;
  readonly reload: () => void;
}

export const useLearn = (repositories: Repositories): LearnModel => {
  const [status, setStatus] = useState<LearnStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [trackId, setTrackId] = useState('');
  const [next, setNext] = useState<ContinueLearning | null>(null);
  const [sheets, setSheets] = useState<readonly QuickSheet[]>([]);
  const [subjects, setSubjects] = useState<readonly SubjectProgressRow[]>([]);
  const [guides, setGuides] = useState<StudyGuidesSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await repositories.profile.get();
      const resolved = activeExam(profile?.examId);
      if (resolved === null) {
        throw new Error('No exam content is available yet.');
      }

      const resolvedTrack = profile?.trackId ?? resolved.defaultTrackId;
      const [evidence, accuracy] = await Promise.all([
        repositories.mastery.listByExam(resolved.id),
        repositories.answers.subjectAccuracy(resolved.id),
      ]);
      const policy = resolved.studyPolicy.mastery;

      setExam(resolved);
      setTrackId(resolvedTrack);
      setNext(continueLearning(resolved, resolvedTrack, evidence, policy));
      setSheets(quickSheets(resolved, resolvedTrack));
      setSubjects(subjectProgressRows(resolved, resolvedTrack, accuracy, evidence, policy));
      setGuides(studyGuides(resolved, resolvedTrack, evidence, policy));
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load Learn.'));
      setStatus('error');
    }
  }, [repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    status,
    error,
    exam,
    trackId,
    eyebrow: LEARN_EYEBROW,
    title: LEARN_TITLE,
    continue: next,
    sheets,
    subjects,
    guides,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
