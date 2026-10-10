import { View } from 'react-native';

import { RTButton, RTChoice, RTText, RTSurface } from '@/components';
import type { Question } from '@/domain/exams/types';
import {
  describeSessionSummary,
  type AnswerOutcome,
  type RecommendedNext,
} from '@/domain/practice';
import { useTheme } from '@/theme';

/**
 * Quiz sections.
 *
 * The question screen's three states: an unanswered question, the same question with
 * the answer checked and explained, and the end of the session. Answer checking is
 * deliberate — once chosen, the choices stop responding, so a learner reads the
 * explanation instead of hunting for a better option.
 */

export const QuizQuestion = ({
  question,
  chosenChoiceId,
  onChoose,
}: {
  readonly question: Question;
  readonly chosenChoiceId: string | null;
  readonly onChoose: (choiceId: string) => void;
}) => {
  const theme = useTheme();
  const answered = chosenChoiceId !== null;

  return (
    <View testID="quiz-question" style={{ gap: theme.spacing.md }}>
      <RTText role="question" testID="quiz-stem">
        {question.stem}
      </RTText>
      <View testID="quiz-choices" style={{ marginTop: theme.spacing.sm }}>
        {question.choices.map((choice) => (
          <RTChoice
            key={choice.id}
            title={choice.text}
            selected={chosenChoiceId === choice.id}
            onPress={() => {
              if (!answered) onChoose(choice.id);
            }}
            marker="radio"
            accessibilityHint={answered ? undefined : 'Select this answer'}
            testID={`quiz-choice-${choice.id}`}
          />
        ))}
      </View>
    </View>
  );
};

/** The checked answer: whether it was right, why, and what it changed. */
export const QuizFeedback = ({
  outcome,
  correctChoiceText,
  onNext,
  onTrySimilar,
  onReviewConcept,
}: {
  readonly outcome: AnswerOutcome;
  readonly correctChoiceText: string | null;
  readonly onNext: () => void;
  /** Offered only on a miss that has a related question behind it. */
  readonly onTrySimilar?: (() => void) | undefined;
  /** Offered only on a miss that landed on a known concept. */
  readonly onReviewConcept?: (() => void) | undefined;
}) => {
  const theme = useTheme();
  return (
    <View
      testID="quiz-feedback"
      accessibilityLiveRegion="polite"
      style={{ gap: theme.spacing.sm, marginTop: theme.spacing.base }}
    >
      <RTText
        role="sectionTitle"
        tone={outcome.correct ? 'success' : 'danger'}
        testID="quiz-feedback-headline"
      >
        {outcome.headline}
      </RTText>

      {!outcome.correct && correctChoiceText !== null && (
        <RTText role="body" testID="quiz-feedback-answer">
          The answer was: {correctChoiceText}
        </RTText>
      )}

      {outcome.simplifiedExplanation !== null && (
        <RTText role="bodySmall" tone="secondary" testID="quiz-feedback-simplified">
          {outcome.simplifiedExplanation}
        </RTText>
      )}

      <RTText role="body" testID="quiz-feedback-explanation">
        {outcome.explanation}
      </RTText>

      {outcome.masteryLine !== '' && (
        <RTText role="meta" tone="accent" testID="quiz-feedback-mastery">
          {outcome.masteryLine}
        </RTText>
      )}
      {outcome.reviewLine !== null && (
        <RTText role="meta" tone="secondary" testID="quiz-feedback-review">
          {outcome.reviewLine}
        </RTText>
      )}

      <RTButton
        label={outcome.nextLabel}
        variant="primary"
        size="lg"
        fullWidth
        onPress={onNext}
        testID="quiz-next"
        style={{ marginTop: theme.spacing.base }}
      />

      {!outcome.correct && (onTrySimilar !== undefined || onReviewConcept !== undefined) && (
        <View
          testID="quiz-recovery"
          style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}
        >
          {onTrySimilar !== undefined && (
            <RTButton
              label="Try another like this"
              variant="ghost"
              size="sm"
              onPress={onTrySimilar}
              testID="quiz-try-similar"
              style={{ flex: 1 }}
            />
          )}
          {onReviewConcept !== undefined && (
            <RTButton
              label="Review this concept"
              variant="ghost"
              size="sm"
              onPress={onReviewConcept}
              testID="quiz-review-concept"
              style={{ flex: 1 }}
            />
          )}
        </View>
      )}
    </View>
  );
};

/** The end of a session: what happened, and where to go next. */
export const QuizResults = ({
  correctCount,
  total,
  recommendation,
  onRecommended,
  onDone,
  onAgain,
}: {
  readonly correctCount: number;
  readonly total: number;
  /** What to do next, read off this session's score and misses. */
  readonly recommendation: RecommendedNext | null;
  readonly onRecommended: () => void;
  readonly onDone: () => void;
  readonly onAgain: () => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="quiz-results" style={{ gap: theme.spacing.md }}>
      <RTText role="eyebrow" tone="secondary">
        Session complete
      </RTText>
      <RTText role="display" testID="quiz-results-score">
        {correctCount}/{total}
      </RTText>
      <RTText role="body" tone="secondary" testID="quiz-results-line">
        {describeSessionSummary(correctCount, total)}
      </RTText>
      {recommendation !== null && (
        <RTSurface
          variant="soft"
          padding="md"
          radius="lg"
          testID="quiz-results-recommendation"
          style={{ marginTop: theme.spacing.sm }}
        >
          <RTText role="sectionTitle">{recommendation.title}</RTText>
          <RTText role="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
            {recommendation.description}
          </RTText>
        </RTSurface>
      )}
      {recommendation !== null && (
        <RTButton
          label={recommendation.label}
          variant="primary"
          size="lg"
          fullWidth
          onPress={onRecommended}
          testID="quiz-results-recommended"
        />
      )}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <RTButton
          label="Do another"
          variant="subtle"
          onPress={onAgain}
          testID="quiz-results-again"
          style={{ flex: 1 }}
        />
        <RTButton
          label="Back to Practice"
          variant="subtle"
          onPress={onDone}
          testID="quiz-results-done"
          style={{ flex: 1 }}
        />
      </View>
      <RTText role="meta" tone="secondary" testID="quiz-results-saved">
        Everything you answered is saved on this device, and the misses are waiting in Review.
      </RTText>
    </View>
  );
};
