import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { CheckIcon } from '../icons';
import { RTText } from './RTText';

/**
 * Selectable choice.
 *
 * Mirrors the reference's onboarding option cards and its radio-style pickers.
 * The selected state is conveyed with a visible marker plus
 * `accessibilityState.selected`, so it never depends on colour alone.
 */

export type ChoiceMarker = 'check' | 'radio';

export interface RTChoiceProps {
  readonly title: string;
  readonly description?: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly marker?: ChoiceMarker;
  readonly accessibilityHint?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTChoice = ({
  title,
  description,
  selected,
  onPress,
  marker = 'check',
  accessibilityHint,
  testID,
  style,
}: RTChoiceProps) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={marker === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={description === undefined ? title : `${title}. ${description}`}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: theme.colors.scrim }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.base,
          borderRadius: theme.radius.lg,
          borderWidth: theme.borderWidth.thin,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.surfaceSoft : theme.colors.surface,
          marginBottom: theme.spacing.md,
          minHeight: theme.touchTarget.comfortable,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role="lead">{title}</RTText>
        {description !== undefined && (
          <RTText role="meta" tone="secondary" style={{ marginTop: 2 }}>
            {description}
          </RTText>
        )}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: marker === 'radio' ? 12 : theme.radius.sm,
          borderWidth: theme.borderWidth.medium,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <CheckIcon size={14} color={theme.colors.onPrimary} />}
      </View>
    </Pressable>
  );
};
