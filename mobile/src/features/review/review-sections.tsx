import { Pressable, View } from 'react-native';

import { RTButton, RTListGroup, RTListRow, RTOwlMark, RTSurface, RTText } from '@/components';
import type { DeckCompletion, ReviewCard } from '@/domain/review';
import { describeLapses } from '@/domain/review';
import type { ReviewListItem } from '@/services/review';
import { useTheme } from '@/theme';

/**
 * Review sections.
 *
 * The approved composition: one number worth reacting to, a duration that says what it
 * costs, and then four plain rows for everything the number does not cover. The deck
 * itself is a card — the concept on the front, its own summary on the back — because
 * Review Due is the learner asking themselves whether they still know it, and that is
 * not a question four options can answer.
 */

export const ReviewHeader = ({
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
      <RTText role="eyebrow" tone="secondary" testID="review-eyebrow">
        {eyebrow}
      </RTText>
      <RTText role="pageTitle" testID="review-title" style={{ marginTop: theme.spacing.xs }}>
        {title}
      </RTText>
    </View>
  );
};

/** The count and its cost, centred the way the reference draws it. */
export const ReviewSummary = ({
  count,
  meta,
  onStart,
}: {
  readonly count: number;
  readonly meta: string;
  readonly onStart: () => void;
}) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: theme.spacing.xl }}>
      <RTText role="countLarge" testID="review-count">
        {String(count)}
      </RTText>
      <RTText
        role="body"
        tone="secondary"
        testID="review-meta"
        style={{ marginTop: theme.spacing.xs }}
      >
        {meta}
      </RTText>
      <RTButton
        label="Review now"
        variant="primary"
        size="lg"
        fullWidth
        onPress={onStart}
        testID="review-start"
        style={{ marginTop: theme.spacing.xl }}
      />
    </View>
  );
};

/** Nothing is due. Said once, warmly, and then out of the way. */
export const ReviewCaughtUp = ({ description }: { readonly description: string }) => {
  const theme = useTheme();
  return (
    <View
      testID="review-caught-up"
      style={{ alignItems: 'center', paddingTop: theme.spacing.xl, gap: theme.spacing.sm }}
    >
      <RTOwlMark width={110} mood="resting" />
      <RTText role="display" testID="review-caught-up-title">
        {"You're caught up."}
      </RTText>
      <RTText role="body" tone="secondary" style={{ textAlign: 'center' }}>
        {description}
      </RTText>
    </View>
  );
};

export interface ReviewRowCounts {
  readonly mistakes: number;
  readonly saved: number;
  readonly revisit: number;
  readonly history: number;
}

/** Mistakes, saved questions, concepts to revisit and the week's history. */
export const ReviewRows = ({
  counts,
  historyLine,
  onOpen,
}: {
  readonly counts: ReviewRowCounts;
  readonly historyLine: string;
  readonly onOpen: (kind: 'mistakes' | 'saved' | 'revisit' | 'history') => void;
}) => {
  const theme = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.xxl }}>
      <RTListGroup>
        <RTListRow
          title="Mistakes"
          subtitle="Concepts you got wrong, and when they come back"
          badgeCount={counts.mistakes}
          chevron
          onPress={() => onOpen('mistakes')}
          testID="review-row-mistakes"
        />
        <RTListRow
          title="Saved"
          subtitle="Questions you bookmarked"
          badgeCount={counts.saved}
          chevron
          onPress={() => onOpen('saved')}
          testID="review-row-saved"
        />
        <RTListRow
          title="Concepts to revisit"
          subtitle="Started, still not strong"
          badgeCount={counts.revisit}
          chevron
          onPress={() => onOpen('revisit')}
          testID="review-row-revisit"
        />
        <RTListRow
          title="Review history"
          subtitle={historyLine}
          chevron
          showDivider={false}
          onPress={() => onOpen('history')}
          testID="review-row-history"
        />
      </RTListGroup>
    </View>
  );
};

