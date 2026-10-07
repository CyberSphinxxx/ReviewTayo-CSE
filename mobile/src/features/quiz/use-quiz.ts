import { useCallback, useEffect, useRef, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { getConcept, type SessionMode } from '@/domain/exams';
import type { ExamRuleConfig, Question } from '@/domain/exams/types';
import {
  answerOutcome,
  recommendNext,
  type AnswerOutcome,
  type RecommendedNext,
} from '@/domain/practice';
import { AppError, toAppError } from '@/domain/result';
import { activeExam } from '@/services/exams';
import {
  finishSession,
  hasSimilarQuestion,
  pauseSession,
  startSession,
  submitAnswer,
} from '@/services/practice';

/**
 * Quiz session model.
 *
 * One question at a time, and the only screen that commits answers. Correctness,
 * mastery, the review schedule, today's activity and the plan's progress are written
 * by `services/practice` in one transaction; this model holds what the screen needs
 * to show — where the session is, what was chosen, and what the learner is told.
 *
 * A session with an id resumes it: the questions come back in their stored order, the
 * score comes from the answers already given, and the session picks up at the first
 * question that has not been answered.
 */

export type QuizStatus = 'loading' | 'ready' | 'error' | 'finished';

export interface QuizStart {
  /** Route params, kept as strings so the effect depends on primitives only. */
  readonly mode: string;
  readonly count: number;
  readonly subjectsCsv?: string;
  readonly conceptsCsv?: string;
  readonly sessionId?: string;
  readonly minutes?: number;
  /** Builds a one-question session about the same idea as this question. */
  readonly similarToQuestionId?: string;
}

export interface QuizModel {
  readonly status: QuizStatus;
  readonly error: AppError | null;
  readonly sessionId: string | null;
  readonly questions: readonly Question[];
  readonly current: Question | null;
  readonly index: number;
  readonly total: number;
  readonly chosenChoiceId: string | null;
  readonly outcome: AnswerOutcome | null;
  readonly answeredCount: number;
  readonly correctCount: number;
  /** `3 of 10` for the header progress. */
  readonly progressLabel: string;
  /** Seconds left, only for a mode with a clock; `null` when untimed. */
  readonly remainingSeconds: number | null;
  readonly isLast: boolean;
  /** The concept the last answer was about, for "Review this concept". */
  readonly reviewConceptId: string | null;
  /**
   * True when the question on screen has a sibling worth drilling. Only a miss can
   * offer it, and only when a related question actually exists.
   */
  readonly canTrySimilar: boolean;
  /** Whether the current question is bookmarked. */
  readonly saved: boolean;
  readonly toggleSaved: () => void;
  /** What to do once the session ends. */
  readonly recommendation: RecommendedNext | null;
  readonly choose: (choiceId: string) => void;
  readonly next: () => void;
  /** Called when the learner walks away: the session stays resumable. */
  readonly pause: () => void;
}

const SESSION_MODES: readonly SessionMode[] = [
  'smart-drill',
  'weakest-area',
  'timed-practice',
  'random-set',
  'build-a-quiz',
  'mastery-rounds',
  'practice-by-subject',
  'daily-question',
  'review-due',
  'try-another-like-this',
];

const asMode = (value: string): SessionMode =>
  (SESSION_MODES as readonly string[]).includes(value) ? (value as SessionMode) : 'smart-drill';

const splitCsv = (value: string | undefined): readonly string[] | undefined => {
  const parts = (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length === 0 ? undefined : parts;
};

export const useQuiz = (repositories: Repositories, start: QuizStart): QuizModel => {
  const [status, setStatus] = useState<QuizStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [exam, setExam] = useState<ExamRuleConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<readonly Question[]>([]);
  const [index, setIndex] = useState(0);
  const [chosenChoiceId, setChosenChoiceId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewConceptId, setReviewConceptId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /** The question "Try another like this" would follow, or `null` when none relates. */
  const [similarFrom, setSimilarFrom] = useState<string | null>(null);
  /** Concepts the learner got wrong, counted once each. The set dedupes; the count is
   *  state so the summary can read it while rendering. */
  const missedConcepts = useRef<Set<string>>(new Set());
  const [missedConceptCount, setMissedConceptCount] = useState(0);
  /** Read by the answer writer. A ref keeps it out of the session's dependencies, so
   *  loading the goal can never start a second session. */
  const dailyGoal = useRef(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const deadline = useRef<number | null>(null);

  const {
    mode,
    count,
    subjectsCsv,
    conceptsCsv,
    sessionId: resumeId,
    minutes,
    similarToQuestionId,
  } = start;

  /** Arms the clock for a timed mode, or clears it for an untimed one. */
  const startClock = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) {
      deadline.current = null;
      setRemainingSeconds(null);
      return;
    }
    deadline.current = Date.now() + seconds * 1000;
    setRemainingSeconds(seconds);
  };

  useEffect(() => {
    let cancelled = false;

    const open = async () => {
      try {
        const profile = await repositories.profile.get();
        const resolved = activeExam(profile?.examId);
        if (resolved === null) {
          throw new Error('No exam content is available yet.');
        }
        const trackId = profile?.trackId ?? resolved.defaultTrackId;
        dailyGoal.current = profile?.dailyGoal ?? 0;

        if (resumeId !== undefined) {
          const session = await repositories.practice.getById(resumeId);
          if (session === null) {
            throw new AppError('not_found', 'That session is no longer on this device.');
          }
          const order = await repositories.practice.listQuestions(session.id);
          const loaded = await repositories.questions.getByIds(
            order.map((entry) => entry.questionId),
          );
          const answers = await repositories.answers.listBySession(session.id);
          const answered = new Set(answers.map((answer) => answer.questionId));
          const firstOpen = loaded.findIndex((question) => !answered.has(question.id));
          if (cancelled) return;
          if (loaded.length === 0) {
            throw new AppError('not_found', 'That session has no questions to resume.');
          }

          setExam(resolved);
          setSessionId(session.id);
          setQuestions(loaded);
          setIndex(firstOpen === -1 ? loaded.length - 1 : firstOpen);
          setAnsweredCount(answers.length);
          setCorrectCount(answers.filter((answer) => answer.isCorrect).length);
          startClock(session.timeRemainingSeconds);
          setError(null);
          setStatus('ready');
          return;
        }

        const started = await startSession({
          repositories,
          exam: resolved,
          trackId,
          mode: asMode(mode),
          questionCount: Math.max(1, count),
          subjectIds: splitCsv(subjectsCsv),
          conceptIds: splitCsv(conceptsCsv),
          ...(minutes === undefined ? {} : { timeLimitMinutes: minutes }),
          ...(similarToQuestionId === undefined ? {} : { similarToQuestionId }),
        });
        if (cancelled) return;
        if (started.plan.questions.length === 0) {
          throw new AppError('not_found', 'There are no questions for this mode yet.');
        }

        setExam(resolved);
        setSessionId(started.session.id);
        setQuestions(started.plan.questions);
        setIndex(0);
        setAnsweredCount(0);
        setCorrectCount(0);
        startClock(started.session.timeRemainingSeconds);
        setError(null);
        setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        setError(toAppError(cause, 'Could not start this practice session.'));
        setStatus('error');
      }
    };

    void open();
    return () => {
      cancelled = true;
    };
  }, [conceptsCsv, count, minutes, mode, repositories, resumeId, similarToQuestionId, subjectsCsv]);

  const current = questions[index] ?? null;

  // Whether the question on screen is bookmarked; read on change rather than cached,
  // so a bookmark added on another screen shows up here too.
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      if (current === null) {
        setSaved(false);
        return;
      }
      const value = await repositories.savedQuestions.isSaved(current.id);
      if (!cancelled) setSaved(value);
    };
    void read();
    return () => {
      cancelled = true;
    };
  }, [current, repositories]);

  const toggleSaved = () => {
    if (current === null) return;
    const question = current;
    setSaved((value) => !value);
    void (async () => {
      if (saved) await repositories.savedQuestions.remove(question.id);
      else
        await repositories.savedQuestions.save({
          questionId: question.id,
          examId: exam?.id ?? '',
          savedAt: new Date().toISOString(),
        });
    })();
  };

  /** Ends a session whose clock ran out, with whatever was answered so far. */
  const finishExpired = useCallback(() => {
    setChosenChoiceId(null);
    setOutcome(null);
    setRemainingSeconds(0);
    setStatus('finished');
    if (sessionId !== null) void finishSession({ repositories, sessionId, correctCount });
  }, [correctCount, repositories, sessionId]);

  // A timed mode runs on a real clock. The interval only reads the deadline, so a
  // slow tick or a backgrounded app cannot make the session longer than it is.
  useEffect(() => {
    if (remainingSeconds === null) return;
    const timer = setInterval(() => {
      const expiresAt = deadline.current;
      if (expiresAt === null) return;
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left === 0) finishExpired();
    }, 1000);
    return () => clearInterval(timer);
  }, [finishExpired, remainingSeconds]);

  const choose = (choiceId: string) => {
    if (chosenChoiceId !== null || current === null || exam === null || status !== 'ready') return;
    setChosenChoiceId(choiceId);

    void (async () => {
      try {
        const result = await submitAnswer({
          repositories,
          exam,
          question: current,
          sessionId,
          chosenChoiceId: choiceId,
          dailyGoal: dailyGoal.current,
        });
        const conceptName =
          result.primaryConceptId === null
            ? 'This concept'
            : (getConcept(exam, result.primaryConceptId)?.name ?? 'This concept');
        setOutcome(
          answerOutcome({
            question: current,
            chosenChoiceId: choiceId,
            conceptName,
            masteryBefore: result.masteryBefore,
            masteryAfter: result.masteryAfter,
            queuedForReview: result.queuedForReview,
            isLastQuestion: index >= questions.length - 1,
          }),
        );
        setReviewConceptId(result.primaryConceptId);
        setAnsweredCount((value) => value + 1);
        if (result.correct) {
          setCorrectCount((value) => value + 1);
          setSimilarFrom(null);
        } else {
          if (result.primaryConceptId !== null) {
            missedConcepts.current.add(result.primaryConceptId);
            setMissedConceptCount(missedConcepts.current.size);
          }
          // Answered first, then asked whether the bank can follow up: the learner
          // never waits on this to read the explanation.
          const available = await hasSimilarQuestion({ repositories, exam, question: current });
          setSimilarFrom(available ? current.id : null);
        }
      } catch (cause) {
        setChosenChoiceId(null);
        setError(toAppError(cause, 'That answer could not be saved.'));
        setStatus('error');
      }
    })();
  };

  const next = () => {
    if (outcome === null) return;
    setChosenChoiceId(null);
    setOutcome(null);
    if (index >= questions.length - 1) {
      const score = correctCount;
      setStatus('finished');
      if (sessionId !== null) {
        void finishSession({ repositories, sessionId, correctCount: score });
      }
      return;
    }
    setIndex((value) => value + 1);
  };

  const pause = () => {
    if (sessionId !== null) void pauseSession(repositories, sessionId);
  };

  return {
    status,
    error,
    sessionId,
    questions,
    current,
    index,
    total: questions.length,
    chosenChoiceId,
    outcome,
    answeredCount,
    correctCount,
    progressLabel: `${Math.min(index + 1, questions.length)} of ${questions.length}`,
    remainingSeconds,
    isLast: index >= questions.length - 1,
    reviewConceptId,
    canTrySimilar: current !== null && similarFrom === current.id,
    saved,
    toggleSaved,
    recommendation:
      status === 'finished'
        ? recommendNext({
            correct: correctCount,
            total: questions.length,
            missedConcepts: missedConceptCount,
          })
        : null,
    choose,
    next,
    pause,
  };
};
