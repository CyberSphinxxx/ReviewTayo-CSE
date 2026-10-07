import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { RTOwlMark, RTButton, RTScreenShell, RTStateView, RTText } from '@/components';
import type { Repositories } from '@/data/repositories';
import { ONBOARDING_STEP_COUNT, toStepId, type OnboardingStepId } from '@/domain/onboarding';
import { OnboardingStepBody, useOnboarding } from '@/features/onboarding';
import { useLocalData } from '@/store/LocalDataProvider';
import { useTheme } from '@/theme';

/**
 * Onboarding.
 *
 * A full-screen route outside the tab bar. The approved eight-step flow collects
 * the learner's answers into a draft; nothing is written until the last step, and
 * a theme preview is reverted if the flow is abandoned. `mode=edit` reopens the
 * same flow from Settings, and `step=<id>` opens it at the step a Settings row
 * owns.
 *
 * The route mounts the flow only once the local database is ready, so the flow
 * itself never has to cope with a missing repository.
 */
export default function OnboardingScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-onboarding" title="ReviewTayo">
        <RTStateView
          kind="info"
          title="Preparing your plan"
          description="Reading your saved preferences…"
          illustration={<RTOwlMark width={116} />}
        />
      </RTScreenShell>
    );
  }

  return <OnboardingFlow repositories={repositories} />;
}

const OnboardingFlow = ({ repositories }: { readonly repositories: Repositories }) => {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ mode?: string; step?: string }>();
  const mode = params.mode === 'edit' ? 'edit' : 'first-run';

  const initialStep = useMemo<OnboardingStepId | undefined>(() => {
    const raw = params.step;
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    return toStepId(raw);
  }, [params.step]);

  const leave = useCallback(() => {
    // Edit mode is usually pushed from Settings and returns there. Deep links and
    // notification opens arrive without history, so fall back to Home rather than
    // dispatching an unhandled GO_BACK and stranding the learner inside the flow.
    if (mode === 'edit' && router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [mode, router]);

  const onCommitted = useCallback(() => leave(), [leave]);

  const model = useOnboarding({ repositories, onCommitted, initialStep });

  if (model.phase === 'loading') {
    return (
      <RTScreenShell testID="screen-onboarding" title="ReviewTayo">
        <RTStateView
          kind="info"
          title="Preparing your plan"
          description="Reading your saved preferences…"
          illustration={<RTOwlMark width={116} />}
        />
      </RTScreenShell>
    );
  }

  if (model.draft === null) {
    return (
      <RTScreenShell
        testID="screen-onboarding"
        title="ReviewTayo"
        onClose={leave}
        closeLabel="Close"
      >
        <RTStateView
          kind="error"
          title="Could not load your plan"
          description={model.error?.message ?? 'Your saved preferences could not be read.'}
          actionLabel="Try again"
          onAction={model.retry}
        />
      </RTScreenShell>
    );
  }

  const saving = model.phase === 'saving';

  const footer = (
    <View style={{ gap: theme.spacing.sm }}>
      {model.error !== null && (
        <RTText role="meta" tone="danger">
          {model.error.message}
        </RTText>
      )}
      {model.issue !== null && (
        <RTText role="meta" tone="danger">
          {model.issue}
        </RTText>
      )}
      <RTButton
        label={model.isLastStep ? 'Start my first practice' : 'Continue'}
        variant="primary"
        fullWidth
        loading={saving}
        disabled={model.issue !== null}
        onPress={() => (model.isLastStep ? model.commit(true) : model.next())}
        testID="onboarding-primary"
      />
      {model.step === 'schedule' || model.step === 'preferences' ? (
        <RTButton
          label="Skip"
          variant="ghost"
          fullWidth
          onPress={model.skip}
          testID="onboarding-skip"
        />
      ) : model.isLastStep ? (
        <RTButton
          label="Explore Home"
          variant="ghost"
          fullWidth
          onPress={() => model.commit(false)}
          testID="onboarding-explore-home"
        />
      ) : null}
    </View>
  );

  return (
    <RTScreenShell
      testID="screen-onboarding"
      eyebrow={`Step ${model.stepNumber} of ${ONBOARDING_STEP_COUNT}`}
      onBack={model.stepNumber > 1 ? model.back : undefined}
      onClose={leave}
      closeLabel={mode === 'edit' ? 'Close' : 'Skip for now'}
      progress={{
        total: ONBOARDING_STEP_COUNT,
        current: model.stepNumber,
        accessibilityLabel: `Step ${model.stepNumber} of ${ONBOARDING_STEP_COUNT}`,
      }}
      footer={footer}
    >
      <OnboardingStepBody model={model} />
    </RTScreenShell>
  );
};
