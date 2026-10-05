import { View } from 'react-native';

import { RTStateView } from '@/components';
import { useTheme } from '@/theme';

/** Review — the spaced-repetition queue, mistakes, saved and history (Phase 10). */
export default function ReviewScreen() {
  const theme = useTheme();
  return (
    <View
      testID="screen-review"
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="Review"
        description="The due queue, Again / Got it scheduling and review history arrive in Phase 10."
      />
    </View>
  );
}
