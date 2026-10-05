import { useRouter } from 'expo-router';

import { RTStateView, RTScreenShell } from '@/components';

/**
 * Settings.
 *
 * A real route rather than a DOM-style sheet, so Android back, deep links and
 * screen-reader focus behave correctly. Appearance, text size, reminders and plan
 * editing are filled in by Phase 6.
 */
export default function SettingsScreen() {
  const router = useRouter();
  return (
    <RTScreenShell
      eyebrow="Settings"
      title="ReviewTayo: CSE"
      onClose={() => router.back()}
      testID="screen-settings"
    >
      <RTStateView
        kind="info"
        title="Settings are being built"
        description="Appearance, text size, reminders and study-plan editing arrive in Phase 6."
      />
    </RTScreenShell>
  );
}
