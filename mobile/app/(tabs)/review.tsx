import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import {
  CAUGHT_UP_DESCRIPTION,
  ReviewCaughtUp,
  ReviewHeader,
  ReviewRows,
  ReviewSummary,
  useReview,
} from '@/features/review';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Review — where what did not stick comes back.
 *
 * The number is the whole screen when there is one: how much is due, what it costs, and
 * a single action to start. Everything else — mistakes, saved questions, concepts to
 * revisit and the week's history — is a row that explains the number rather than
 * competing with it, and when nothing is due the screen says so once instead of
 * drawing an empty queue.
 */
export default function ReviewScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <ReviewShell>
        <RTStateView kind="info" title="Review" description="Checking what is due…" />
      </ReviewShell>
    );
  }

  return <ReviewContent repositories={repositories} />;
}

const ReviewShell = ({ children }: { readonly children: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID="screen-review" style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl }}>
        {children}
      </View>
    </View>
  );
};

const ReviewContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const model = useReview(repositories);

  if (model.status === 'loading') {
    return (
      <ReviewShell>
        <RTStateView
          kind="info"
          title="Review"
          description="Checking what is due…"
          testID="review-loading"
        />
      </ReviewShell>
    );
  }

  if (model.status === 'error' || model.overview === null) {
    return (
      <ReviewShell>
        <RTStateView
          kind="error"
          title="Could not load Review"
          description={model.error?.message ?? 'Your review queue could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </ReviewShell>
    );
  }

  const overview = model.overview;

  return (
    <ScrollView
      testID="screen-review"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xxxl,
      }}
    >
      <ReviewHeader eyebrow={model.eyebrow} title={model.title} topInset={insets.top} />

      {model.caughtUp ? (
        <ReviewCaughtUp description={CAUGHT_UP_DESCRIPTION} />
      ) : (
        <ReviewSummary
          count={overview.deck.count}
          meta={overview.meta}
          onStart={() => router.push('/review-session')}
        />
      )}

      <ReviewRows
        counts={{
          mistakes: overview.mistakeCount,
          saved: overview.savedCount,
          revisit: overview.revisit.length,
          history: overview.history.reviewedThisWeek,
        }}
        historyLine={model.historyLine}
        onOpen={(kind) => router.push({ pathname: '/review-list', params: { kind } })}
      />
    </ScrollView>
  );
};
