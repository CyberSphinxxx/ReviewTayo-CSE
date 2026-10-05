import { useRouter } from 'expo-router';

import { RTStateView, RTScreenShell } from '@/components';

/**
 * Mock exam route.
 *
 * Full-screen and timer-driven from Phase 12. It is never rendered inside the tab
 * bar: an examination must not be interrupted by a tab tap.
 */
export default function MockExamScreen() {
  const router = useRouter();
  return (
    <RTScreenShell
      eyebrow="Mock Exam"
      title="Simulation"
      onClose={() => router.back()}
      testID="screen-mock"
    >
      <RTStateView
        kind="info"
        title="The mock exam arrives in Phase 12"
        description="Blueprint setup, the timer, pause/resume, submission and the score breakdown are built with the exam engine."
      />
    </RTScreenShell>
  );
}
