import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  RTButton,
  RTChip,
  RTScreenShell,
  RTSegmentedControl,
  RTStateView,
  RTText,
} from '@/components';
import type { Repositories } from '@/data/repositories';
import { useTrackSubjects } from '@/features/practice';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Build a Quiz.
 *
 * The one mode where the learner picks the shape: which subjects, and how long. An
 * empty selection means every subject, which is the honest reading of "I did not
 * choose any" — not a quiz with nothing in it.
 */
export default function BuildQuizScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-build-quiz" eyebrow="Practice" title="Build a Quiz">
        <RTStateView kind="info" title="Build a Quiz" description="Loading your subjects…" />
      </RTScreenShell>
    );
  }

  return <BuildQuizContent repositories={repositories} />;
}

const LENGTHS = [5, 10, 20] as const;

const BuildQuizContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const router = useRouter();
  const model = useTrackSubjects(repositories);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [length, setLength] = useState<number | null>(null);

  if (model.status !== 'ready') {
    return (
      <RTScreenShell
        testID="screen-build-quiz"
        eyebrow="Practice"
        title="Build a Quiz"
        onBack={() => router.back()}
      >
        <RTStateView
          kind={model.status === 'error' ? 'error' : 'info'}
          title={model.status === 'error' ? 'Could not load your subjects' : 'Build a Quiz'}
          description={model.error?.message ?? 'Loading your subjects…'}
        />
      </RTScreenShell>
    );
  }

  const count = length ?? model.defaultCount;
  const toggle = (subjectId: string) =>
    setSelected((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );

  const start = () =>
    router.push({
      pathname: '/quiz',
      params: {
        mode: 'build-a-quiz',
        count: String(count),
        ...(selected.length === 0 ? {} : { subjects: selected.join(',') }),
      },
    });

  return (
    <RTScreenShell
      testID="screen-build-quiz"
      eyebrow="Practice"
      title="Build a Quiz"
      onBack={() => router.back()}
    >
      <RTText role="eyebrow" tone="secondary" style={{ marginTop: theme.spacing.base }}>
        Subjects
      </RTText>
      <RTText role="bodySmall" tone="secondary" testID="build-quiz-hint">
        {selected.length === 0
          ? 'Every subject is included until you pick some.'
          : `${selected.length} of ${model.subjects.length} subjects`}
      </RTText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.md,
        }}
      >
        {model.subjects.map((entry) => (
          <RTChip
            key={entry.subject.id}
            label={entry.subject.shortName}
            hint={`${entry.questionCount} questions`}
            selected={selected.includes(entry.subject.id)}
            onPress={() => toggle(entry.subject.id)}
            testID={`build-quiz-subject-${entry.subject.id}`}
          />
        ))}
      </View>

      <RTSegmentedControl
        label="How many questions"
        options={LENGTHS.map((value) => ({ value: String(value), label: `${value}` }))}
        value={String(count)}
        onChange={(value) => setLength(Number.parseInt(value, 10))}
        testID="build-quiz-length"
        style={{ marginTop: theme.spacing.xl }}
      />

      <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
        {count} questions from{' '}
        {selected.length === 0 ? 'every subject' : `${selected.length} subjects`}
      </RTText>

      <RTButton
        label="Start quiz"
        variant="gold"
        size="lg"
        fullWidth
        onPress={start}
        testID="build-quiz-start"
        style={{ marginTop: theme.spacing.xl }}
      />
    </RTScreenShell>
  );
};
