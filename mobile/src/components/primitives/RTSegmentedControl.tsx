import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { RTText } from './RTText';

/**
 * Segmented control.
 *
 * Used for appearance and text-size selection. Selection is announced through
 * `accessibilityState.selected`, not indicated by colour alone.
 */

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly accessibilityLabel?: string;
}

export interface RTSegmentedControlProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTSegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
  testID,
  style,
}: RTSegmentedControlProps<T>) => {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.accentSoft,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.md,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            testID={testID === undefined ? undefined : `${testID}-${option.value}`}
            style={{
              flex: 1,
              minHeight: theme.touchTarget.minimum,
              borderRadius: theme.radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.xs,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              shadowColor: selected ? theme.colors.shadow : 'transparent',
              shadowOpacity: selected ? 0.25 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: selected ? 2 : 0,
            }}
          >
            <RTText
              role="meta"
              style={{
                fontWeight: '700',
                color: selected ? theme.colors.accentText : theme.colors.textSecondary,
              }}
            >
              {option.label}
            </RTText>
          </Pressable>
        );
      })}
    </View>
  );
};
