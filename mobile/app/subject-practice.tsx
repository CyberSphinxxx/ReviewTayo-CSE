import { useRouter } from 'expo-router';

import { RTListRow, RTScreenShell, RTStateView } from '@/components';
import type { Repositories } from '@/data/repositories';
import { useTrackSubjects } from '@/features/practice';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * Practice by Subject.
 *
 * One subject at a time, with the number of questions that actually exist for it on
 * screen before the learner commits. A subject the content bank cannot serve is still
 * listed — it is part of their exam — but says so instead of starting an empty drill.
 */
export default function SubjectPracticeScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell
        testID="screen-subject-practice"
        eyebrow="Practice"
        title="Practice by Subject"
      >
        <RTStateView kind="info" title="Practice by Subject" description="Loading your subjects…" />
      </RTScreenShell>
    );
  }

  return <SubjectPracticeContent repositories={repositories} />;
}

const SubjectPracticeContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const router = useRouter();
  const model = useTrackSubjects(repositories);

  if (model.status !== 'ready') {
    return (
      <RTScreenShell
        testID="screen-subject-practice"
        eyebrow="Practice"
        title="Practice by Subject"
        onBack={() => router.back()}
      >
        <RTStateView
          kind={model.status === 'error' ? 'error' : 'info'}
          title={model.status === 'error' ? 'Could not load your subjects' : 'Practice by Subject'}
          description={model.error?.message ?? 'Loading your subjects…'}
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-subject-practice"
      eyebrow="Practice"
      title="Practice by Subject"
      onBack={() => router.back()}
    >
      {model.subjects.map((entry) => (
        <RTListRow
          key={entry.subject.id}
          title={entry.subject.name}
          subtitle={`${entry.questionCount} questions`}
          onPress={() =>
            router.push({
              pathname: '/quiz',
              params: {
                mode: 'practice-by-subject',
                count: String(model.defaultCount),
                subjects: entry.subject.id,
              },
            })
          }
          chevron
          emphasis="title"
          testID={`subject-practice-${entry.subject.id}`}
        />
      ))}
    </RTScreenShell>
  );
};
