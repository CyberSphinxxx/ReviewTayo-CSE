import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Progress primitives.
 *
 * `bar` is used for subject accuracy and plan progress; `ring` mirrors the
 * reference prototype's daily-goal ring; `sparkline` draws the shape of a short
 * series (the Study Score's last six weeks). All of them expose their value to
 * assistive technology rather than being decoration, and none of them decides what
 * the value means.
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

export interface RTSparklineProps {
  /** Points in reading order, oldest first; each is drawn against `max`. */
  readonly values: readonly number[];
  /** The value the top of the plot area represents. */
  readonly max?: number;
  readonly height?: number;
  readonly label?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/**
 * A tiny line chart of a short series, drawn in a fixed 300×50 coordinate space that
 * scales to whatever width it is given. Values are already 0–`max`; the primitive
 * neither sorts nor smooths them, so the curve is exactly the numbers it was handed.
 */
export const RTSparkline = ({
  values,
  max = 100,
  height = 56,
  label,
  style,
  testID,
}: RTSparklineProps) => {
  const theme = useTheme();
  const ceiling = max > 0 ? max : 100;
  const width = 300;
  const plotHeight = 50;
  const padding = 3;
  const usable = plotHeight - padding * 2;

  const points = values
    .map((value, index) => {
      if (!Number.isFinite(value)) return null;
      const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
      const ratio = Math.min(1, Math.max(0, value / ceiling));
      return `${x.toFixed(2)},${(plotHeight - padding - ratio * usable).toFixed(2)}`;
    })
    .filter((point): point is string => point !== null)
    .join(' ');

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? `Trend of ${values.length} points`}
      style={[{ width: '100%', height }, style]}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${plotHeight}`}>
        <Polyline
          points={points}
          fill="none"
          stroke={theme.colors.accentText}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
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
