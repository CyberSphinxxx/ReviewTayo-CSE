import { useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import type { PracticeAction } from '@/domain/practice';
import {
  PracticeHeader,
  PracticeMore,
  PracticePrimary,
  PracticeTargeted,
  usePractice,
} from '@/features/practice';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Practice — where knowledge gets tested.
 *
 * The approved composition: one dominant Smart Drill sized to the learner's own goal,
 * the two targeted modes that say what to work on, and every other mode behind one
 * disclosure. Practice never shows a mode it cannot honestly offer, and it never
 * decides how a mode works — each action already carries its own request.
 *
 * The route mounts the model only once the local database is ready, so the model
 * itself never has to cope with a missing repository.
 */
export default function PracticeScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <PracticeShell>
        <RTStateView kind="info" title="Practice" description="Getting your drill ready…" />
      </PracticeShell>
    );
  }

  return <PracticeContent repositories={repositories} />;
}

const PracticeShell = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <View testID="screen-practice" style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl }}>
        {children}
      </View>
    </View>
  );
};

const PracticeContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const model = usePractice(repositories);
  const [expanded, setExpanded] = useState(false);

  const open = useCallback(
    (action: PracticeAction) => {
      const destination = model.destinationFor(action);
      router.push(
        destination.params === undefined
          ? { pathname: destination.pathname }
          : { pathname: destination.pathname, params: destination.params },
      );
    },
    [model, router],
  );

  if (model.status === 'loading') {
    return (
      <PracticeShell>
        <RTStateView
          kind="info"
          title="Practice"
          description="Getting your drill ready…"
          testID="practice-loading"
        />
      </PracticeShell>
    );
  }

  if (model.status === 'error' || model.catalogue === null) {
    return (
      <PracticeShell>
        <RTStateView
          kind="error"
          title="Could not load Practice"
          description={model.error?.message ?? 'Your practice options could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </PracticeShell>
    );
  }

  const { primary, targeted, more } = model.catalogue;

  return (
    <ScrollView
      testID="screen-practice"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xxxl,
      }}
    >
      <PracticeHeader eyebrow={model.eyebrow} title={model.title} topInset={insets.top} />

      <View style={{ marginTop: theme.spacing.xl }}>
        <PracticePrimary action={primary} onStart={open} />
      </View>

      <PracticeTargeted actions={targeted} onOpen={open} />

      <PracticeMore
        actions={more}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
        onOpen={open}
      />
    </ScrollView>
  );
};
