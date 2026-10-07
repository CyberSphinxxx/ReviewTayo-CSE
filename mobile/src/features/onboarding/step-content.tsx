import { Pressable, Switch, TextInput, View } from 'react-native';

import {
  RTBadge,
  RTButton,
  RTChoice,
  RTOwlMark,
  RTSegmentedControl,
  RTSurface,
  RTText,
} from '@/components';
import {
  ACCOUNT_CHOICES,
  ACCOUNT_DESCRIPTIONS,
  ACCOUNT_LABELS,
  describeDaysUntil,
  describeExamDate,
  describeGoalPace,
  describeStudyDays,
  describeTrack,
  GOAL_PRESETS,
  GOOGLE_SYNC_NOTE,
  SESSION_LENGTHS,
  SESSION_LENGTH_HINTS,
  SESSION_LENGTH_LABELS,
  STARTING_POINTS,
  STARTING_POINT_DESCRIPTIONS,
  STARTING_POINT_LABELS,
  STUDY_DAY_LABELS,
  trackName,
  type FirstActivity,
} from '@/domain/onboarding';
import {
  TEXT_SIZE_LABELS,
  TEXT_SIZE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  useTheme,
} from '@/theme';

import type { OnboardingModel } from './use-onboarding';

/**
 * Onboarding step bodies.
 *
 * One component per approved step, driven entirely by the model. Copy that is part
 * of the flow's meaning (labels, descriptions, pace hints) comes from the domain so
 * the screens hold layout, not vocabulary.
 */

const DAY_FULL_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const StepHeading = ({ title, copy }: { readonly title: string; readonly copy?: string }) => {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.base }}>
      <RTText role="pageTitle">{title}</RTText>
      {copy !== undefined && (
        <RTText role="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          {copy}
        </RTText>
      )}
    </View>
  );
};

const PlanRow = ({ label, value }: { readonly label: string; readonly value: string }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <RTText role="body" tone="secondary">
        {label}
      </RTText>
      <RTText role="lead" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </RTText>
    </View>
  );
};

const FirstActivityCard = ({
  activity,
  eyebrow,
}: {
  readonly activity: FirstActivity;
  readonly eyebrow: string;
}) => {
  const theme = useTheme();
  return (
    <RTSurface
      variant="soft"
      padding="md"
      radius="lg"
      testID="first-activity-card"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
      }}
    >
      <RTOwlMark width={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <RTText role="eyebrow" tone="secondary">
          {eyebrow}
        </RTText>
        <RTText role="lead">{activity.label}</RTText>
        <RTText role="meta" tone="secondary">
          {activity.detail}
        </RTText>
      </View>
    </RTSurface>
  );
};

const DayChip = ({
  label,
  fullName,
  selected,
  onPress,
  testID,
}: {
  readonly label: string;
  readonly fullName: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${fullName} study day`}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: theme.touchTarget.minimum,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth.thin,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <RTText
        role="button"
        style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}
      >
        {label}
      </RTText>
    </Pressable>
  );
};

const GoalCard = ({
  goal,
  selected,
  onPress,
  testID,
}: {
  readonly goal: number;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${goal} questions a day, about ${describeGoalPace(goal)}`}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 108,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderWidth: theme.borderWidth.thin,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.surfaceSoft : theme.colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <RTText
        role="score"
        style={{ color: selected ? theme.colors.accentText : theme.colors.text }}
      >
        {goal}
      </RTText>
      <RTText role="meta" tone="secondary" style={{ textAlign: 'center' }}>
        questions{'\n'}
        {describeGoalPace(goal)}
      </RTText>
    </Pressable>
  );
};

