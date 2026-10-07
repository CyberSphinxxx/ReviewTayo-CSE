import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTText } from './RTText';

/**
 * Chip.
 *
 * The reference prototype's pill-shaped shortcut: a short label with an optional
 * hint underneath, used for Quick Sheets and later for filters. Touchable as a
 * whole, and accessible as a single button rather than as its two text runs.
 */

export interface RTChipProps {
  readonly label: string;
  /** Secondary line under the label, e.g. the subject or a reading time. */
  readonly hint?: string;
  readonly onPress?: () => void;
  readonly selected?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const RTChip = ({ label, hint, onPress, selected = false, style, testID }: RTChipProps) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={hint === undefined ? label : `${label}, ${hint}`}
      style={({ pressed }) => [
        {
          minHeight: theme.touchTarget.minimum,
          justifyContent: 'center',
          gap: 2,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.base,
          borderRadius: theme.radius.pill,
          borderWidth: theme.borderWidth.thin,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <RTText role="button">{label}</RTText>
      {hint !== undefined && (
        <RTText role="meta" tone="secondary">
          {hint}
        </RTText>
      )}
    </Pressable>
  );
};
