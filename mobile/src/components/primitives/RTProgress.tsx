import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Progress primitives.
 *
 * `bar` is used for subject accuracy and plan progress; `ring` mirrors the
 * reference prototype's daily-goal ring. Both expose their value to assistive
 * technology through an adjustable accessibility value.
 */

const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export interface RTProgressBarProps {
  readonly value: number;
  readonly tone?: 'primary' | 'gold' | 'success';
  readonly height?: number;
  readonly label?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTProgressBar = ({
  value,
  tone = 'primary',
  height = 8,
  label,
  style,
  testID,
}: RTProgressBarProps) => {
  const theme = useTheme();
  const clamped = clamp01(value);
  const fill = (() => {
    switch (tone) {
      case 'gold':
        return theme.colors.gold;
      case 'success':
        return theme.colors.success;
      case 'primary':
      default:
        return theme.colors.primary;
    }
  })();

  return (
    <View
      testID={testID}
      /* `accessible` is required for a plain View to be discoverable as a single
         element by assistive technology, even when a role is provided. */
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        {
          height,
          borderRadius: height,
          backgroundColor: theme.colors.accentSoft,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: fill,
        }}
      />
    </View>
  );
};

export interface RTProgressRingProps {
  readonly value: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly label?: string;
  readonly children?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTProgressRing = ({
  value,
  size = 64,
  strokeWidth = 8,
  label,
  children,
  style,
  testID,
}: RTProgressRingProps) => {
  const theme = useTheme();
  const clamped = clamp01(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.accentSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};
