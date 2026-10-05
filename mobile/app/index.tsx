import { Redirect } from 'expo-router';

/**
 * Bootstrap route.
 *
 * Phase 6 turns this into the gate that chooses between onboarding and the tab
 * shell based on the persisted exam profile. Until onboarding exists, the shell is
 * the only destination.
 */
export default function BootstrapScreen() {
  return <Redirect href="/(tabs)/home" />;
}
