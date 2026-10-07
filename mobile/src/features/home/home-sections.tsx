import { Pressable, View } from 'react-native';

import { RTOwlMark, RTProgressRing, RTSurface, RTText, SettingsIcon } from '@/components';
import type { HomeTask, ResumeCandidate } from '@/domain/home';
import { useTheme } from '@/theme';

import type { HomeModel } from './use-home';

/**
 * Home sections.
 *
 * The approved composition: one full-bleed hero that makes a single recommendation,
 * a "Today" timeline of three small things, the goal ring with the streak, and a
 * contextual resume card. Layout lives here so the route stays a thin screen.
 */

/** The hero: phase pill, one recommendation, the owl, and the dominant action. */
export const HomeHero = ({
  hero,
  onStartDrill,
  onOpenSettings,
  topInset,
}: {
  readonly hero: HomeModel['hero'];
  readonly onStartDrill: () => void;
  readonly onOpenSettings: () => void;
  readonly topInset: number;
}) => {
  const theme = useTheme();
  if (hero === null) return null;

  return (
    <View
      testID="home-hero"
      style={{
        backgroundColor: theme.colors.primary,
        borderBottomLeftRadius: theme.radius.heroBottom,
        borderBottomRightRadius: theme.radius.heroBottom,
        paddingTop: topInset + theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onOpenSettings}
        testID="home-settings"
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={theme.touchTarget.minimum / 2}
        style={({ pressed }) => ({
          position: 'absolute',
          right: theme.spacing.base,
          top: topInset + theme.spacing.sm,
          width: theme.touchTarget.minimum,
          height: theme.touchTarget.minimum,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.navHomeRing,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <SettingsIcon size={20} color={theme.colors.textInverse} />
      </Pressable>

      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: theme.colors.navHomeRing,
          borderRadius: theme.radius.pill,
          paddingVertical: theme.spacing.xs + 2,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <RTText role="meta" tone="inverse" testID="home-phase-pill">
          {hero.pill}
        </RTText>
      </View>

      <RTText
        role="display"
        tone="inverse"
        testID="home-headline"
        style={{ marginTop: theme.spacing.base, maxWidth: '64%' }}
      >
        {hero.headline}
      </RTText>
      <RTText
        role="body"
        tone="inverse"
        testID="home-context"
        style={{ marginTop: theme.spacing.sm, maxWidth: '58%', opacity: 0.82 }}
      >
        {hero.context}
      </RTText>

      <View style={{ marginTop: theme.spacing.md }}>
        <RTOwlMark width={124} />
      </View>

      <Pressable
        onPress={onStartDrill}
        testID="home-smart-drill"
        accessibilityRole="button"
        accessibilityLabel="Start Smart Drill"
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.lg,
          minHeight: theme.touchTarget.comfortable,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.gold,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <RTText role="button" colorKey="onGold">
          Start Smart Drill →
        </RTText>
      </Pressable>
      <RTText
        role="eyebrow"
        tone="inverse"
        testID="home-drill-meta"
        style={{ marginTop: theme.spacing.sm, opacity: 0.72 }}
      >
        {hero.metaUnder}
      </RTText>
    </View>
  );
};

/** One row of the Today timeline. */
const TimelineRow = ({
  title,
  meta,
  action,
  complete,
  onPress,
  testID,
}: {
  readonly title: string;
  readonly meta: string;
  readonly action: string;
  readonly complete: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}. ${action}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget.comfortable,
        paddingVertical: theme.spacing.md,
        paddingLeft: theme.spacing.lg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          position: 'absolute',
          left: -7,
          width: 12,
          height: 12,
          borderRadius: 6,
          borderWidth: theme.borderWidth.medium,
          borderColor: theme.colors.primary,
          backgroundColor: complete ? theme.colors.primary : theme.colors.canvas,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role="lead">{title}</RTText>
        <RTText role="meta" tone="secondary">
          {meta}
        </RTText>
      </View>
      <RTText role="button" tone="accent">
        {action}
      </RTText>
    </Pressable>
  );
};

export interface HomeTodayProps {
  readonly model: HomeModel;
  readonly onStartDrill: () => void;
  readonly onDailyQuestion: () => void;
  readonly onReview: () => void;
  readonly onTask: (task: HomeTask) => void;
}

/** "Today": three small things, the goal ring, the streak, and the plan's tasks. */
export const HomeToday = ({
  model,
  onStartDrill,
  onDailyQuestion,
  onReview,
  onTask,
}: HomeTodayProps) => {
  const theme = useTheme();
  const today = model.today;
  const actions = model.actions;
  if (today === null || actions === null) return null;

  return (
    <View style={{ paddingTop: theme.spacing.xl, paddingHorizontal: theme.spacing.xl }}>
      <RTText role="eyebrow" tone="secondary">
        Today
      </RTText>
      <RTText role="sectionTitle" style={{ marginTop: theme.spacing.xs }}>
        Three small things
      </RTText>

      <View
        testID="home-timeline"
        style={{
          marginLeft: theme.spacing.sm,
          borderLeftWidth: theme.borderWidth.hairline,
          borderLeftColor: theme.colors.border,
        }}
      >
        <TimelineRow
          title="Daily Question"
          meta={actions.dailyQuestion.meta}
          action={today.answered > 0 ? 'Done' : 'Open'}
          complete={today.answered > 0}
          onPress={onDailyQuestion}
          testID="home-daily-question"
        />
        <TimelineRow
          title="Smart Drill"
          meta={actions.drill.meta}
          action="Start"
          complete={today.planComplete}
          onPress={onStartDrill}
          testID="home-timeline-drill"
        />
        <TimelineRow
          title="Review Due"
          meta={actions.review.meta}
          action="Open"
          complete={today.doneForToday && today.answered > 0}
          onPress={onReview}
          testID="home-review-due"
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.base,
          marginTop: theme.spacing.xl,
        }}
      >
        <RTProgressRing
          value={today.progress}
          size={64}
          strokeWidth={8}
          label={`Today's goal: ${model.goalLine}`}
          testID="home-goal-ring"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <RTText role="cardTitle" testID="home-goal-line">
            {model.goalLine}
          </RTText>
          <RTText role="meta" tone="secondary" testID="home-streak-line">
            {model.streakLine}
          </RTText>
        </View>
      </View>

      {today.tasks.length > 0 && (
        <View testID="home-plan-tasks" style={{ marginTop: theme.spacing.lg }}>
          <RTText role="eyebrow" tone="secondary">
            From your plan
          </RTText>
          {today.tasks.map((planned, index) => (
            <Pressable
              key={`${planned.kind}-${index}`}
              onPress={() => onTask(planned)}
              testID={`home-task-${planned.kind}`}
              accessibilityRole="button"
              accessibilityLabel={`${planned.label}, ${planned.targetCount} questions`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
                minHeight: theme.touchTarget.minimum,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <RTText role="body">{planned.label}</RTText>
              <RTText role="meta" tone="secondary">
                {planned.targetCount} questions
              </RTText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

/** Contextual resume: an unfinished mock or practice session. */
export const HomeResumeCard = ({
  model,
  onResume,
}: {
  readonly model: HomeModel;
  readonly onResume: (candidate: ResumeCandidate) => void;
}) => {
  const theme = useTheme();
  const resume = model.resume;
  if (resume === null) return null;

  return (
    <RTSurface
      variant="brand"
      padding="md"
      radius="lg"
      testID="home-resume"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginTop: theme.spacing.xl,
        marginHorizontal: theme.spacing.xl,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role="eyebrow" tone="inverse">
          {resume.kind === 'mock' ? 'Continue mock exam' : 'Continue practice'}
        </RTText>
        <RTText role="cardTitle" tone="inverse" testID="home-resume-progress">
          {model.resumeProgress}
        </RTText>
        <RTText role="meta" tone="inverse" style={{ opacity: 0.78 }}>
          Pick up where you stopped.
        </RTText>
      </View>
      <Pressable
        onPress={() => onResume(resume)}
        testID="home-resume-action"
        accessibilityRole="button"
        accessibilityLabel="Resume"
        style={({ pressed }) => ({
          minHeight: theme.touchTarget.minimum,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.base,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.gold,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <RTText role="button" colorKey="onGold">
          Resume
        </RTText>
      </Pressable>
      <Pressable
        onPress={model.dismissResume}
        testID="home-resume-dismiss"
        accessibilityRole="button"
        accessibilityLabel="Dismiss resume"
        hitSlop={theme.touchTarget.minimum / 2}
        style={({ pressed }) => ({
          width: theme.touchTarget.minimum,
          height: theme.touchTarget.minimum,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <RTText role="lead" tone="inverse">
          ×
        </RTText>
      </Pressable>
    </RTSurface>
  );
};
