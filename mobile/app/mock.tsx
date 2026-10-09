import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { RTButton, RTStateView, RTScreenShell } from '@/components';
import type { Repositories } from '@/data/repositories';
import type { ExamRuleConfig } from '@/domain/exams/types';
import type { MockResult } from '@/domain/mock';
import {
  MockNotice,
  MockResultView,
  MockRunnerView,
  MockSetupView,
  useMock,
  useMockRunner,
} from '@/features/mock';
import type { MockSessionState } from '@/services/mock';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Mock exam.
 *
 * One route, three faces: the paper's facts before it starts, the paper itself, and the
 * result. It is never rendered inside the tab bar — an examination must not be
 * interrupted by a tab tap — and the clock is the exam's own, stored as a deadline so
 * closing the app cannot extend it.
 *
 * The learner can leave at any point: the paper stays exactly as it was, and Home's
 * resume card brings them back to it. That is also why a paper whose time ran out while
 * the app was closed is submitted on the way in rather than discarded — the attempt
 * happened, and it deserves its result.
 */
export default function MockExamScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-mock" eyebrow="Mock Exam" title="Simulation">
        <RTStateView kind="info" title="Mock Exam" description="Opening your paper…" />
      </RTScreenShell>
    );
  }

  return <MockContent repositories={repositories} />;
}

const MockContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const router = useRouter();
  const model = useMock(repositories);
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [router]);

  const openRecommended = useCallback(
    (result: MockResult) => {
      switch (result.recommendation.kind) {
        case 'weakest-area': {
          const subjectId = result.recommendation.subjectId;
          if (subjectId === null) {
            router.push('/(tabs)/practice');
            return;
          }
          router.push({
            pathname: '/quiz',
            params: {
              mode: 'weakest-area',
              count: String(result.recommendation.count),
              subjects: subjectId,
            },
          });
          return;
        }
        case 'review':
          router.push('/(tabs)/review');
          return;
        case 'progress':
          router.push('/(tabs)/progress');
          return;
        case 'retake':
        default:
          // A paper that was cut short is worth sitting again from the beginning.
          model.start();
      }
    },
    [model, router],
  );

  return (
    <RTScreenShell
      testID="screen-mock"
      eyebrow={model.eyebrow}
      title={model.title}
      onClose={close}
      closeLabel={model.status === 'running' ? 'Leave the exam' : 'Close'}
    >
      {model.status === 'loading' && (
        <RTStateView kind="info" title="Mock Exam" description="Opening your paper…" />
      )}

      {model.status === 'error' && (
        <RTStateView
          kind="error"
          title="Could not open the mock exam"
          description={model.error?.message ?? 'The paper could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      )}

      {model.status === 'setup' && model.setup !== null && (
        <MockSetupView setup={model.setup} starting={model.starting} onStart={model.start} />
      )}

      {model.status === 'running' && model.session !== null && model.exam !== null && (
        <RunningPaper
          repositories={repositories}
          exam={model.exam}
          session={model.session}
          dailyGoal={model.dailyGoal}
          onSubmitted={model.completed}
        />
      )}

      {model.status === 'result' && model.result !== null && (
        <MockResultView
          result={model.result}
          onProgress={() => router.replace('/(tabs)/progress')}
          onRecommended={() => openRecommended(model.result as MockResult)}
        />
      )}
    </RTScreenShell>
  );
};

/**
 * The running paper is its own component so the runner's clock only exists while the paper
 * does — leaving the route, or finishing the paper, unmounts the tick entirely.
 */
const RunningPaper = ({
  repositories,
  exam,
  session,
  dailyGoal,
  onSubmitted,
}: {
  readonly repositories: Repositories;
  readonly exam: ExamRuleConfig;
  readonly session: MockSessionState;
  readonly dailyGoal: number;
  readonly onSubmitted: (result: MockResult) => void;
}) => {
  const theme = useTheme();
  const runner = useMockRunner({ repositories, exam, session, dailyGoal, onSubmitted });

  return (
    <View>
      <MockNotice message={runner.notice} />
      <MockRunnerView model={runner} onPause={runner.pause} onResume={runner.resume} />
      {runner.notice !== null && runner.submitting && (
        <RTButton
          label="Try again"
          variant="primary"
          size="md"
          fullWidth
          onPress={runner.retrySubmit}
          testID="mock-submit-retry"
          style={{ marginTop: theme.spacing.md }}
        />
      )}
    </View>
  );
};
