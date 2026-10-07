import { useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import {
  LearnContinue,
  LearnHeader,
  LearnQuickSheets,
  LearnStudyGuides,
  LearnSubjects,
  useLearn,
} from '@/features/learn';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Learn — where understanding happens.
 *
 * The approved editorial screen: the eyebrow and title, then the one thing to
 * understand next, the quick reference cards, every subject with the accuracy it
 * has earned so far, and the study guides behind them. Review Due deliberately does
 * not appear here — it belongs to Home and the Review tab.
 *
 * The route mounts the model only once the local database is ready, so the model
 * itself never has to cope with a missing repository.
 */
export default function LearnScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <LearnShell>
        <RTStateView kind="info" title="Learn" description="Opening your lessons…" />
      </LearnShell>
    );
  }

  return <LearnContent repositories={repositories} />;
}

const LearnShell = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID="screen-learn" style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl }}>
        {children}
      </View>
    </View>
  );
};

const LearnContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const model = useLearn(repositories);

  const openConcept = useCallback(
    (conceptId: string) => router.push({ pathname: '/concept', params: { conceptId } }),
    [router],
  );

  const openGuide = useCallback(
    (subjectId?: string) =>
      router.push(
        subjectId === undefined
          ? { pathname: '/guide' }
          : { pathname: '/guide', params: { subjectId } },
      ),
    [router],
  );

  if (model.status === 'loading') {
    return (
      <LearnShell>
        <RTStateView
          kind="info"
          title="Learn"
          description="Opening your lessons…"
          testID="learn-loading"
        />
      </LearnShell>
    );
  }

  if (model.status === 'error') {
    return (
      <LearnShell>
        <RTStateView
          kind="error"
          title="Could not load Learn"
          description={model.error?.message ?? 'Your lessons could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </LearnShell>
    );
  }

  return (
    <ScrollView
      testID="screen-learn"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xxxl,
      }}
    >
      <LearnHeader eyebrow={model.eyebrow} title={model.title} topInset={insets.top} />

      {model.continue !== null && <LearnContinue next={model.continue} onOpen={openConcept} />}

      <LearnQuickSheets sheets={model.sheets} onOpen={openConcept} />

      <LearnSubjects rows={model.subjects} onOpenSubject={openGuide} />

      {model.guides !== null && <LearnStudyGuides guides={model.guides} onOpen={openGuide} />}
    </ScrollView>
  );
};
