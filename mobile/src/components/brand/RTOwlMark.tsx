import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * ReviewTayo owl mascot.
 *
 * Geometry is transcribed from the approved prototype's inline SVG so the brand
 * mark is identical to the reference, but rendered natively with theme-aware
 * colours instead of a rasterised asset. `resting` closes the eyes for the
 * end-of-day state and `cropped` provides the compact head mark used by the
 * bottom navigation.
 */

export type OwlMood = 'neutral' | 'resting';

export interface RTOwlMarkProps {
  readonly width?: number;
  readonly mood?: OwlMood;
  readonly cropped?: boolean;
  readonly testID?: string;
}

const FULL_VIEW_BOX = '0 0 200 236';
const CROPPED_VIEW_BOX = '25 24 150 170';

export const RTOwlMark = ({
  width = 124,
  mood = 'neutral',
  cropped = false,
  testID,
}: RTOwlMarkProps) => {
  const theme = useTheme();
  const brand = theme.colors.brand;
  const height = width * (cropped ? 170 / 150 : 236 / 200);

  return (
    <Svg
      testID={testID}
      width={width}
      height={height}
      viewBox={cropped ? CROPPED_VIEW_BOX : FULL_VIEW_BOX}
      accessibilityRole="image"
      accessibilityLabel="ReviewTayo owl"
    >
      {/* Feet */}
      <Rect x={66} y={208} width={30} height={14} rx={7} fill={brand.beak} />
      <Rect x={104} y={208} width={30} height={14} rx={7} fill={brand.beak} />

      {/* Body */}
      <Path
        d="M100 34C152 34 180 74 180 132C180 188 150 214 100 214C50 214 20 188 20 132C20 74 48 34 100 34Z"
        fill={brand.body}
      />
      {/* Ear tufts */}
      <Path d="M34 56L54 18L88 44Z" fill={brand.wing} />
      <Path d="M166 56L146 18L112 44Z" fill={brand.wing} />
      {/* Wings */}
      <Path d="M22 118C2 150 10 192 44 200C42 172 38 146 22 118Z" fill={brand.wing} />
      <Path d="M178 118C198 150 190 192 156 200C158 172 162 146 178 118Z" fill={brand.wing} />

      {/* Belly */}
      <Ellipse cx={100} cy={162} rx={48} ry={50} fill={brand.belly} />
      <Path
        d="M74 142q13 11 26 0q13 11 26 0M70 166q15 11 30 0q15 11 30 0M78 190q11 9 22 0q11 9 22 0"
        fill="none"
        stroke={brand.bellyFeather}
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      {/* Face disc */}
      <Ellipse cx={100} cy={94} rx={68} ry={48} fill={brand.face} />

      {/* Graduation cap */}
      <Path d="M60 34L100 14L140 34L100 54Z" fill={brand.cap} />
      <Path d="M80 44V58Q100 68 120 58V44" fill={brand.capUnder} />
      <Path d="M140 34V58" stroke={brand.beak} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={140} cy={61} r={5} fill={brand.beak} />

      {/* Eyes */}
      <Circle cx={74} cy={94} r={26} fill={brand.eyeWhite} stroke={brand.belly} strokeWidth={4} />
      {mood === 'resting' ? (
        <Path
          d="M62 96q12 -12 24 0"
          fill="none"
          stroke={brand.pupil}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : (
        <G>
          <Circle cx={74} cy={94} r={12} fill={brand.pupil} />
          <Circle cx={78} cy={89} r={4} fill={brand.eyeWhite} />
        </G>
      )}
      <Circle cx={126} cy={94} r={26} fill={brand.eyeWhite} stroke={brand.belly} strokeWidth={4} />
      {mood === 'resting' ? (
        <Path
          d="M114 96q12 -12 24 0"
          fill="none"
          stroke={brand.pupil}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : (
        <G>
          <Circle cx={126} cy={94} r={12} fill={brand.pupil} />
          <Circle cx={130} cy={89} r={4} fill={brand.eyeWhite} />
        </G>
      )}

      {/* Beak */}
      <Path
        d="M91 108L109 108L100 127Z"
        fill={brand.beak}
        stroke={brand.beak}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </Svg>
  );
};
