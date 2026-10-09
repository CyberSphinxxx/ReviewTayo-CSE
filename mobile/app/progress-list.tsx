import { useLocalSearchParams, useRouter } from 'expo-router';

import { RTStateView, RTScreenShell } from '@/components';
import type { Repositories } from '@/data/repositories';
import { ConceptMasteryRows, useConceptMastery } from '@/features/progress';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * The drill-down behind Progress.
 *
 * One route, two readings of the same list: every concept in the track, weakest first,
 * or one subject's concepts when it was opened from that subject's accuracy row. The
 * rows carry the mastery level and the evidence behind it, and every row opens the
 * concept itself — Progress may only claim what the learner can go and check.
 */
export default function ProgressListScreen() {
  const { repositories } = useLocalData();
  const params = useLocalSearchParams<{ subjectId?: string | string[] }>();
  const subjectId = typeof params.subjectId === 'string' ? params.subjectId : undefined;

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-progress-list" eyebrow="Progress" title="Opening…">
        <RTStateView kind="info" title="Progress" description="Reading your concepts…" />
      </RTScreenShell>
    );
  }

  return <ProgressListContent repositories={repositories} subjectId={subjectId} />;
}

const ProgressListContent = ({
  repositories,
  subjectId,
}: {
  readonly repositories: Repositories;
  readonly subjectId?: string;
}) => {
  const router = useRouter();
  const model = useConceptMastery(repositories, subjectId);
  const title = model.list?.title ?? 'Concept mastery';

  if (model.status === 'loading') {
    return (
      <RTScreenShell
        testID="screen-progress-list"
        eyebrow="Progress"
        title={title}
        onBack={() => router.back()}
      >
        <RTStateView
          kind="info"
          title="Progress"
          description="Reading your concepts…"
          testID="progress-list-loading"
        />
      </RTScreenShell>
    );
  }

  if (model.status === 'error' || model.list === null) {
    return (
      <RTScreenShell
        testID="screen-progress-list"
        eyebrow="Progress"
        title={title}
        onBack={() => router.back()}
      >
        <RTStateView
          kind="error"
          title="Could not load concept mastery"
          description={model.error?.message ?? 'Your concepts could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-progress-list"
      eyebrow="Progress"
      title={model.list.title}
      onBack={() => router.back()}
      backLabel="Go back"
    >
      {model.list.rows.length === 0 ? (
        <RTStateView
          kind="info"
          title="Nothing to show yet"
          description="No concepts from your track are in this list."
          testID="progress-list-empty"
        />
      ) : (
        <ConceptMasteryRows
          list={model.list}
          onOpenConcept={(conceptId) =>
            router.push({ pathname: '/concept', params: { conceptId } })
          }
        />
      )}
    </RTScreenShell>
  );
};
