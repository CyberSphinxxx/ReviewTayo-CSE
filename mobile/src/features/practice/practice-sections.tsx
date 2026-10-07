import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { RTButton, RTListRow, RTSurface, RTText } from '@/components';
import type { PracticeAction } from '@/domain/practice';
import { useTheme } from '@/theme';

/**
 * Practice sections.
 *
 * The approved composition: one dominant drill, the two targeted actions that say
 * what to work on, and everything else behind a single disclosure. Progressive
 * disclosure is doing real work here — six modes offered at once is a menu, and a
 * learner who came to practise should not have to choose a mode first.
 */

export const PracticeHeader = ({
  eyebrow,
  title,
  topInset,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly topInset: number;
}) => {
  const theme = useTheme();
  return (
    <View style={{ paddingTop: topInset + theme.spacing.lg }}>
      <RTText role="eyebrow" tone="secondary" testID="practice-eyebrow">
        {eyebrow}
      </RTText>
      <RTText role="pageTitle" testID="practice-title" style={{ marginTop: theme.spacing.xs }}>
        {title}
      </RTText>
    </View>
  );
};

/** The primary drill: a full-bleed card with the single gold action. */
export const PracticePrimary = ({
  action,
  onStart,
}: {
  readonly action: PracticeAction;
  readonly onStart: (action: PracticeAction) => void;
}) => {
  const theme = useTheme();
  return (
    <RTSurface variant="raised" padding="lg" radius="xl" testID="practice-primary">
      <RTText role="sectionTitle" testID="practice-primary-title">
        {action.title}
      </RTText>
      <RTText
        role="body"
        tone="secondary"
        style={{ marginTop: theme.spacing.xs }}
        testID="practice-primary-description"
      >
        {action.description}
      </RTText>
      <RTText
        role="meta"
        tone="accent"
        style={{ marginTop: theme.spacing.md }}
        testID="practice-primary-meta"
      >
        {action.meta}
      </RTText>
      <RTButton
        label="Start drill"
        variant="gold"
        size="lg"
        fullWidth
        onPress={() => onStart(action)}
        testID="practice-primary-start"
        style={{ marginTop: theme.spacing.base }}
      />
    </RTSurface>
  );
};

/** Targeted practice: what to fix, and under a clock. */
export const PracticeTargeted = ({
  actions,
  onOpen,
}: {
  readonly actions: readonly PracticeAction[];
  readonly onOpen: (action: PracticeAction) => void;
}) => {
  if (actions.length === 0) return null;
  return (
    <View testID="practice-targeted">
      {actions.map((action) => (
        <RTListRow
          key={action.id}
          title={action.title}
          subtitle={action.meta}
          meta={action.description}
          onPress={() => onOpen(action)}
          chevron
          testID={`practice-action-${action.id}`}
        />
      ))}
    </View>
  );
};

const MoreRow = ({
  action,
  onOpen,
}: {
  readonly action: PracticeAction;
  readonly onOpen: (action: PracticeAction) => void;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(action)}
      testID={`practice-action-${action.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${action.title}. ${action.meta}. ${action.description}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget.comfortable,
        paddingVertical: theme.spacing.md,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role="cardTitle">{action.title}</RTText>
        <RTText role="meta" tone="secondary">
          {action.meta} · {action.description}
        </RTText>
      </View>
      <ChevronRightIcon color={theme.colors.textSecondary} />
    </Pressable>
  );
};

/** Everything else, behind one toggle. */
export const PracticeMore = ({
  actions,
  expanded,
  onToggle,
  onOpen,
}: {
  readonly actions: readonly PracticeAction[];
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onOpen: (action: PracticeAction) => void;
}) => {
  if (actions.length === 0) return null;
  return (
    <View testID="practice-more">
      <RTButton
        label={expanded ? 'Fewer options' : 'More practice'}
        variant="subtle"
        fullWidth
        onPress={onToggle}
        accessibilityHint={`${actions.length} more ways to practise`}
        testID="practice-more-toggle"
      />
      {expanded && (
        <View testID="practice-more-list" style={{ marginTop: 4 }}>
          {actions.map((action) => (
            <MoreRow key={action.id} action={action} onOpen={onOpen} />
          ))}
        </View>
      )}
    </View>
  );
};
