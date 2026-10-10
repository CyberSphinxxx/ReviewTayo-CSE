import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { MasteryLevel } from '@/domain/exams/mastery';
import { textScale, useTheme } from '@/theme';

import { RTText } from './RTText';

/**
 * Badge primitive.
 *
 * Used for mastery status, counts and metadata pills. Mastery badges are the
 * canonical example of a selected/correct state that must not rely on colour
 * alone — the label always carries the meaning.
 */

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'gold' | 'inverse' | 'accent';

/**
 * The mastery vocabulary lives in the domain (see `domain/exams/mastery`), so the
 * exam engine can reason about levels without importing a component. Re-exported
 * here because callers treat it as part of this primitive's contract.
 */
export type { MasteryLevel };

export interface RTBadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly mastery?: MasteryLevel;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export const masteryToneKey = (
  level: MasteryLevel,
): 'learning' | 'developing' | 'strong' | 'mastered' => {
  switch (level) {
    case 'Developing':
      return 'developing';
    case 'Strong':
      return 'strong';
    case 'Mastered':
      return 'mastered';
    case 'Learning':
    default:
      return 'learning';
  }
};

export const RTBadge = ({ label, tone = 'neutral', mastery, style, testID }: RTBadgeProps) => {
  const theme = useTheme();
  // The pill stays compact by design, but it must still follow the learner's
  // text-size preference the way every other string does.
  const scale = textScale[theme.textSize];

  const palette = (() => {
    if (mastery !== undefined) {
      const colors = theme.colors.mastery[masteryToneKey(mastery)];
      return { background: colors.background, text: colors.text, border: colors.border };
    }
    switch (tone) {
      case 'success':
        return {
          background: theme.colors.successSoft,
          text: theme.colors.successText,
          border: 'transparent',
        };
      case 'danger':
        return {
          background: theme.colors.dangerSoft,
          text: theme.colors.dangerText,
          border: 'transparent',
        };
      case 'gold':
        return { background: theme.colors.gold, text: theme.colors.onGold, border: 'transparent' };
      case 'inverse':
        return {
          background: 'rgba(255,255,255,0.18)',
          text: theme.colors.textInverse,
          border: 'transparent',
        };
      case 'accent':
        return {
          background: theme.colors.accentSoft,
          text: theme.colors.onAccentSoft,
          border: 'transparent',
        };
      case 'neutral':
      default:
        return {
          background: theme.colors.neutralSoft,
          text: theme.colors.onNeutralSoft,
          border: 'transparent',
        };
    }
  })();

  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: 'flex-start',
          borderRadius: theme.radius.pill,
          paddingVertical: 3,
          paddingHorizontal: theme.spacing.sm,
          backgroundColor: palette.background,
          borderWidth: palette.border === 'transparent' ? 0 : theme.borderWidth.hairline,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <RTText
        role="meta"
        style={{
          color: palette.text,
          fontSize: Math.round(11 * scale),
          fontWeight: '700',
          lineHeight: Math.round(15 * scale),
        }}
      >
        {label}
      </RTText>
    </View>
  );
};