/** One card: the concept on the front, its own summary on the back. */
export const ReviewCardView = ({
  card,
  revealed,
  onReveal,
}: {
  readonly card: ReviewCard;
  readonly revealed: boolean;
  readonly onReveal: () => void;
}) => {
  const theme = useTheme();
  const lapses = describeLapses(card.lapses);
  const meta = lapses === '' ? card.subjectName : `${card.subjectName} · ${lapses}`;

  return (
    <View testID="review-card" style={{ gap: theme.spacing.sm }}>
      <RTText role="eyebrow" tone="secondary" testID="review-card-meta">
        {meta}
      </RTText>
      <Pressable
        onPress={onReveal}
        disabled={revealed || card.answer === ''}
        accessibilityRole="button"
        accessibilityLabel={
          revealed || card.answer === '' ? card.conceptName : `${card.conceptName}. Tap to reveal`
        }
        testID="review-card-face"
      >
        <RTSurface variant="raised" padding="lg" radius="xxl" elevated>
          <RTText role="display" testID="review-card-prompt">
            {card.prompt}
          </RTText>
          {card.answer === '' ? (
            <RTText
              role="body"
              tone="secondary"
              testID="review-card-empty"
              style={{ marginTop: theme.spacing.md }}
            >
              Nothing is written for this concept yet. Open it to read around it.
            </RTText>
          ) : revealed ? (
            <RTText role="body" testID="review-card-answer" style={{ marginTop: theme.spacing.md }}>
              {card.answer}
            </RTText>
          ) : (
            <RTText
              role="meta"
              tone="secondary"
              testID="review-card-hint"
              style={{ marginTop: theme.spacing.md }}
            >
              Tap to reveal
            </RTText>
          )}
        </RTSurface>
      </Pressable>
    </View>
  );
};

/** Again / Got it, plus the way back to the concept itself. */
export const ReviewActions = ({
  disabled,
  onAgain,
  onGotIt,
  onOpenConcept,
}: {
  readonly disabled: boolean;
  readonly onAgain: () => void;
  readonly onGotIt: () => void;
  readonly onOpenConcept: () => void;
}) => {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <RTButton
          label="Again"
          variant="subtle"
          size="lg"
          onPress={onAgain}
          disabled={disabled}
          accessibilityHint="Ask me this again in a few days"
          testID="review-again"
          style={{ flex: 1 }}
        />
        <RTButton
          label="Got it"
          variant="primary"
          size="lg"
          onPress={onGotIt}
          disabled={disabled}
          accessibilityHint="I know this one"
          testID="review-got-it"
          style={{ flex: 1 }}
        />
      </View>
      <RTButton
        label="Open this concept"
        variant="ghost"
        size="sm"
        onPress={onOpenConcept}
        testID="review-open-concept"
      />
    </View>
  );
};

/** The end of a deck. */
export const ReviewComplete = ({
  completion,
  onDone,
}: {
  readonly completion: DeckCompletion;
  readonly onDone: () => void;
}) => {
  const theme = useTheme();
  return (
    <View
      testID="review-complete"
      style={{ alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.xl }}
    >
      <RTOwlMark width={110} />
      <RTText role="display" testID="review-complete-title">
        {completion.title}
      </RTText>
      <RTText role="body" tone="secondary" style={{ textAlign: 'center' }}>
        {completion.description}
      </RTText>
      <RTButton
        label="Done"
        variant="primary"
        size="lg"
        fullWidth
        onPress={onDone}
        testID="review-complete-done"
        style={{ marginTop: theme.spacing.lg }}
      />
    </View>
  );
};

/** The rows behind Review's four lists. */
export const ReviewListRows = ({
  items,
  onOpenConcept,
}: {
  readonly items: readonly ReviewListItem[];
  readonly onOpenConcept: (conceptId: string | null) => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="review-list" style={{ marginTop: theme.spacing.lg }}>
      {items.map((item) => (
        <RTSurface
          key={item.id}
          variant="soft"
          padding="md"
          radius="lg"
          style={{ marginBottom: theme.spacing.md }}
          testID={`review-list-row-${item.id}`}
        >
          <RTText role="cardTitle">{item.title}</RTText>
          <RTText role="meta" tone="secondary" style={{ marginTop: 2 }}>
            {item.meta === '' ? item.subtitle : `${item.subtitle} · ${item.meta}`}
          </RTText>
          {item.detail !== null && (
            <RTText role="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
              {item.detail}
            </RTText>
          )}
          {item.conceptId !== null && (
            <RTButton
              label="Open concept"
              variant="ghost"
              size="sm"
              onPress={() => onOpenConcept(item.conceptId)}
              testID={`review-list-open-${item.id}`}
              style={{ alignSelf: 'flex-start', marginTop: theme.spacing.sm }}
            />
          )}
        </RTSurface>
      ))}
    </View>
  );
};
