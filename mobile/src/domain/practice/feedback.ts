import { MASTERY_LADDER, type MasteryLevel } from '@/domain/exams/mastery';
import type { Question } from '@/domain/exams/types';

/**
 * Answer checking and feedback.
 *
 * What the learner is told after answering, in one place: whether they were right,
 * why, how their mastery moved, and what happens next. The screen decides nothing
 * about wording, and being wrong is never framed as failure — the prototype's tone is
 * "Not quite", followed by the reason.
 */

export const CORRECT_HEADLINE = 'Correct.';
export const WRONG_HEADLINE = 'Not quite.';
export const NEXT_LABEL = 'Next question';
export const RESULTS_LABEL = 'See results';
export const ADDED_TO_REVIEW_LINE = 'Added to your review queue.';

export interface AnswerOutcome {
  readonly correct: boolean;
  readonly headline: string;
  /** The content's own explanation of the answer. */
  readonly explanation: string;
  /** The plainer restatement, offered only when the learner got it wrong. */
  readonly simplifiedExplanation: string | null;
  /** How far the concept moved, or `''` when it did not. */
  readonly masteryLine: string;
  /** Set only when the answer queued the concept for review. */
  readonly reviewLine: string | null;
  readonly nextLabel: string;
}

export const isCorrectChoice = (question: Question, chosenChoiceId: string): boolean =>
  chosenChoiceId === question.correctChoiceId;

/** Position on the ladder, so "moved up" is a comparison rather than a guess. */
export const masteryRank = (level: MasteryLevel): number => MASTERY_LADDER.indexOf(level);

/**
 * `Vocabulary is now Strong.`, `… slipped back to Learning.` or nothing at all.
 *
 * A concept that did not move gets no line: praising or scolding a learner for
 * staying still would describe the arithmetic, not their progress.
 */
export const describeMasteryChange = (
  conceptName: string,
  before: MasteryLevel,
  after: MasteryLevel,
): string => {
  if (before === after) return '';
  return masteryRank(after) > masteryRank(before)
    ? `${conceptName} is now ${after}.`
    : `${conceptName} slipped back to ${after}.`;
};

export interface OutcomeInput {
  readonly question: Question;
  readonly chosenChoiceId: string;
  readonly conceptName: string;
  readonly masteryBefore: MasteryLevel;
  readonly masteryAfter: MasteryLevel;
  readonly queuedForReview: boolean;
  readonly isLastQuestion: boolean;
}

export const answerOutcome = ({
  question,
  chosenChoiceId,
  conceptName,
  masteryBefore,
  masteryAfter,
  queuedForReview,
  isLastQuestion,
}: OutcomeInput): AnswerOutcome => {
  const correct = isCorrectChoice(question, chosenChoiceId);
  return {
    correct,
    headline: correct ? CORRECT_HEADLINE : WRONG_HEADLINE,
    explanation: question.explanation,
    simplifiedExplanation: correct ? null : (question.simplifiedExplanation ?? null),
    masteryLine: describeMasteryChange(conceptName, masteryBefore, masteryAfter),
    reviewLine: queuedForReview ? ADDED_TO_REVIEW_LINE : null,
    nextLabel: isLastQuestion ? RESULTS_LABEL : NEXT_LABEL,
  };
};

/** What the results screen recommends doing next. */
export type NextActionKind = 'repeat' | 'mixed-set' | 'review';

export interface RecommendedNext {
  readonly kind: NextActionKind;
  readonly title: string;
  readonly description: string;
  readonly label: string;
}

/**
 * The next action after a session, chosen from what just happened.
 *
 * It never praises a score, and it never sends a learner deeper into the same
 * material when the misses are already waiting in Review — that queue exists to be
 * used, not to be filled.
 */
export const recommendNext = ({
  correct,
  total,
  missedConcepts,
}: {
  readonly correct: number;
  readonly total: number;
  readonly missedConcepts: number;
}): RecommendedNext => {
  if (total <= 0) {
    return {
      kind: 'repeat',
      title: 'Nothing to mark yet',
      description: 'Answer a question and this will say what to do next.',
      label: 'Start again',
    };
  }

  const ratio = correct / total;
  if (ratio >= 0.8 && missedConcepts === 0) {
    return {
      kind: 'mixed-set',
      title: 'A clean sheet',
      description: 'Mix in other subjects to keep it sharp.',
      label: 'Try a mixed set',
    };
  }

  if (ratio < 0.6 && missedConcepts > 0) {
    return {
      kind: 'review',
      title: 'That set needs another pass',
      description: `${missedConcepts} ${
        missedConcepts === 1 ? 'concept is' : 'concepts are'
      } waiting in Review.`,
      label: 'Go to Review',
    };
  }

  return {
    kind: 'repeat',
    title: 'Solid work',
    description: 'Another pass now will lock it in.',
    label: 'Drill again',
  };
};

/** `3 of 10 correct` — the session's running score line. */
export const describeScore = (correct: number, answered: number): string =>
  `${Math.max(0, correct)} of ${Math.max(0, answered)} correct`;

/** The end-of-session line, which is deliberately not a judgement. */
export const describeSessionSummary = (correct: number, total: number): string =>
  total <= 0
    ? 'Nothing to mark yet.'
    : `${correct} of ${total} correct · ${
        correct === total ? 'a clean sheet' : 'the misses are in your review queue'
      }`;
