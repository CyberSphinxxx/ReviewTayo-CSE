import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  RTOwlMark,
  RTBadge,
  RTBrandCard,
  RTButton,
  RTChoice,
  RTProgressBar,
  RTProgressRing,
  RTSegmentedControl,
  RTStateView,
  RTStat,
  RTStatRow,
  RTSurface,
  RTText,
  RTListRow,
  RTListGroup,
} from '@/components';
import { useAppearance } from '@/store/AppearanceProvider';
import {
  TEXT_SIZE_LABELS,
  TEXT_SIZE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  useTheme,
} from '@/theme';

/**
 * Design system probe.
 *
 * A development-only screen that renders every primitive in the current theme and
 * text size. It exists so visual QA (light/dark, Standard/Large/Extra Large) can
 * be inspected on a device without navigating the whole app, and it doubles as the
 * harness used by the component tests.
 */

export default function DesignSystemScreen() {
  const theme = useTheme();
  const appearance = useAppearance();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      testID="design-system-probe"
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.base,
        paddingBottom: insets.bottom + theme.spacing.xxl,
        gap: theme.spacing.xl,
      }}
    >
      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="eyebrow" tone="secondary">
          Design system
        </RTText>
        <RTText role="display">{`${THEME_LABELS[appearance.themePreference]} · ${TEXT_SIZE_LABELS[appearance.textSize]}`}</RTText>
        <RTSegmentedControl
          label="Appearance"
          value={appearance.themePreference}
          onChange={appearance.setThemePreference}
          options={THEME_OPTIONS.map((value) => ({ value, label: THEME_LABELS[value] }))}
          testID="probe-theme"
        />
        <RTSegmentedControl
          label="Text size"
          value={appearance.textSize}
          onChange={appearance.setTextSize}
          options={TEXT_SIZE_OPTIONS.map((value) => ({ value, label: TEXT_SIZE_LABELS[value] }))}
          testID="probe-text-size"
        />
      </View>

      <RTBrandCard
        variant="hero"
        eyebrow="Accuracy Phase · 44 days left"
        title="Your next 10 are ready."
        subtitle="Verbal Ability needs a little love today."
      >
        <RTButton label="Start Smart Drill" variant="gold" onPress={() => undefined} />
      </RTBrandCard>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Buttons</RTText>
        <RTButton label="Gold primary" variant="gold" onPress={() => undefined} />
        <RTButton label="Maroon primary" variant="primary" onPress={() => undefined} />
        <RTButton label="Subtle" variant="subtle" onPress={() => undefined} />
        <RTButton label="Outline" variant="outline" onPress={() => undefined} />
        <RTButton label="Ghost" variant="ghost" onPress={() => undefined} />
        <RTButton label="Disabled" variant="primary" disabled onPress={() => undefined} />
        <RTButton label="Loading" variant="primary" loading onPress={() => undefined} />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Badges &amp; mastery</RTText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <RTBadge label="Neutral" />
          <RTBadge label="Success" tone="success" />
          <RTBadge label="Danger" tone="danger" />
          <RTBadge label="Gold" tone="gold" />
          <RTBadge label="Learning" mastery="Learning" />
          <RTBadge label="Developing" mastery="Developing" />
          <RTBadge label="Strong" mastery="Strong" />
          <RTBadge label="Mastered" mastery="Mastered" />
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Progress</RTText>
        <RTProgressBar value={0.64} label="Verbal Ability accuracy" />
        <RTProgressBar value={0.82} tone="gold" label="Weekly goal" />
        <RTProgressRing value={0.4} size={72} label="Daily goal">
          <RTText role="meta">4/10</RTText>
        </RTProgressRing>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Stats</RTText>
        <RTStatRow>
          <RTStat value={12} label="day streak" />
          <RTStat value="72%" label="study score" tone="accent" />
        </RTStatRow>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Rows</RTText>
        <RTListGroup>
          <RTListRow title="Mistakes" badgeCount={23} chevron onPress={() => undefined} />
          <RTListRow title="Saved" badgeCount={8} chevron onPress={() => undefined} />
          <RTListRow title="Review history" subtitle="48 concepts this week" chevron />
        </RTListGroup>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Choices</RTText>
        <RTChoice
          title="Continue with Google"
          description="Sync progress across devices."
          selected
          onPress={() => undefined}
        />
        <RTChoice
          title="Continue as guest"
          description="Keep progress on this device."
          selected={false}
          onPress={() => undefined}
        />
      </View>

      <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <RTText role="sectionTitle">Surfaces &amp; states</RTText>
        <RTSurface variant="paper" elevated>
          <RTText role="cardTitle">Paper surface</RTText>
          <RTText role="meta" tone="secondary">
            Elevated card on the canvas.
          </RTText>
        </RTSurface>
        <RTSurface variant="soft">
          <RTText role="cardTitle">Soft surface</RTText>
        </RTSurface>
        <RTStateView
          kind="empty"
          title="You're caught up."
          description="Nothing needs review right now."
          actionLabel="Browse saved questions"
          onAction={() => undefined}
          illustration={<RTOwlMark width={88} />}
        />
        <RTStateView
          kind="error"
          title="We couldn't load your plan"
          description="Your progress is safe. Try again in a moment."
          actionLabel="Retry"
          onAction={() => undefined}
        />
        <RTStateView
          kind="offline"
          title="You're offline"
          description="Studying still works — your answers are saved on this device."
        />
      </View>
    </ScrollView>
  );
}
