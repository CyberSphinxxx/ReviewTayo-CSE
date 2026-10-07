import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { BookmarkIcon, RTIconButton, RTStateView, RTScreenShell, RTText } from '@/components';
import type { Repositories } from '@/data/repositories';
import { QuizFeedback, QuizQuestion, QuizResults, useQuiz, type QuizStart } from '@/features/quiz';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Practice session route.
 *
 * Every practice mode presents its questions here: the route reads the mode and its
 * request from its params, starts or resumes the session, and then shows one question
 * at a time with the answer checked and explained. The close affordance is deliberate
 * — abandoning a session must always be possible in two taps, and it leaves the
 * session resumable rather than throwing the work away.
 *
 * The three ways out of a wrong answer are the prototype's: the next question, another
 * question about the same idea, or the concept itself. Bookmarking lives in the header
 * so it is available on every question, whether or not it was answered correctly.
 */

const MODE_LABELS: Readonly<Record<string, string>> = {
  'smart-drill': 'Smart Drill',
  'weakest-area': 'Weakest Area',
  'timed-practice': 'Timed Practice',
  'random-set': 'Random Set',
  'build-a-quiz': 'Your Quiz',
  'mastery-rounds': 'Mastery Rounds',
  'practice-by-subject': 'Subject Practice',
  'daily-question': 'Daily Question',
  'review-due': 'Review',
  'try-another-like-this': 'Another Like This',
};

const first = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;

export default function QuizScreen() {
  const { repositories } = useLocalData();
  const params = useLocalSearchParams<{
    mode?: string | string[];
    count?: string | string[];
    subjects?: string | string[];
    concepts?: string | string[];
    minutes?: string | string[];
    sessionId?: string | string[];
    similarTo?: string | string[];
  }>();

  const mode = first(params.mode) ?? 'smart-drill';
  const countRaw = Number.parseInt(first(params.count) ?? '10', 10);
  const minutesRaw = Number.parseInt(first(params.minutes) ?? '', 10);
  const start: QuizStart = {
    mode,
    count: Number.isFinite(countRaw) && countRaw > 0 ? countRaw : 10,
    ...(first(params.subjects) === undefined ? {} : { subjectsCsv: first(params.subjects) }),
    ...(first(params.concepts) === undefined ? {} : { conceptsCsv: first(params.concepts) }),
    ...(first(params.sessionId) === undefined ? {} : { sessionId: first(params.sessionId) }),
    ...(Number.isFinite(minutesRaw) && minutesRaw > 0 ? { minutes: minutesRaw } : {}),
    ...(first(params.similarTo) === undefined
      ? {}
      : { similarToQuestionId: first(params.similarTo) }),
  };

  if (repositories === null) {
    return (
      <RTScreenShell
        testID="screen-quiz"
        eyebrow={MODE_LABELS[mode] ?? 'Practice'}
        title="Question"
      >
        <RTStateView kind="info" title="Getting ready" description="Building your session…" />
      </RTScreenShell>
    );
  }

  return <QuizContent repositories={repositories} start={start} />;
}

