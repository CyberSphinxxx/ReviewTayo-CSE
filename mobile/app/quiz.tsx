import { useRouter } from 'expo-router';

import { RTStateView, RTScreenShell } from '@/components';

/**
 * Practice session route.
 *
 * Every practice mode presents its questions here — the route reads the mode from
 * its params in Phase 9. The close affordance is deliberate: abandoning a session
 * must always be possible in two taps.
 */
export default function QuizScreen() {
  const router = useRouter();
  return (
    <RTScreenShell
      eyebrow="Practice"
      title="Question"
      onClose={() => router.back()}
      testID="screen-quiz"
    >
      <RTStateView
        kind="info"
        title="The question screen arrives in Phase 9"
        description="Answer checking, explanations, mastery feedback and resume behaviour are built with the practice engine."
      />
    </RTScreenShell>
  );
}
