import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { RTScreenShell, RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import { GuideSections, useReference } from '@/features/learn';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * Study Guide.
 *
 * The drill-down behind Learn's Subjects list and Study Guides index: a subject's
 * lessons in order with the mastery each has earned, or every subject at once when
 * no subject is named. Nothing here is hand-written prose — the guide is generated
 * from the exam's own concepts, so it can never drift from the questions.
 */
export default function GuideScreen() {
  const { repositories } = useLocalData();
  const params = useLocalSearchParams<{ subjectId?: string | string[] }>();
  const subjectId = typeof params.subjectId === 'string' ? params.subjectId : undefined;

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-guide" eyebrow="Study guides" title="Opening…">
        <RTStateView kind="info" title="Study guides" description="Opening your lessons…" />
      </RTScreenShell>
    );
  }

  return <GuideContent repositories={repositories} subjectId={subjectId} />;
}

const GuideContent = ({
  repositories,
  subjectId,
}: {
  readonly repositories: Repositories;
  readonly subjectId?: string;
}) => {
  const router = useRouter();
  const model = useReference(repositories, { subjectId });
  const named = model.sections.find((section) => section.subjectId === subjectId);

  const openConcept = useCallback(
    (conceptId: string) => router.push({ pathname: '/concept', params: { conceptId } }),
    [router],
  );

  if (model.status === 'error') {
    return (
      <RTScreenShell
        testID="screen-guide"
        eyebrow="Study guides"
        title="Every subject"
        onBack={() => router.back()}
      >
        <RTStateView
          kind="error"
          title="Could not load this guide"
          description={model.error?.message ?? 'Your lessons could not be read.'}
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-guide"
      eyebrow="Study guides"
      title={named?.name ?? 'Every subject'}
      onBack={() => router.back()}
      backLabel="Go back"
    >
      {model.sections.length === 0 ? (
        <RTStateView
          kind="info"
          title="Nothing to read yet"
          description="This guide has no lessons in it yet."
        />
      ) : (
        <GuideSections
          sections={model.sections}
          onOpenConcept={openConcept}
          sectionHeadings={named === undefined}
        />
      )}
    </RTScreenShell>
  );
};