const QuizContent = ({
  repositories,
  start,
}: {
  readonly repositories: Repositories;
  readonly start: QuizStart;
}) => {
  const router = useRouter();
  const theme = useTheme();
  const model = useQuiz(repositories, start);
  const label = MODE_LABELS[start.mode] ?? 'Practice';
  const current = model.current;
  // Read as primitives so the callbacks below keep stable identities.
  const currentQuestionId = current?.id ?? null;
  const recommendedKind = model.recommendation?.kind ?? null;
  const reviewConceptId = model.reviewConceptId;

  const close = useCallback(() => {
    model.pause();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/practice');
  }, [model, router]);

  const again = useCallback(() => {
    router.replace({
      pathname: '/quiz',
      params: {
        mode: start.mode,
        count: String(start.count),
        ...(start.subjectsCsv === undefined ? {} : { subjects: start.subjectsCsv }),
        ...(start.conceptsCsv === undefined ? {} : { concepts: start.conceptsCsv }),
        ...(start.minutes === undefined ? {} : { minutes: String(start.minutes) }),
        ...(start.similarToQuestionId === undefined
          ? {}
          : { similarTo: start.similarToQuestionId }),
        at: String(Date.now()),
      },
    });
  }, [router, start]);

  /** A one-question session about the same idea as the one just missed. */
  const trySimilar = useCallback(() => {
    if (currentQuestionId === null) return;
    router.push({
      pathname: '/quiz',
      params: {
        mode: 'try-another-like-this',
        count: '1',
        similarTo: currentQuestionId,
        at: String(Date.now()),
      },
    });
  }, [currentQuestionId, router]);

  const reviewConcept = useCallback(() => {
    if (reviewConceptId === null) return;
    router.push({ pathname: '/concept', params: { conceptId: reviewConceptId } });
  }, [reviewConceptId, router]);

  /** Where the summary sends the learner next. */
  const goRecommended = useCallback(() => {
    switch (recommendedKind) {
      case 'review':
        router.replace('/(tabs)/review');
        return;
      case 'mixed-set':
        router.replace({
          pathname: '/quiz',
          params: { mode: 'random-set', count: '10', at: String(Date.now()) },
        });
        return;
      default:
        again();
    }
  }, [again, recommendedKind, router]);

  if (model.status === 'loading') {
    return (
      <RTScreenShell testID="screen-quiz" eyebrow={label} title="Question">
        <RTStateView
          kind="info"
          title="Getting ready"
          description="Building your session…"
          testID="quiz-loading"
        />
      </RTScreenShell>
    );
  }

  if (model.status === 'error' || current === null) {
    return (
      <RTScreenShell
        testID="screen-quiz"
        eyebrow={label}
        title="Question"
        onClose={close}
        closeLabel="Close"
      >
        <RTStateView
          kind="error"
          title="Could not start this session"
          description={model.error?.message ?? 'There is nothing to practise here yet.'}
        />
      </RTScreenShell>
    );
  }

  if (model.status === 'finished') {
    return (
      <RTScreenShell
        testID="screen-quiz"
        eyebrow={label}
        title="Session complete"
        onClose={close}
        closeLabel="Close"
      >
        <QuizResults
          correctCount={model.correctCount}
          total={model.total}
          recommendation={model.recommendation}
          onRecommended={goRecommended}
          onDone={() => router.replace('/(tabs)/practice')}
          onAgain={again}
        />
      </RTScreenShell>
    );
  }

  const correctChoice =
    current.choices.find((choice) => choice.id === current.correctChoiceId)?.text ?? null;

  return (
    <RTScreenShell
      testID="screen-quiz"
      eyebrow={label}
      title={`Question ${model.progressLabel}`}
      onClose={close}
      closeLabel="Close"
      progress={{
        total: model.total,
        current: model.index + 1,
        accessibilityLabel: `Question ${model.progressLabel}`,
      }}
      headerAccessory={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {model.remainingSeconds !== null && (
            <RTText role="meta" tone="secondary" testID="quiz-clock">
              {Math.floor(model.remainingSeconds / 60)}:
              {String(model.remainingSeconds % 60).padStart(2, '0')}
            </RTText>
          )}
          <RTIconButton
            accessibilityLabel={model.saved ? 'Remove bookmark' : 'Bookmark this question'}
            onPress={() => model.toggleSaved()}
            testID="quiz-save"
          >
            <BookmarkIcon
              color={model.saved ? theme.colors.primary : theme.colors.text}
              filled={model.saved}
            />
          </RTIconButton>
        </View>
      }
    >
      <QuizQuestion
        question={current}
        chosenChoiceId={model.chosenChoiceId}
        onChoose={model.choose}
      />
      {model.outcome !== null && (
        <QuizFeedback
          outcome={model.outcome}
          correctChoiceText={correctChoice}
          onNext={model.next}
          onTrySimilar={model.canTrySimilar ? trySimilar : undefined}
          onReviewConcept={
            model.outcome.correct || model.reviewConceptId === null ? undefined : reviewConcept
          }
        />
      )}
    </RTScreenShell>
  );
};
