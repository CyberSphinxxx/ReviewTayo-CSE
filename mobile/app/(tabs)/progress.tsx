import { View } from 'react-native';

import { RTStateView } from '@/components';
import { useTheme } from '@/theme';

/** Progress — Study Score, Needs Attention, mastery and the CSE Journey (Phase 11). */
export default function ProgressScreen() {
  const theme = useTheme();
  return (
    <View
      testID="screen-progress"
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="Progress"
        description="Study Score, Needs Attention and the CSE Journey arrive in Phase 11."
      />
    </View>
  );
}
