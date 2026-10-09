import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { RTButton, RTChoice, RTProgressBar, RTSurface, RTText, RTOwlMark } from '@/components';
import { formatClock } from '@/domain/exams';
import type { MockResult } from '@/domain/mock';
import { describeMockScore, describeMockSkipped } from '@/domain/mock';
import type { MockSetup } from '@/services/mock';
import { useTheme } from '@/theme';

import type { MockRunnerModel } from './use-mock-runner';

/**
 * Mock exam sections.
 *
 * Three faces of one screen. The setup states the paper's facts before anything starts,
 * including what this build cannot serve; the runner is deliberately plain — the question,
 * its choices, a clock, a mark and a way to move — because an examination is not a place
 * for explanations; and the result reports the score, the section breakdown and one next
 * step, without ever pronouncing on whether the learner passed.
 */

export const MockNotice = ({ message }: { readonly message: string | null }) => {
  const theme = useTheme();
  if (message === null) return null;
  return (
    <View
      testID="mock-notice"
      style={{
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.dangerSoft,
      }}
    >
      <RTText role="meta" tone="danger">
        {message}
      </RTText>
    </View>
  );
};

/** What the paper is, before it starts. */
export const MockSetupView = ({
  setup,
  starting,
  onStart,
}: {
  readonly setup: MockSetup;
  readonly starting: boolean;
  readonly onStart: () => void;
}) => {
  const theme = useTheme();
  const { summary } = setup;

  return (
    <View testID="mock-setup" style={{ gap: theme.spacing.md }}>
      <RTText role="display" testID="mock-setup-title">
        {summary.trackName}
      </RTText>
      <RTText role="body" tone="secondary">
        {
          'A full simulation: the exam’s own sections, the exam’s own clock, and no explanations until the end.'
        }
      </RTText>

      <View style={{ flexDirection: 'row', gap: theme.spacing.xl, marginTop: theme.spacing.sm }}>
        <View testID="mock-fact-items">
          <RTText role="score">{summary.totalItems}</RTText>
          <RTText role="meta" tone="secondary">
            items
          </RTText>
        </View>
        <View testID="mock-fact-duration">
          <RTText role="score">{summary.durationLabel}</RTText>
          <RTText role="meta" tone="secondary">
            time
          </RTText>
        </View>
        <View testID="mock-fact-sections">
          <RTText role="score">{summary.allocations.length}</RTText>
          <RTText role="meta" tone="secondary">
            sections
          </RTText>
        </View>
      </View>

      <RTSurface variant="soft" padding="md" radius="lg" testID="mock-sections">
        {setup.sections.map((section) => (
          <View
            key={section.subjectId}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <RTText role="bodySmall" testID={`mock-section-${section.subjectId}`}>
              {section.subjectName}
            </RTText>
            <RTText role="meta" tone="secondary">
              {section.planned < section.requested
                ? `${section.planned} of ${section.requested} items`
                : `${section.requested} items`}
            </RTText>
          </View>
        ))}
      </RTSurface>

      {setup.shortfallNote !== null && (
        <RTText role="meta" tone="secondary" testID="mock-shortfall">
          {`${setup.shortfallNote} The clock still runs for the exam’s full time.`}
        </RTText>
      )}

      <RTText role="meta" tone="secondary" testID="mock-pause-note">
        {summary.allowPause
          ? 'You can pause the clock, and pick the paper up again later.'
          : 'Once started, the clock does not stop.'}
      </RTText>

      <RTButton
        label="Start mock exam"
        variant="primary"
        size="lg"
        fullWidth
        loading={starting}
        onPress={onStart}
        testID="mock-start"
        style={{ marginTop: theme.spacing.md }}
      />
    </View>
  );
};

/** One cell of the question grid: answered, flagged, current, or still empty. */
const GridCell = ({
  number,
  answered,
  flagged,
  current,
  onPress,
}: {
  readonly number: number;
  readonly answered: boolean;
  readonly flagged: boolean;
  readonly current: boolean;
  readonly onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={`mock-grid-cell-${number}`}
      accessibilityRole="button"
      accessibilityLabel={`Question ${number}${answered ? ', answered' : ', unanswered'}${
        flagged ? ', marked for review' : ''
      }${current ? ', current' : ''}`}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.sm,
        borderWidth: current ? theme.borderWidth.medium : theme.borderWidth.hairline,
        borderColor: current
          ? theme.colors.primary
          : flagged
            ? theme.colors.gold
            : theme.colors.border,
        backgroundColor: answered ? theme.colors.accentSoft : theme.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <RTText role="meta" tone={answered ? 'accent' : 'secondary'}>
        {String(number)}
      </RTText>
    </Pressable>
  );
};

