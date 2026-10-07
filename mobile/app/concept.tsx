import { useLocalSearchParams, useRouter } from 'expo-router';

import { RTScreenShell, RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import { ConceptBody, useReference } from '@/features/learn';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * Concept reference.
 *
 * The destination behind Continue Learning, the Quick Sheets cards and every lesson
 * row in a guide: what the concept means, where it sits in its subject, and how well
 * the learner knows it right now. It is the "understand it first" half of Learn, and
 * it deliberately contains no Review Due or drilling of its own.
 */
export default function ConceptScreen() {
  const { repositories } = useLocalData();
  const params = useLocalSearchParams<{ conceptId?: string | string[] }>();
  const conceptId = typeof params.conceptId === 'string' ? params.conceptId : undefined;

  if (repositories === null || conceptId === undefined) {
    return (
      <RTScreenShell testID="screen-concept" eyebrow="Learn" title="Opening…">
        <RTStateView kind="info" title="Concept" description="Opening this concept…" />
      </RTScreenShell>
    );
  }

  return <ConceptContent repositories={repositories} conceptId={conceptId} />;
}

const ConceptContent = ({
  repositories,
  conceptId,
}: {
  readonly repositories: Repositories;
  readonly conceptId: string;
}) => {
  const router = useRouter();
  const model = useReference(repositories, { conceptId });

  if (model.status !== 'ready') {
    return (
      <RTScreenShell
        testID="screen-concept"
        eyebrow="Learn"
        title="Opening…"
        onBack={() => router.back()}
      >
        <RTStateView
          kind={model.status === 'error' ? 'error' : 'info'}
          title={model.status === 'error' ? 'Could not load this concept' : 'Concept'}
          description={model.error?.message ?? 'Opening this concept…'}
        />
      </RTScreenShell>
    );
  }

  if (model.reference === null) {
    return (
      <RTScreenShell
        testID="screen-concept"
        eyebrow="Learn"
        title="Concept"
        onBack={() => router.back()}
      >
        <RTStateView
          kind="info"
          title="Concept not found"
          description="This concept is not part of your exam content."
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-concept"
      eyebrow={model.reference.concept.subjectName}
      title={model.reference.concept.name}
      onBack={() => router.back()}
      backLabel="Go back"
    >
      <ConceptBody reference={model.reference} />
    </RTScreenShell>
  );
};
