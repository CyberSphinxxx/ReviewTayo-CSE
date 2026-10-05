import { View } from 'react-native';

import { RTStateView } from '@/components';
import { useTheme } from '@/theme';

/** Home — the centred destination. The editorial dashboard lands in Phase 7. */
export default function HomeScreen() {
  const theme = useTheme();
  return (
    <View
      testID="screen-home"
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="Home"
        description="Your exam countdown, Smart Drill, daily question and plan arrive in Phase 7."
      />
    </View>
  );
}
