import { View } from 'react-native';

import { RTStateView } from '@/components';
import { useTheme } from '@/theme';

/** Practice — Smart Drill, Timed Practice, Build a Quiz and more (Phase 9). */
export default function PracticeScreen() {
  const theme = useTheme();
  return (
    <View
      testID="screen-practice"
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="Practice"
        description="Smart Drill, Weakest Area, Timed Practice and the question screen arrive in Phase 9."
      />
    </View>
  );
}