/** The question grid: where every item stands, and a way to jump to any of them. */
export const MockGrid = ({ model }: { readonly model: MockRunnerModel }) => {
  const theme = useTheme();
  return (
    <View
      testID="mock-grid"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.base,
      }}
    >
      {model.items.map((item, position) => (
        <GridCell
          key={item.questionId}
          number={position + 1}
          answered={item.chosenChoiceId !== null}
          flagged={item.flagged}
          current={position === model.index}
          onPress={() => model.goTo(position)}
        />
      ))}
    </View>
  );
};

/** The paper itself: one question at a time, with the clock and the paper's controls. */
export const MockRunnerView = ({
  model,
  onPause,
  onResume,
}: {
  readonly model: MockRunnerModel;
  readonly onPause: () => void;
  readonly onResume: () => void;
}) => {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const question = model.current;

  if (question === null) {
    return (
      <RTText role="body" tone="secondary" testID="mock-empty">
        This paper has no questions in it.
      </RTText>
    );
  }

  if (model.isPaused) {
    return (
      <View testID="mock-paused" style={{ gap: theme.spacing.md }}>
        <RTOwlMark width={110} mood="resting" />
        <RTText role="display" testID="mock-paused-title">
          Clock paused
        </RTText>
        <RTText role="body" tone="secondary">
          {model.progressLine} · {describeRemainingLabel(model.remaining)} left on the paper.
        </RTText>
        <RTButton
          label="Resume the paper"
          variant="primary"
          size="lg"
          fullWidth
          onPress={onResume}
          testID="mock-resume"
        />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <RTText role="meta" tone="secondary" testID="mock-progress">
            {`Question ${model.index + 1} of ${model.total} · ${model.progressLine}`}
          </RTText>
          <RTText role="meta" tone={model.isLowOnTime ? 'danger' : 'accent'} testID="mock-clock">
            {describeRemainingLabel(model.remaining)}
          </RTText>
        </View>
        <RTButton
          label={model.currentItem?.flagged === true ? 'Marked' : 'Mark for review'}
          variant="subtle"
          size="sm"
          onPress={model.toggleFlag}
          testID="mock-flag"
        />
        <RTButton
          label={model.gridOpen ? 'Hide grid' : 'Show grid'}
          variant="ghost"
          size="sm"
          onPress={model.toggleGrid}
          testID="mock-grid-toggle"
        />
      </View>

      {model.gridOpen && (
        <>
          <RTText role="meta" tone="secondary" testID="mock-grid-summary">
            {`${model.answered} answered · ${model.flagged} marked`}
          </RTText>
          <MockGrid model={model} />
        </>
      )}

      <RTText role="question" testID="mock-stem">
        {question.stem}
      </RTText>

      <View testID="mock-choices">
        {question.choices.map((choice) => (
          <RTChoice
            key={choice.id}
            title={choice.text}
            selected={model.currentItem?.chosenChoiceId === choice.id}
            // Answering again is allowed: a paper is not graded until it is submitted, and
            // changing an answer is a normal thing to do inside one.
            onPress={() => model.choose(choice.id)}
            marker="radio"
            accessibilityHint="Select this answer"
            testID={`mock-choice-${choice.id}`}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <RTButton
          label="Previous"
          variant="subtle"
          size="md"
          disabled={model.index === 0}
          onPress={model.previous}
          testID="mock-previous"
          style={{ flex: 1 }}
        />
        <RTButton
          label="Next"
          variant="primary"
          size="md"
          disabled={model.index >= model.total - 1}
          onPress={model.next}
          testID="mock-next"
          style={{ flex: 1 }}
        />
      </View>

      {confirming ? (
        <RTSurface variant="soft" padding="md" radius="lg" testID="mock-submit-confirm">
          <RTText role="lead" testID="mock-submit-summary">
            {model.answered === model.total
              ? 'Every item is answered.'
              : `${model.total - model.answered} items are unanswered. They count as wrong.`}
          </RTText>
          <View
            style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            <RTButton
              label="Keep going"
              variant="subtle"
              size="md"
              onPress={() => setConfirming(false)}
              testID="mock-submit-cancel"
              style={{ flex: 1 }}
            />
            <RTButton
              label="Submit paper"
              variant="primary"
              size="md"
              loading={model.submitting}
              onPress={() => {
                setConfirming(false);
                model.submit();
              }}
              testID="mock-submit-confirm-action"
              style={{ flex: 1 }}
            />
          </View>
        </RTSurface>
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <RTButton
            label="Pause"
            variant="ghost"
            size="md"
            onPress={onPause}
            testID="mock-pause"
            style={{ flex: 1 }}
          />
          <RTButton
            label="Submit"
            variant="outline"
            size="md"
            loading={model.submitting}
            onPress={() => setConfirming(true)}
            testID="mock-submit"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
};

/** `2:59:00 left` — the exam's own clock format, with the paper's own word. */
const describeRemainingLabel = (seconds: number): string => `${formatClock(seconds)} left`;

/** The paper's result: the score, the sections, and where to go next. */
export const MockResultView = ({
  result,
  onProgress,
  onRecommended,
}: {
  readonly result: MockResult;
  readonly onProgress: () => void;
  readonly onRecommended: () => void;
}) => {
  const theme = useTheme();
  const skipped = describeMockSkipped(result);

  return (
    <View testID="mock-result" style={{ gap: theme.spacing.md }}>
      <View style={{ alignItems: 'center', paddingTop: theme.spacing.lg, gap: theme.spacing.sm }}>
        <RTText role="eyebrow" tone="secondary">
          {result.expired ? 'Time ran out' : 'Mock result'}
        </RTText>
        <RTText role="scoreLarge" tone="accent" testID="mock-score">
          {String(result.scorePercent)}
        </RTText>
        <RTText role="body" tone="secondary" testID="mock-score-caption">
          {`${result.correct} of ${result.total} items · ${describeMockScore(result)} of the paper`}
        </RTText>
        {result.passingLabel !== null && (
          <RTText role="meta" tone="secondary" testID="mock-passing">
            {`${result.passingLabel} — a mark to aim at, not a prediction.`}
          </RTText>
        )}
        {skipped !== '' && (
          <RTText role="meta" tone="danger" testID="mock-skipped">
            {skipped}
          </RTText>
        )}
      </View>

      <View testID="mock-breakdown" style={{ marginTop: theme.spacing.md }}>
        <RTText role="eyebrow" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
          By section
        </RTText>
        {result.subjects.map((row) => (
          <View
            key={row.subjectId}
            testID={`mock-subject-${row.subjectId}`}
            style={{ marginTop: theme.spacing.md }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}
            >
              <RTText role="body">{row.subjectName}</RTText>
              <RTText role="body" colorKey={row.isWeakest ? 'accentText' : 'text'}>
                {`${row.percent}%`}
              </RTText>
            </View>
            <RTProgressBar
              value={row.percent / 100}
              height={8}
              style={{ marginTop: theme.spacing.sm }}
              label={`${row.subjectName} ${row.percent}%`}
              testID={`mock-subject-bar-${row.subjectId}`}
            />
          </View>
        ))}
      </View>

      <RTSurface variant="soft" padding="md" radius="lg" testID="mock-recommendation">
        <RTText role="eyebrow" tone="secondary">
          Next 7 days
        </RTText>
        <RTText role="sectionTitle" testID="mock-recommendation-title">
          {result.recommendation.title}
        </RTText>
        <RTText role="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          {result.recommendation.description}
        </RTText>
        <RTText role="meta" tone="accent" testID="mock-recommendation-steps">
          {result.recommendation.steps.join(' → ')}
        </RTText>
        <RTButton
          label="Start with this"
          variant="primary"
          size="lg"
          fullWidth
          onPress={onRecommended}
          testID="mock-recommendation-action"
          style={{ marginTop: theme.spacing.md }}
        />
      </RTSurface>

      <RTButton
        label="See your progress"
        variant="subtle"
        size="lg"
        fullWidth
        onPress={onProgress}
        testID="mock-see-progress"
      />
    </View>
  );
};
