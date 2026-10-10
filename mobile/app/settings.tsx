import { useRouter } from 'expo-router';
import { Switch, View } from 'react-native';

import {
  RTButton,
  RTListGroup,
  RTListRow,
  RTScreenShell,
  RTSegmentedControl,
  RTSurface,
  RTStateView,
  RTText,
} from '@/components';
import {
  describeExamDate,
  describeStudyDays,
  parseStudyDays,
  sessionLengthLabel,
  trackName,
} from '@/domain/onboarding';
import type { Repositories } from '@/data/repositories';
import { useAccount } from '@/features/settings/use-account';
import { useReminders } from '@/features/settings/use-reminders';
import { useSettings } from '@/features/settings/use-settings';
import { useLocalData } from '@/store/LocalDataProvider';
import {
  TEXT_SIZE_LABELS,
  TEXT_SIZE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  useTheme,
} from '@/theme';

/**
 * Settings.
 *
 * A grouped, drill-down screen rather than another dashboard (see
 * `product/SETTINGS.md`). Plan details are edited by reopening onboarding in edit
 * mode, so the definition of a valid plan lives in exactly one place; appearance
 * and reminders save immediately. The debug entry to rerun onboarding only exists
 * in development builds.
 */
export default function SettingsScreen() {
  const { repositories } = useLocalData();

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-settings" title="Settings">
        <RTStateView kind="info" title="Loading settings" description="Opening your saved plan…" />
      </RTScreenShell>
    );
  }

  return <SettingsContent repositories={repositories} />;
}

