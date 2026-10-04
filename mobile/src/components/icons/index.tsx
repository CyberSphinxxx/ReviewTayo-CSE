import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Icon set.
 *
 * Icons are inline SVG rather than an icon font so they inherit the current theme
 * colour, scale crisply and add no font payload. Geometry follows the approved
 * reference prototype's navigation glyphs.
 */

export interface IconProps {
  readonly size?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
}

const useIconColor = (color?: string): string => {
  const theme = useTheme();
  return color ?? theme.colors.text;
};

export const LearnIcon = ({ size = 22, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const PracticeIcon = ({ size = 22, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={4} stroke={stroke} strokeWidth={strokeWidth} />
    </Svg>
  );
};

export const HomeIcon = ({ size = 22, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ReviewIcon = ({ size = 22, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ProgressIcon = ({ size = 22, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 20V10M12 20V4M19 20v-7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ChevronRightIcon = ({ size = 20, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ArrowLeftIcon = ({ size = 22, color, strokeWidth = 2.2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ArrowRightIcon = ({ size = 20, color, strokeWidth = 2.4 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h13M13 6l6 6-6 6"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const CloseIcon = ({ size = 20, color, strokeWidth = 2.2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const CheckIcon = ({ size = 18, color, strokeWidth = 2.6 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4.5 4.5L19 7"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const SettingsIcon = ({ size = 20, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} stroke={stroke} strokeWidth={strokeWidth} />
      <Path
        d="M12 3.6l1.5 2.2 2.6-.6.5 2.6 2.4 1.2-1.5 2.2 1.5 2.2-2.4 1.2-.5 2.6-2.6-.6L12 20.4l-1.5-2.2-2.6.6-.5-2.6-2.4-1.2L6.5 12 5 9.8l2.4-1.2.5-2.6 2.6.6z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const InfoIcon = ({ size = 18, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={strokeWidth} />
      <Path d="M12 11v5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={7.8} r={1.1} fill={stroke} />
    </Svg>
  );
};

export const BookmarkIcon = ({
  size = 20,
  color,
  strokeWidth = 2,
  filled = false,
}: IconProps & { readonly filled?: boolean }) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? stroke : 'none'}
      />
    </Svg>
  );
};

export const ClockIcon = ({ size = 18, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={stroke} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.5V12l3 1.8"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const FlameIcon = ({ size = 18, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.6.7-2.9 1.5-4 .2 1.2.8 2 1.7 2.3C10.2 8.4 12 5.6 12 3z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const LightningIcon = ({ size = 18, color, strokeWidth = 2 }: IconProps) => {
  const stroke = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.5 3L6 13h4.5l-.9 8L19 10.5h-5z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
