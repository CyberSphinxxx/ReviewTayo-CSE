import { useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';

import { RTStateView, RTScreenShell, RTText } from '@/components';
import type { Repositories } from '@/data/repositories';
import { ReviewActions, ReviewCardView, ReviewComplete, useReviewSession } from '@/features/review';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Review Due — the deck.
 *
 * One card per due concept, and either answer moves on: "Got it" earns the interval the
 * concept's mastery has reached, "Again" takes it back to the start of the ladder. Both
 * are recorded before the next card appears, so an abandoned deck still rescheduled the
 * cards that were actually answered.
 *
 * Leaving is one tap and never discards anything — every card already graded kept its
 * new date, and the ones never reached stay due.
 */
export default function ReviewSessionScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-review-session" eyebrow="Review" title="Review now">
        <RTStateView kind="info" title="Getting ready" description="Shuffling your cards…" />
      </RTScreenShell>
    );
  }

  return <ReviewSessionContent repositories={repositories} />;
}

const ReviewSessionContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const router = useRouter();
  const model = useReviewSession(repositories);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/review');
  }, [router]);

  if (model.status === 'loading') {
    return (
      <RTScreenShell testID="screen-review-session" eyebrow="Review" title="Review now">
        <RTStateView
          kind="info"
          title="Getting ready"
          description="Shuffling your cards…"
          testID="review-session-loading"
        />
      </RTScreenShell>
    );
  }

  if (model.status === 'error') {
    return (
      <RTScreenShell
        testID="screen-review-session"
        eyebrow="Review"
        title="Review now"
        onClose={close}
        closeLabel="Close"
      >
        <RTStateView
          kind="error"
          title="Could not open your review"
          description={model.error?.message ?? 'Your cards could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </RTScreenShell>
    );
  }

  if (model.status === 'finished' && model.completion !== null) {
    return (
      <RTScreenShell
        testID="screen-review-session"
        eyebrow="Review"
        title="Review now"
        onClose={close}
        closeLabel="Close"
      >
        <ReviewComplete completion={model.completion} onDone={close} />
      </RTScreenShell>
    );
  }

  // Between the database being read and the first card being drawn. The deck is never
  // empty while it is live: the model only leaves `ready` once the queue runs out.
  if (model.current === null) {
    return (
      <RTScreenShell testID="screen-review-session" eyebrow="Review" title="Review now">
        <RTStateView
          kind="info"
          title="Getting ready"
          description="Shuffling your cards…"
          testID="review-session-waiting"
        />
      </RTScreenShell>
    );
  }

  const card = model.current;

  return (
    <RTScreenShell
      testID="screen-review-session"
      eyebrow="Review"
      title={`Card ${model.progressLabel}`}
      onClose={close}
      closeLabel="Close"
      progress={{
        total: model.total,
        current: model.graded,
        accessibilityLabel: `Card ${model.progressLabel}`,
      }}
      headerAccessory={
        <RTText role="meta" tone="secondary" testID="review-remaining">
          {model.remaining} left
        </RTText>
      }
    >
      {model.notice !== null && <Notice testID="review-notice">{model.notice.message}</Notice>}

      <ReviewCardView card={card} revealed={model.revealed} onReveal={model.reveal} />

      <ReviewActions
        disabled={!model.revealed && card.answer !== ''}
        onAgain={model.again}
        onGotIt={model.gotIt}
        onOpenConcept={() =>
          router.push({ pathname: '/concept', params: { conceptId: card.conceptId } })
        }
      />

      <View style={{ marginTop: theme.spacing.lg }}>
        <RTText role="meta" tone="secondary">
          Again brings it back in a few days. Got it moves it further out.
        </RTText>
      </View>
    </RTScreenShell>
  );
};

/** A failed write, said plainly, without ending the session. */
const Notice = ({
  children,
  testID,
}: {
  readonly children: ReactNode;
  readonly testID?: string;
}) => {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={{
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.dangerSoft,
      }}
    >
      <RTText role="bodySmall" tone="danger">
        {children}
      </RTText>
    </View>
  );
};
