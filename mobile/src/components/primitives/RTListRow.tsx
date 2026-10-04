import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { ChevronRightIcon } from '../icons';
import { RTBadge } from './RTBadge';
import { RTText } from './RTText';

/**
 * List row.
 *
 * The reference prototype builds most secondary navigation from one row pattern:
 * a title, an optional supporting line, optional trailing badge and a chevron. A
 * single primitive keeps those rows rhythmically identical across every tab.
 */

export interface RTListRowProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly meta?: string;
  readonly onPress?: () => void;
  readonly leading?: React.ReactNode;
  readonly trailing?: React.ReactNode;
  readonly badgeCount?: number;
  readonly chevron?: boolean;
  readonly showDivider?: boolean;
  readonly emphasis?: 'default' | 'title';
  readonly accessibilityHint?: string;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export const RTListRow = ({
  title,
  subtitle,
  meta,
  onPress,
  leading,
  trailing,
  badgeCount,
  chevron = false,
  showDivider = true,
  emphasis = 'default',
  accessibilityHint,
  accessibilityLabel,
  testID,
  style,
}: RTListRowProps) => {
  const theme = useTheme();

  const content = (
    <>
      {leading !== undefined && <View style={{ marginRight: theme.spacing.md }}>{leading}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role={emphasis === 'title' ? 'sectionTitle' : 'cardTitle'}>{title}</RTText>
        {subtitle !== undefined && (
          <RTText role="meta" tone="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </RTText>
        )}
        {meta !== undefined && (
          <RTText role="meta" tone="secondary" style={{ marginTop: 2 }}>
            {meta}
          </RTText>
        )}
      </View>
      {badgeCount !== undefined && <RTBadge label={String(badgeCount)} />}
      {trailing !== undefined && <View style={{ marginLeft: theme.spacing.md }}>{trailing}</View>}
      {chevron && (
        <View style={{ marginLeft: theme.spacing.sm }}>
          <ChevronRightIcon color={theme.colors.textSecondary} />
        </View>
      )}
    </>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.base,
      borderBottomWidth: showDivider ? theme.borderWidth.hairline : 0,
      borderBottomColor: theme.colors.border,
      minHeight: theme.touchTarget.comfortable,
    },
    style,
  ];

  if (onPress === undefined) {
    return (
      <View
        testID={testID}
        style={containerStyle}
        accessible
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: theme.colors.scrim }}
      style={({ pressed }) => [containerStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
};

export interface RTListGroupProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/** Groups rows with top/bottom hairlines, matching the reference's nav groups. */
export const RTListGroup = ({ children, style }: RTListGroupProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderTopWidth: theme.borderWidth.hairline,
          borderTopColor: theme.colors.border,
          borderBottomWidth: theme.borderWidth.hairline,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
