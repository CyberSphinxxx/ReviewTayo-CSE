import { View } from 'react-native';

import { RTStateView } from '@/components';
import { useTheme } from '@/theme';

/** Learn — Continue Learning, Quick Sheets, Subjects and Study Guides (Phase 8). */
export default function LearnScreen() {
  const theme = useTheme();
  return (
    <View
      testID="screen-learn"
      style={{
        flex: 1,
        backgroundColor: theme.colors.canvas,
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <RTStateView
        kind="info"
        title="Learn"
        description="Continue Learning, Quick Sheets, Subjects and Study Guides arrive in Phase 8."
      />
    </View>
  );
}
