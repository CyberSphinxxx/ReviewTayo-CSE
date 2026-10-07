import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Repositories, UserExamProfileRecord } from '@/data/repositories';
import { resolveExamPhase, type ExamPhase } from '@/domain/exams';
import type { ExamRuleConfig } from '@/domain/exams/types';
import {
  computeStreak,
  describeGoalProgress,
  describeStreakLine,
  DRILL_META_UNDER,
  DONE_CONTEXT,
  DONE_HEADLINE,
  needsAttentionLine,
  phasePill,
  smartDrillHeadline,
  summarizeToday,
  type ResumeCandidate,
  type TodaySummary,
} from '@/domain/home';
import {
  dailyQuestionSpec,
  describeResumeProgress,
  reviewDueSpec,
  smartDrillSpec,
  type SessionSpec,
} from '@/domain/sessions';
import { toIsoDate } from '@/domain/study-plan';
import { toAppError, type AppError } from '@/domain/result';
import { activeExam } from '@/services/exams';

/**
 * Home model.
 *
 * Home asks "what should I do now?" and is assembled from committed state only: the
 * learner's profile and phase, the plan they are following, what they have done
 * today, what is due, and any session they can resume. Nothing here is cached in
 * memory — the model reloads when the tab regains focus, so finishing a drill and
 * coming back shows the work the learner just did.
 */

export type HomeStatus = 'loading' | 'ready' | 'error';

/** The hero's copy, already derived from committed state. */
export interface HeroCopy {
  readonly pill: string;
  readonly headline: string;
  readonly context: string;
  readonly metaUnder: string;
  readonly done: boolean;
}

export interface HomeActions {
  readonly drill: SessionSpec;
  readonly dailyQuestion: { readonly meta: string };
  readonly review: SessionSpec;
}

export interface HomeModel {
  readonly status: HomeStatus;
  readonly error: AppError | null;
  readonly exam: ExamRuleConfig | null;
  readonly profile: UserExamProfileRecord | null;
  readonly phase: ExamPhase | null;
  readonly hero: HeroCopy | null;
  readonly today: TodaySummary | null;
  readonly actions: HomeActions | null;
  readonly streak: number;
  readonly streakLine: string;
  readonly goalLine: string;
  readonly resume: ResumeCandidate | null;
  readonly resumeProgress: string;
  readonly dismissResume: () => void;
  readonly reload: () => void;
}

/** How many days of activity are read to measure a streak. */
const STREAK_WINDOW_DAYS = 400;

/**
 * `now` is injected rather than defaulted in the body: a freshly constructed
 * `Date` on every render would make the loader a new function each time and reload
 * the screen in a loop. Tests pass a fixed clock; the app passes nothing.
 */
export const useHome = (repositories: Repositories, now?: Date): HomeModel => {
  const [status, setStatus] = useState<HomeStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [profile, setProfile] = useState<UserExamProfileRecord | null>(null);
  const [phase, setPhase] = useState<ExamPhase | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [hero, setHero] = useState<HeroCopy | null>(null);
  const [actions, setActions] = useState<HomeActions | null>(null);
  const [streak, setStreak] = useState(0);
  const [resume, setResume] = useState<ResumeCandidate | null>(null);
  const [dismissedResume, setDismissedResume] = useState(false);

  const load = useCallback(async () => {
    try {
      const clock = now ?? new Date();
      const storedProfile = await repositories.profile.get();
      const resolved = activeExam(storedProfile?.examId);
      if (resolved === null) {
        throw new Error('No exam content is available yet.');
      }

      const day = toIsoDate(clock);
      const trackId = storedProfile?.trackId ?? resolved.defaultTrackId;
      const dailyGoal = storedProfile?.dailyGoal ?? 0;

      const [plan, dueCount, activity, recentDays, accuracy, mock, practice] = await Promise.all([
        repositories.studyPlans.getActive(resolved.id),
        repositories.review.countDue(resolved.id, clock.toISOString()),
        repositories.activity.get(day, resolved.id),
        repositories.activity.listRange(
          resolved.id,
          toIsoDate(new Date(clock.getTime() - STREAK_WINDOW_DAYS * 86_400_000)),
          day,
        ),
        repositories.answers.subjectAccuracy(resolved.id),
        repositories.mock.findResumable(resolved.id),
        repositories.practice.findResumable(resolved.id),
      ]);

      const tasks = plan === null ? [] : await repositories.studyPlans.listTasks(plan.id);
      const summary = summarizeToday({ day, tasks, activity, dailyGoal, dueCount });
      const resolvedPhase = resolveExamPhase(resolved, storedProfile?.examDate ?? null, clock);
      const drill = smartDrillSpec(dailyGoal, resolved.studyPolicy);

      setExam(resolved);
      setProfile(storedProfile);
      setPhase(resolvedPhase);
      setToday(summary);
      setActions({
        drill,
        dailyQuestion: dailyQuestionSpec(resolved.studyPolicy),
        review: reviewDueSpec(dueCount, resolved.studyPolicy),
      });
      setStreak(computeStreak(recentDays, day));
      const resumablePracticeAnswers =
        practice === null ? 0 : (await repositories.answers.listBySession(practice.id)).length;

      setResume(
        mock !== null
          ? {
              kind: 'mock',
              sessionId: mock.id,
              mode: 'mock-exam',
              answeredCount: mock.answeredCount,
              totalCount: mock.totalItems,
              updatedAt: mock.updatedAt,
            }
          : practice !== null
            ? {
                kind: 'practice',
                sessionId: practice.id,
                mode: practice.mode,
                answeredCount: resumablePracticeAnswers,
                totalCount: practice.requestedCount,
                updatedAt: practice.updatedAt,
              }
            : null,
      );
      setHero({
        pill: phasePill(resolvedPhase),
        headline: summary.doneForToday ? DONE_HEADLINE : smartDrillHeadline(drill.count),
        context: summary.doneForToday
          ? DONE_CONTEXT
          : needsAttentionLine(resolved, trackId, accuracy, resolved.studyPolicy),
        metaUnder: DRILL_META_UNDER,
        done: summary.doneForToday,
      });
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load your home screen.'));
      setStatus('error');
    }
  }, [now, repositories]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dismiss = useCallback(() => setDismissedResume(true), []);

  return {
    status,
    error,
    exam,
    profile,
    phase,
    hero,
    today,
    actions,
    streak,
    streakLine: describeStreakLine(streak),
    goalLine: today === null ? '' : describeGoalProgress(today),
    resume: dismissedResume ? null : resume,
    resumeProgress:
      resume === null ? '' : describeResumeProgress(resume.answeredCount, resume.totalCount),
    dismissResume: dismiss,
    reload: () => {
      setStatus('loading');
      void load();
    },
  };
};