const AccountStep = ({ model }: { readonly model: OnboardingModel }) => {
  const { draft } = model;
  if (draft === null) return null;
  return (
    <View testID="onboarding-step-account" style={{ gap: 0 }}>
      <StepHeading
        title="Keep your progress?"
        copy="Choose how ReviewTayo saves your study activity."
      />
      {ACCOUNT_CHOICES.map((account) => (
        <RTChoice
          key={account}
          title={ACCOUNT_LABELS[account]}
          description={ACCOUNT_DESCRIPTIONS[account]}
          selected={draft.account === account}
          onPress={() => model.selectAccount(account)}
          marker="radio"
          testID={`account-${account}`}
        />
      ))}
      {draft.account === 'google' && (
        <RTText role="meta" tone="secondary">
          {GOOGLE_SYNC_NOTE}
        </RTText>
      )}
    </View>
  );
};

const LevelStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft, exam } = model;
  if (draft === null || exam === null) return null;
  return (
    <View testID="onboarding-step-level">
      <StepHeading
        title={`Which ${exam.shortName} level are you taking?`}
        copy="We'll match your subjects and mock exams."
      />
      {exam.tracks.map((track) => (
        <RTChoice
          key={track.id}
          title={track.name}
          description={describeTrack(exam, track.id)}
          selected={draft.trackId === track.id}
          onPress={() => model.selectTrack(track.id)}
          marker="radio"
          testID={`track-${track.id}`}
        />
      ))}
      <RTText role="meta" tone="secondary">
        You can change this later in Settings.
      </RTText>
      <View style={{ height: theme.spacing.xs }} />
    </View>
  );
};

const StartingPointStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft } = model;
  if (draft === null) return null;
  const hint = describeDaysUntil(draft.examDate);

  return (
    <View testID="onboarding-step-starting-point">
      <StepHeading title="Where should we start?" copy="Pick what sounds closest to you." />
      {STARTING_POINTS.map((point) => (
        <RTChoice
          key={point}
          title={STARTING_POINT_LABELS[point]}
          description={STARTING_POINT_DESCRIPTIONS[point]}
          selected={draft.startingPoint === point}
          onPress={() => model.selectStartingPoint(point)}
          marker="radio"
          testID={`starting-point-${point}`}
        />
      ))}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: theme.spacing.sm,
        }}
      >
        <RTText role="eyebrow" tone="secondary">
          Exam date
        </RTText>
        <RTText role="meta" tone="secondary">
          Optional
        </RTText>
      </View>
      <TextInput
        value={draft.examDate}
        onChangeText={model.setExamDate}
        testID="exam-date-input"
        accessibilityLabel="Exam date"
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        returnKeyType="done"
        style={{
          marginTop: theme.spacing.sm,
          minHeight: theme.touchTarget.comfortable,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.base,
          color: theme.colors.text,
          fontSize: 16,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          marginTop: theme.spacing.sm,
        }}
      >
        <RTText
          role="meta"
          tone={hint?.includes('passed') === true ? 'danger' : 'secondary'}
          style={{ flexShrink: 1 }}
        >
          {hint ?? "Leave blank if you haven't booked a date yet."}
        </RTText>
        {draft.examDate.trim().length > 0 && (
          <RTButton
            label="Clear date"
            variant="ghost"
            size="sm"
            onPress={() => model.setExamDate('')}
            testID="clear-exam-date"
          />
        )}
      </View>
    </View>
  );
};

const ScheduleStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft } = model;
  if (draft === null) return null;

  return (
    <View testID="onboarding-step-schedule">
      <StepHeading
        title="When can you usually study?"
        copy="We'll build your week around your schedule."
      />
      <RTText role="eyebrow" tone="secondary">
        Study days
      </RTText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.sm,
        }}
      >
        {STUDY_DAY_LABELS.map((label, index) => (
          <DayChip
            key={label}
            label={label}
            fullName={DAY_FULL_NAMES[index] ?? label}
            selected={draft.studyDays.includes(index)}
            onPress={() => model.toggleDay(index)}
            testID={`study-day-${index}`}
          />
        ))}
      </View>
      <RTText role="meta" tone="secondary">
        {draft.studyDays.length === 0
          ? 'No fixed days — your plan stays flexible.'
          : describeStudyDays(draft.studyDays)}
      </RTText>

      <View style={{ height: theme.spacing.lg }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <RTText role="eyebrow" tone="secondary">
          Typical session
        </RTText>
        <RTText role="meta" tone="secondary">
          Optional
        </RTText>
      </View>
      <View style={{ marginTop: theme.spacing.md }}>
        {SESSION_LENGTHS.map((length) => (
          <RTChoice
            key={length}
            title={SESSION_LENGTH_LABELS[length]}
            description={SESSION_LENGTH_HINTS[length]}
            selected={draft.sessionLength === length}
            onPress={() => model.selectSessionLength(length)}
            marker="radio"
            testID={`session-${length}`}
          />
        ))}
      </View>
    </View>
  );
};

const GoalStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft, customGoal } = model;
  if (draft === null) return null;
  const customSelected = customGoal.open && customGoal.text.length > 0;

  return (
    <View testID="onboarding-step-goal">
      <StepHeading
        title="What feels doable most days?"
        copy="Choose a daily question goal. You can change it anytime."
      />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {GOAL_PRESETS.map((goal) => (
          <GoalCard
            key={goal}
            goal={goal}
            selected={!customSelected && draft.dailyGoal === goal}
            onPress={() => model.selectGoal(goal)}
            testID={`goal-${goal}`}
          />
        ))}
      </View>

      <Pressable
        onPress={model.openCustomGoal}
        testID="custom-goal-row"
        accessibilityRole="button"
        accessibilityLabel="Custom goal"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          minHeight: theme.touchTarget.comfortable,
          marginTop: theme.spacing.md,
          paddingHorizontal: theme.spacing.base,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: customSelected ? theme.colors.primary : theme.colors.border,
          backgroundColor: customSelected ? theme.colors.surfaceSoft : theme.colors.surface,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <RTText role="lead">Custom goal</RTText>
        <RTText role="meta" tone="secondary">
          {customSelected ? `${customGoal.text} questions` : '5–50 questions'}
        </RTText>
      </Pressable>

      {customGoal.open && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <TextInput
            value={customGoal.text}
            onChangeText={model.setCustomGoal}
            testID="custom-goal-input"
            accessibilityLabel="Custom daily goal"
            placeholder="Questions per day"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
            maxLength={3}
            style={{
              minHeight: theme.touchTarget.comfortable,
              borderRadius: theme.radius.md,
              borderWidth: theme.borderWidth.thin,
              borderColor:
                model.customGoal.text.length > 0 && model.issue !== null
                  ? theme.colors.danger
                  : theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.spacing.base,
              color: theme.colors.text,
              fontSize: 16,
            }}
          />
          <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
            Enter a number between 5 and 50.
          </RTText>
        </View>
      )}
    </View>
  );
};

const PlanStep = ({ model }: { readonly model: OnboardingModel }) => {
  const { draft, exam, firstActivity } = model;
  if (draft === null || exam === null) return null;

  return (
    <View testID="onboarding-step-plan">
      <StepHeading title="Here's your study plan" copy="Review anything you'd like to change." />
      <RTSurface variant="paper" bordered padding="lg" testID="plan-card">
        <PlanRow label={`${exam.shortName} level`} value={trackName(exam, draft.trackId)} />
        <PlanRow label="Starting point" value={STARTING_POINT_LABELS[draft.startingPoint]} />
        <PlanRow label="Study days" value={describeStudyDays(draft.studyDays)} />
        <PlanRow label="Daily goal" value={`${draft.dailyGoal} questions`} />
        <PlanRow label="Session" value={SESSION_LENGTH_LABELS[draft.sessionLength]} />
        <PlanRow label="Exam date" value={describeExamDate(draft.examDate)} />
      </RTSurface>
      {firstActivity !== null && (
        <FirstActivityCard activity={firstActivity} eyebrow="YOUR FIRST ACTIVITY" />
      )}
      <RTButton
        label="Adjust plan"
        variant="ghost"
        onPress={model.adjustPlan}
        testID="adjust-plan"
      />
    </View>
  );
};

const PreferencesStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft } = model;
  if (draft === null) return null;

  return (
    <View testID="onboarding-step-preferences">
      <StepHeading title="Make it yours" copy="A few optional preferences before you begin." />

      <RTText role="eyebrow" tone="secondary">
        Appearance
      </RTText>
      <RTSegmentedControl
        label="Appearance"
        options={THEME_OPTIONS.map((value) => ({ value, label: THEME_LABELS[value] }))}
        value={draft.themePreference}
        onChange={model.selectTheme}
        testID="appearance"
        style={{ marginTop: theme.spacing.sm }}
      />

      <View style={{ height: theme.spacing.lg }} />
      <RTText role="eyebrow" tone="secondary">
        Text size
      </RTText>
      <RTSurface variant="soft" padding="md" style={{ marginTop: theme.spacing.sm }}>
        <RTText role="body">Plentiful means available in large amounts.</RTText>
      </RTSurface>
      <RTSegmentedControl
        label="Text size"
        options={TEXT_SIZE_OPTIONS.map((value) => ({ value, label: TEXT_SIZE_LABELS[value] }))}
        value={draft.textSize}
        onChange={model.selectTextSize}
        testID="text-size"
        style={{ marginTop: theme.spacing.sm }}
      />

      <View style={{ height: theme.spacing.lg }} />
      <RTText role="eyebrow" tone="secondary">
        Study reminders
      </RTText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          marginTop: theme.spacing.sm,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <RTText role="body">Remind me on study days</RTText>
          <RTText role="meta" tone="secondary">
            Build the habit with one reminder a day.
          </RTText>
        </View>
        <Switch
          value={draft.remindersEnabled}
          onValueChange={model.setReminders}
          accessibilityLabel="Study reminders"
          testID="reminders-switch"
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
    </View>
  );
};

const DoneStep = ({ model }: { readonly model: OnboardingModel }) => {
  const theme = useTheme();
  const { draft, exam, firstActivity } = model;
  if (draft === null || exam === null) return null;

  return (
    <View testID="onboarding-step-done">
      <View style={{ alignItems: 'center', marginTop: theme.spacing.sm }}>
        <RTOwlMark width={126} />
        <RTText role="display" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
          {"You're all set!"}
        </RTText>
        <RTText role="body" tone="secondary" style={{ textAlign: 'center' }}>
          Your {exam.shortName} study plan is ready.
        </RTText>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            justifyContent: 'center',
            marginTop: theme.spacing.md,
          }}
        >
          <RTBadge label={trackName(exam, draft.trackId)} tone="accent" />
          <RTBadge label={`${draft.dailyGoal} / day`} tone="accent" />
          <RTBadge
            label={
              draft.studyDays.length === 0
                ? 'Flexible schedule'
                : `${draft.studyDays.length} study days`
            }
            tone="accent"
          />
        </View>
      </View>
      {firstActivity !== null && <FirstActivityCard activity={firstActivity} eyebrow="FIRST UP" />}
      <RTText
        role="meta"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: theme.spacing.base }}
      >
        {draft.account === 'guest'
          ? 'Saved on this device. Create an account later to sync.'
          : 'Your progress is saved on this device and will sync when sign-in arrives.'}
      </RTText>
    </View>
  );
};

export const OnboardingStepBody = ({ model }: { readonly model: OnboardingModel }) => {
  switch (model.step) {
    case 'account':
      return <AccountStep model={model} />;
    case 'level':
      return <LevelStep model={model} />;
    case 'starting-point':
      return <StartingPointStep model={model} />;
    case 'schedule':
      return <ScheduleStep model={model} />;
    case 'goal':
      return <GoalStep model={model} />;
    case 'plan':
      return <PlanStep model={model} />;
    case 'preferences':
      return <PreferencesStep model={model} />;
    case 'done':
    default:
      return <DoneStep model={model} />;
  }
};
