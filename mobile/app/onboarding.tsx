import { useRouter } from 'expo-router';

import { RTStateView, RTScreenShell } from '@/components';

/**
 * Onboarding.
 *
 * A full-screen route outside the tab bar. Phase 6 builds the guest/Google choice,
 * CSE level, schedule, plan preview and appearance steps; until then it explains
 * itself and offers a way back to the shell.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  return (
    <RTScreenShell
      eyebrow="Welcome"
      title="Set up your CSE plan"
      onClose={() => router.replace('/(tabs)/home')}
      closeLabel="Skip for now"
      testID="screen-onboarding"
    >
      <RTStateView
        kind="info"
        title="Onboarding arrives in Phase 6"
        description="Account choice, CSE level, study schedule, daily goal and the generated plan are built next."
      />
    </RTScreenShell>
  );
}
