import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTText } from './RTText';

/**
 * Statistic block: one large serif numeral with a label underneath, matching the
 * reference's editorial number treatment.
 */

export interface RTStatProps {
  readonly value: string | number;
  readonly label: string;
  readonly tone?: 'default' | 'accent' | 'gold' | 'success';
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTStat = ({ value, label, tone = 'default', style, testID }: RTStatProps) => {
  const theme = useTheme();
  const color = (() => {
    switch (tone) {
      case 'accent':
        return theme.colors.accentText;
      case 'gold':
        return theme.colors.gold;
      case 'success':
        return theme.colors.successText;
      case 'default':
      default:
        return theme.colors.text;
    }
  })();

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[{ minWidth: 0 }, style]}
    >
      <RTText role="score" style={{ color }}>
        {value}
      </RTText>
      <RTText role="meta" tone="secondary">
        {label}
      </RTText>
    </View>
  );
};

export interface RTStatRowProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTStatRow = ({ children, style }: RTStatRowProps) => {
  const theme = useTheme();
  return <View style={[{ flexDirection: 'row', gap: theme.spacing.xl }, style]}>{children}</View>;
};