const SettingsContent = ({ repositories }: { readonly repositories: Repositories }) => {
  const theme = useTheme();
  const router = useRouter();
  const model = useSettings(repositories);
  const account = useAccount(repositories);
  const reminders = useReminders(repositories);
  const { exam, profile, settings, content } = model;

  const sectionHeading = (label: string) => (
    <RTText
      role="eyebrow"
      tone="secondary"
      style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}
    >
      {label}
    </RTText>
  );

  if (model.status === 'loading') {
    return (
      <RTScreenShell testID="screen-settings" title="Settings">
        <RTStateView kind="info" title="Loading settings" description="Reading your saved plan…" />
      </RTScreenShell>
    );
  }

  if (model.status === 'error' || exam === null || profile === null || settings === null) {
    return (
      <RTScreenShell testID="screen-settings" title="Settings">
        <RTStateView
          kind="error"
          title="Could not load your settings"
          description={model.error?.message ?? 'Your saved preferences could not be read.'}
          actionLabel="Try again"
          onAction={model.reload}
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-settings"
      eyebrow="Settings"
      title={exam.name}
      onClose={() => router.back()}
      closeLabel="Close"
    >
      {sectionHeading('Account')}
      <RTListGroup>
        <RTListRow
          title={account.identityTitle}
          subtitle={account.identitySubtitle}
          meta={account.identityDetail}
          leading={
            <View
              style={{
                width: theme.touchTarget.comfortable,
                height: theme.touchTarget.comfortable,
                borderRadius: theme.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.accentSoft,
              }}
            >
              <RTText role="cardTitle" colorKey="onAccentSoft">
                {account.identityInitial}
              </RTText>
            </View>
          }
          testID="settings-account"
        />
        <RTListRow
          title="Sync"
          subtitle={account.syncLine}
          meta={account.pendingLine}
          testID="settings-sync"
        />
      </RTListGroup>
      {account.signedIn ? (
        <RTButton
          label="Sign out"
          variant="subtle"
          fullWidth
          loading={account.busy}
          onPress={account.continueAsGuest}
          testID="settings-sign-out"
          style={{ marginTop: theme.spacing.md }}
        />
      ) : (
        <RTButton
          label="Continue with Google"
          variant="primary"
          fullWidth
          disabled={!account.providerConfigured}
          loading={account.busy}
          onPress={account.signIn}
          accessibilityHint="Signs in so your progress can sync across devices."
          testID="settings-sign-in"
          style={{ marginTop: theme.spacing.md }}
        />
      )}
      <RTButton
        label="Sync now"
        variant="subtle"
        fullWidth
        loading={account.busy}
        onPress={account.runSync}
        testID="settings-sync-now"
        style={{ marginTop: theme.spacing.sm }}
      />
      {!account.providerConfigured && (
        <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          Google sign-in needs client IDs in this build. Everything else works offline.
        </RTText>
      )}
      {!account.storageAvailable && (
        <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          This device cannot store sign-in credentials, so your progress stays a guest.
        </RTText>
      )}
      {account.notice !== null && (
        <RTText
          role="meta"
          tone="secondary"
          testID="settings-account-notice"
          style={{ marginTop: theme.spacing.sm }}
        >
          {account.notice}
        </RTText>
      )}

      {sectionHeading('Study plan')}
      <RTListGroup>
        <RTListRow
          title="Level"
          subtitle={exam.name}
          meta={trackName(exam, profile.trackId)}
          onPress={() => model.openOnboarding('level')}
          chevron
          testID="settings-level"
        />
        <RTListRow
          title="Exam date"
          meta={describeExamDate(profile.examDate ?? '')}
          onPress={() => model.openOnboarding('starting-point')}
          chevron
          testID="settings-exam-date"
        />
        <RTListRow
          title="Study days"
          meta={describeStudyDays(parseStudyDays(profile.studyDays))}
          onPress={() => model.openOnboarding('schedule')}
          chevron
          testID="settings-study-days"
        />
        <RTListRow
          title="Daily goal"
          meta={`${profile.dailyGoal} questions`}
          onPress={() => model.openOnboarding('goal')}
          chevron
          testID="settings-daily-goal"
        />
        <RTListRow
          title="Typical session"
          meta={sessionLengthLabel(profile.sessionLength)}
          onPress={() => model.openOnboarding('schedule')}
          chevron
          testID="settings-session"
        />
      </RTListGroup>
      <RTButton
        label="Edit full plan"
        variant="subtle"
        fullWidth
        onPress={() => model.openOnboarding('plan')}
        testID="settings-edit-plan"
        style={{ marginTop: theme.spacing.md }}
      />

      {sectionHeading('Appearance')}
      <RTSegmentedControl
        label="Appearance"
        options={THEME_OPTIONS.map((value) => ({ value, label: THEME_LABELS[value] }))}
        value={settings.themePreference}
        onChange={model.setTheme}
        testID="settings-appearance"
      />
      <RTSurface variant="soft" padding="md" style={{ marginTop: theme.spacing.md }}>
        <RTText role="body">Plentiful means available in large amounts.</RTText>
      </RTSurface>
      <RTSegmentedControl
        label="Text size"
        options={TEXT_SIZE_OPTIONS.map((value) => ({ value, label: TEXT_SIZE_LABELS[value] }))}
        value={settings.textSize}
        onChange={model.setTextSize}
        testID="settings-text-size"
        style={{ marginTop: theme.spacing.md }}
      />

      {sectionHeading('Reminders')}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          minHeight: theme.touchTarget.comfortable,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <RTText role="body">Study reminders</RTText>
          <RTText role="meta" tone="secondary">
            One reminder a day on your study days.
          </RTText>
        </View>
        <Switch
          value={reminders.enabled}
          onValueChange={reminders.setEnabled}
          accessibilityLabel="Study reminders"
          testID="settings-reminders"
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        />
      </View>
      <RTSegmentedControl
        label="Reminder time"
        options={reminders.timeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={reminders.time}
        onChange={reminders.setTime}
        testID="settings-reminder-time"
        style={{ marginTop: theme.spacing.md }}
      />
      <RTText
        role="meta"
        tone="secondary"
        testID="settings-reminder-status"
        style={{ marginTop: theme.spacing.sm }}
      >
        {reminders.message}
      </RTText>

      {sectionHeading('Offline content')}
      <RTListGroup>
        <RTListRow
          title="Downloaded content"
          subtitle={
            content === null ? 'No content imported yet' : `Content ${content.contentVersion}`
          }
          meta={
            content === null
              ? undefined
              : `${content.questionCount} questions · ${content.importedAt.slice(0, 10)}`
          }
          testID="settings-content"
        />
      </RTListGroup>
      <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
        Every study feature works offline. Progress syncs when sync arrives.
      </RTText>

      {__DEV__ && (
        <>
          {sectionHeading('Development')}
          <RTListGroup>
            <RTListRow
              title="Run onboarding again"
              subtitle="Opens the approved flow with your saved answers."
              onPress={() => model.openOnboarding()}
              chevron
              testID="settings-rerun-onboarding"
            />
          </RTListGroup>
        </>
      )}
    </RTScreenShell>
  );
};
