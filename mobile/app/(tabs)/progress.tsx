import { useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import {
  JourneySection,
  MasterySection,
  NeedsAttentionSection,
  ProgressHeader,
  RecentMockSection,
  StudyScoreBlock,
  SubjectAccuracySection,
  WeekSection,
  useProgress,
} from '@/features/progress';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Progress — how it is going.
 *
 * The approved composition from the reference: the Study Score with its week-over-week
 * line and the six weeks behind it, the subject that needs attention and the single
 * action that fixes it, then the evidence underneath — subject accuracy, mastery, the
 * exam's phases, this week's activity and the last mock. Every row is a real
 * destination, and the two sections that need history the learner has not yet
 * generated (needs attention, the last mock) simply say so.
 */
export default function ProgressScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <ProgressShell>
        <RTStateView kind="info" title="Progress" description="Reading your results…" />
      </ProgressShell>
    );
  }

  return <ProgressContent repositories={repositories} />;
}

const ProgressShell = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID="screen-progress" style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl }}>
        {children}
      </View>
    </View>
  );
};

const ProgressContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const model = useProgress(repositories);
  const overview = model.overview;

  const openConcepts = useCallback(
    (subjectId?: string) => {
      router.push({
        pathname: '/progress-list',
        params: subjectId === undefined ? {} : { subjectId },
      });
    },
    [router],
  );

  const practiceWeakest = useCallback(() => {
    const weakest = overview?.needsAttention;
    if (weakest === undefined || weakest === null) return;
    // The drill the Practice tab would have started for the same subject, so the two
    // screens can never send the learner to different work.
    router.push({
      pathname: '/quiz',
      params: {
        mode: 'weakest-area',
        count: String(weakest.count),
        subjects: weakest.subjectId,
      },
    });
  }, [overview, router]);

  const openMock = useCallback(() => router.push('/mock'), [router]);

  if (model.status === 'loading') {
    return (
      <ProgressShell>
        <RTStateView
          kind="info"
          title="Progress"
          description="Reading your results…"
          testID="progress-loading"
        />
      </ProgressShell>
    );
  }

  if (model.status === 'error' || overview === null) {
    return (
      <ProgressShell>
        <RTStateView
          kind="error"
          title="Could not load Progress"
          description={model.error?.message ?? 'Your results could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </ProgressShell>
    );
  }

  return (
    <ScrollView
      testID="screen-progress"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xxxl,
      }}
    >
      <ProgressHeader eyebrow={model.eyebrow} title={model.title} topInset={insets.top} />

      <StudyScoreBlock score={overview.score} />

      {overview.needsAttention !== null && (
        <NeedsAttentionSection row={overview.needsAttention} onPractice={practiceWeakest} />
      )}

      <SubjectAccuracySection rows={overview.subjects} onOpenSubject={openConcepts} />

      <MasterySection
        line={overview.mastery.line}
        solidRatio={overview.mastery.solidRatio}
        onOpen={() => openConcepts()}
      />

      <JourneySection journey={overview.journey} />

      <WeekSection week={overview.week} />

      <RecentMockSection mock={overview.recentMock} onOpenMock={openMock} />
    </ScrollView>
  );
};
