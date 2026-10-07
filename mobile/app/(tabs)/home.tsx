import { useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTButton, RTStateView, RTText } from '@/components';
import type { Repositories } from '@/data/repositories';
import type { HomeTask, ResumeCandidate } from '@/domain/home';
import { HomeHero, HomeResumeCard, HomeToday, useHome } from '@/features/home';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Home — the centred destination.
 *
 * The editorial composition from the approved reference: one full-bleed hero that
 * answers "what should I do now?", then three small things, the goal ring and the
 * streak, and a resume card only when there is something to resume. Nothing here
 * exposes how the recommendation was assembled; the learner sees a subject and a
 * next action, not a score.
 *
 * The route mounts the model only once the local database is ready, so the model
 * itself never has to cope with a missing repository.
 */
export default function HomeScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <HomeShell>
        <RTStateView kind="info" title="Home" description="Opening today's plan…" />
      </HomeShell>
    );
  }

  return <HomeContent repositories={repositories} />;
}

const HomeShell = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID="screen-home" style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.xl,
        }}
      >
        {children}
      </View>
    </View>
  );
};

const HomeContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const model = useHome(repositories);

  const startDrill = useCallback(() => {
    router.push({ pathname: '/quiz', params: { mode: 'smart-drill' } });
  }, [router]);

  const openDailyQuestion = useCallback(() => {
    router.push({ pathname: '/quiz', params: { mode: 'daily-question' } });
  }, [router]);

  const openReview = useCallback(() => router.push('/(tabs)/review'), [router]);

  const openTask = useCallback(
    (task: HomeTask) => {
      switch (task.kind) {
        case 'learn':
          router.push('/(tabs)/learn');
          return;
        case 'review':
          router.push('/(tabs)/review');
          return;
        case 'mock':
          router.push('/mock');
          return;
        case 'practice':
        case 'checkpoint':
        default:
          startDrill();
      }
    },
    [router, startDrill],
  );

  const resume = useCallback(
    (candidate: ResumeCandidate) => {
      if (candidate.kind === 'mock') {
        router.push('/mock');
        return;
      }
      // Reopening the stored session continues it; the quiz route reads the answers
      // already given rather than starting again.
      router.push({
        pathname: '/quiz',
        params: { mode: candidate.mode, sessionId: candidate.sessionId },
      });
    },
    [router],
  );

  const openSettings = useCallback(() => router.push('/settings'), [router]);

  if (model.status === 'loading') {
    return (
      <HomeShell>
        <RTStateView
          kind="info"
          title="Home"
          description="Reading today's plan…"
          testID="home-loading"
        />
      </HomeShell>
    );
  }

  if (model.status === 'error' || model.hero === null) {
    return (
      <HomeShell>
        <RTStateView
          kind="error"
          title="Could not load Home"
          description={model.error?.message ?? 'Your study data could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </HomeShell>
    );
  }

  return (
    <ScrollView
      testID="screen-home"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{ paddingBottom: theme.spacing.xxxl }}
    >
      <HomeHero
        hero={model.hero}
        onStartDrill={startDrill}
        onOpenSettings={openSettings}
        topInset={insets.top}
      />

      {model.today?.doneForToday === true && (
        <View
          testID="home-done-banner"
          style={{
            marginTop: theme.spacing.xl,
            marginHorizontal: theme.spacing.xl,
            padding: theme.spacing.base,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.successSoft,
          }}
        >
          <RTText role="lead" tone="success">
            Nothing left for today.
          </RTText>
          <RTText role="meta" tone="success">
            Your streak is safe — come back tomorrow.
          </RTText>
        </View>
      )}

      <HomeToday
        model={model}
        onStartDrill={startDrill}
        onDailyQuestion={openDailyQuestion}
        onReview={openReview}
        onTask={openTask}
      />

      <HomeResumeCard model={model} onResume={resume} />

      <View style={{ paddingHorizontal: theme.spacing.xl, marginTop: theme.spacing.xl }}>
        <RTButton
          label="See your progress"
          variant="subtle"
          fullWidth
          onPress={() => router.push('/(tabs)/progress')}
          testID="home-progress"
        />
      </View>
    </ScrollView>
  );
};
