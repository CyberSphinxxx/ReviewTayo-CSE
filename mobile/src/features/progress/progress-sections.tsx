import { Pressable, View } from 'react-native';

import {
  ChevronRightIcon,
  RTBadge,
  RTButton,
  RTListRow,
  RTProgressBar,
  RTSparkline,
  RTSurface,
  RTText,
} from '@/components';
import {
  NEEDS_ATTENTION_ACTION,
  SCORE_EXPLANATION,
  STUDY_SCORE_LABEL,
  describeMasteryEvidence,
  type Journey,
  type JourneyStop,
  type MasteryRow,
  type NeedsAttention,
  type StudyScore,
  type Week,
} from '@/domain/progress';
import type { ConceptMasteryList, ProgressSubjectRow, RecentMockRow } from '@/services/progress';
import { useTheme } from '@/theme';

/**
 * Progress sections.
 *
 * The approved composition, in the order the reference draws it: the Study Score with
 * its trend, the subject that needs attention with the one action that fixes it, the
 * subject accuracy bars, mastery one layer below them, the CSE journey, this week, and
 * the last mock. Every row is a real destination and every number is one the learner
 * can act on; nothing is a decorative chart.
 */

/** Eyebrow and editorial title: "Progress" over "How it is going." */
export const ProgressHeader = ({
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
      <RTText role="eyebrow" tone="secondary" testID="progress-eyebrow">
        {eyebrow}
      </RTText>
      <RTText role="pageTitle" testID="progress-title" style={{ marginTop: theme.spacing.xs }}>
        {title}
      </RTText>
    </View>
  );
};

const SectionHeading = ({
  label,
  testID,
}: {
  readonly label: string;
  readonly testID?: string;
}) => {
  const theme = useTheme();
  return (
    <RTText
      role="eyebrow"
      tone="secondary"
      testID={testID}
      style={{ marginTop: theme.spacing.xxl, marginBottom: theme.spacing.sm }}
    >
      {label}
    </RTText>
  );
};

/** The score, the week-over-week line, and the six weeks that produced it. */
export const StudyScoreBlock = ({ score }: { readonly score: StudyScore }) => {
  const theme = useTheme();
  const tone =
    score.trend.direction === 'improving'
      ? 'success'
      : score.trend.direction === 'slipping'
        ? 'danger'
        : 'secondary';

  return (
    <View testID="progress-score">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.md }}>
        <RTText
          role="scoreLarge"
          tone="accent"
          testID="progress-score-value"
          style={{ lineHeight: 92 }}
        >
          {String(score.value)}
        </RTText>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: theme.spacing.md }}>
          <RTText role="cardTitle">{STUDY_SCORE_LABEL}</RTText>
          <RTText role="meta" tone={tone} testID="progress-score-trend">
            {score.trend.label}
          </RTText>
        </View>
      </View>

      <RTSparkline
        values={score.series}
        label={`Study Score over the last ${score.series.length} weeks: ${score.series.join(', ')}`}
        testID="progress-sparkline"
        style={{ marginTop: theme.spacing.sm }}
      />
      <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
        {SCORE_EXPLANATION}
      </RTText>
    </View>
  );
};

/** The weakest subject and the drill that starts on it. */
export const NeedsAttentionSection = ({
  row,
  onPractice,
}: {
  readonly row: NeedsAttention;
  readonly onPractice: () => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="progress-needs-attention">
      <SectionHeading label="Needs attention" />
      <RTSurface variant="soft" padding="md" radius="lg">
        {/* Not a single accessible node: the action has to stay reachable on its own. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <RTText role="sectionTitle" testID="progress-needs-attention-subject">
              {row.subjectName}
            </RTText>
            <RTText role="meta" tone="secondary" testID="progress-needs-attention-line">
              {`${row.line} · ${row.hint}`}
            </RTText>
          </View>
          <RTButton
            label={NEEDS_ATTENTION_ACTION}
            variant="primary"
            size="md"
            onPress={onPractice}
            accessibilityLabel={`Practice ${row.subjectName}`}
            testID="progress-needs-attention-practice"
          />
        </View>
      </RTSurface>
    </View>
  );
};

/** Accuracy per subject, each row opening that subject's concepts. */
export const SubjectAccuracySection = ({
  rows,
  onOpenSubject,
}: {
  readonly rows: readonly ProgressSubjectRow[];
  readonly onOpenSubject: (subjectId: string) => void;
}) => {
  const theme = useTheme();
  if (rows.length === 0) return null;

  return (
    <View testID="progress-subjects">
      <SectionHeading label="Subject accuracy" />
      {rows.map((row, index) => (
        <Pressable
          key={row.subjectId}
          onPress={() => onOpenSubject(row.subjectId)}
          testID={`progress-subject-${row.subjectId}`}
          accessibilityRole="button"
          accessibilityLabel={`${row.name}. ${row.line}`}
          accessibilityHint="Opens this subject's concepts"
          style={({ pressed }) => ({
            minHeight: theme.touchTarget.comfortable,
            paddingVertical: theme.spacing.md,
            borderBottomWidth: index === rows.length - 1 ? 0 : theme.borderWidth.hairline,
            borderBottomColor: theme.colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}
          >
            <RTText role="body">{row.name}</RTText>
            <RTText
              role="body"
              colorKey={row.isWeakest ? 'accentText' : 'text'}
              testID={`progress-subject-percent-${row.subjectId}`}
            >
              {row.percent}
            </RTText>
          </View>
          <RTProgressBar
            value={row.accuracy}
            height={8}
            style={{ marginTop: theme.spacing.sm }}
            label={`${row.name} accuracy ${row.percent}`}
            testID={`progress-subject-bar-${row.subjectId}`}
          />
          {!row.started && (
            <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
              Not started yet
            </RTText>
          )}
        </Pressable>
      ))}
    </View>
  );
};

/** Mastery summarised, one layer above the concept list. */
export const MasterySection = ({
  line,
  solidRatio,
  onOpen,
}: {
  readonly line: string;
  /** 0–1 of the syllabus at Strong or better. */
  readonly solidRatio: number;
  readonly onOpen: () => void;
}) => {
  const theme = useTheme();
  const percent = Math.round(solidRatio * 100);

  return (
    <View testID="progress-mastery">
      <SectionHeading label="Concept mastery" />
      <Pressable
        onPress={onOpen}
        testID="progress-mastery-row"
        accessibilityRole="button"
        accessibilityLabel={`${line}. ${percent}% strong or better.  Opens every concept`}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          <RTText role="cardTitle" testID="progress-mastery-line">
            {line}
          </RTText>
          <ChevronRightIcon color={theme.colors.textSecondary} />
        </View>
        <RTProgressBar
          value={solidRatio}
          tone="success"
          height={8}
          style={{ marginTop: theme.spacing.sm }}
          label={`${percent}% of concepts strong or better`}
          testID="progress-mastery-bar"
        />
        <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          Strong or better
        </RTText>
      </Pressable>
    </View>
  );
};

const JOURNEY_STATUS_LABEL: Readonly<Record<JourneyStop['status'], string>> = {
  done: 'Done',
  current: 'Now',
  upcoming: '',
};

/** The exam's own phases, with the one the learner is in marked. */
export const JourneySection = ({ journey }: { readonly journey: Journey }) => {
  const theme = useTheme();
  if (journey.stops.length === 0) return null;

  return (
    <View testID="progress-journey">
      <SectionHeading label="CSE journey" />
      <RTText role="meta" tone="secondary" testID="progress-journey-line">
        {journey.line}
      </RTText>
      {journey.stops.map((stop) => {
        const isCurrent = stop.status === 'current';
        return (
          <View
            key={stop.id}
            testID={`progress-journey-${stop.id}`}
            accessible
            accessibilityLabel={`${stop.name}. ${stop.status === 'done' ? 'Done' : isCurrent ? 'Current phase' : 'Ahead'}.`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: theme.borderWidth.medium,
                borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                backgroundColor:
                  stop.status === 'done'
                    ? theme.colors.primary
                    : isCurrent
                      ? theme.colors.gold
                      : 'transparent',
              }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <RTText
                role={isCurrent ? 'lead' : 'body'}
                tone={stop.status === 'upcoming' ? 'secondary' : 'default'}
              >
                {stop.name}
              </RTText>
              {isCurrent && (
                <RTText role="meta" tone="secondary" testID="progress-journey-description">
                  {stop.description}
                </RTText>
              )}
            </View>
            {JOURNEY_STATUS_LABEL[stop.status] !== '' && (
              <RTText
                role="eyebrow"
                tone={isCurrent ? 'accent' : 'secondary'}
                testID={`progress-journey-status-${stop.id}`}
              >
                {JOURNEY_STATUS_LABEL[stop.status]}
              </RTText>
            )}
          </View>
        );
      })}
    </View>
  );
};

const WEEK_BAR_MIN = 8;
const WEEK_BAR_MAX = 60;

/** This week: seven bars, the weekly target, and what the week added up to. */
export const WeekSection = ({ week }: { readonly week: Week }) => {
  const theme = useTheme();

  return (
    <View testID="progress-week">
      <SectionHeading label="This week" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.sm,
          marginTop: theme.spacing.sm,
        }}
      >
        {week.days.map((day) => (
          <View
            key={day.day}
            testID={`progress-week-day-${day.day}`}
            accessible
            accessibilityLabel={`${day.label}: ${day.questions} questions${
              day.isToday ? ', today' : ''
            }${day.isPlanned ? ', a planned study day' : ''}`}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <View
              style={{
                width: '100%',
                height: WEEK_BAR_MIN + day.intensity * (WEEK_BAR_MAX - WEEK_BAR_MIN),
                borderRadius: theme.radius.sm,
                backgroundColor: day.isToday
                  ? theme.colors.gold
                  : day.isFuture
                    ? theme.colors.neutralSoft
                    : day.questions > 0
                      ? theme.colors.primary
                      : theme.colors.accentSoft,
              }}
            />
            <RTText
              role="meta"
              tone={day.isToday ? 'accent' : 'secondary'}
              style={{ marginTop: theme.spacing.xs }}
            >
              {day.label}
            </RTText>
          </View>
        ))}
      </View>

      <RTText
        role="meta"
        tone="secondary"
        testID="progress-week-line"
        style={{ marginTop: theme.spacing.md }}
      >
        {week.line}
      </RTText>

      {week.target > 0 && (
        <View style={{ marginTop: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}
          >
            <RTText role="meta" tone="secondary" testID="progress-week-goal">
              {week.goalLine}
            </RTText>
            <RTText role="meta" tone="secondary" testID="progress-week-target">
              {`${week.questions} / ${week.target} questions`}
            </RTText>
          </View>
          <RTProgressBar
            value={week.progress}
            height={8}
            style={{ marginTop: theme.spacing.sm }}
            label={`${week.questions} of ${week.target} questions this week`}
            testID="progress-week-bar"
          />
        </View>
      )}
    </View>
  );
};

/** The last full simulation, or the way to take one. */
export const RecentMockSection = ({
  mock,
  onOpenMock,
}: {
  readonly mock: RecentMockRow | null;
  readonly onOpenMock: () => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="progress-mock">
      <SectionHeading label="Recent mock" />
      <View
        style={{
          borderTopWidth: theme.borderWidth.hairline,
          borderBottomWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.border,
        }}
      >
        {mock === null ? (
          <RTListRow
            title="No mock exam yet"
            subtitle="Take a full simulation to see your score here"
            chevron
            showDivider={false}
            onPress={onOpenMock}
            accessibilityHint="Opens the mock exam"
            testID="progress-mock-empty"
          />
        ) : (
          <RTListRow
            title={mock.title}
            subtitle={mock.subtitle}
            chevron
            showDivider={false}
            onPress={onOpenMock}
            accessibilityHint="Opens the mock exam"
            accessibilityLabel={`${mock.title}. ${mock.subtitle}`}
            testID="progress-mock-row"
          />
        )}
      </View>
    </View>
  );
};

/** The rows behind Concept mastery: weakest first, each opening its concept. */
export const ConceptMasteryRows = ({
  list,
  onOpenConcept,
}: {
  readonly list: ConceptMasteryList;
  readonly onOpenConcept: (conceptId: string) => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="progress-mastery-list" style={{ marginTop: theme.spacing.lg }}>
      <RTText role="meta" tone="secondary" testID="progress-mastery-list-summary">
        {list.subtitle}
      </RTText>
      {list.rows.map((row: MasteryRow) => (
        <RTSurface
          key={row.conceptId}
          variant="soft"
          padding="md"
          radius="lg"
          style={{ marginTop: theme.spacing.md }}
          testID={`progress-mastery-list-row-${row.conceptId}`}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}
          >
            <RTText role="cardTitle" style={{ flex: 1, minWidth: 0 }}>
              {row.name}
            </RTText>
            <RTBadge
              label={row.level}
              mastery={row.level}
              testID={`progress-mastery-level-${row.conceptId}`}
            />
          </View>
          <RTText role="meta" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
            {list.isSubject
              ? describeMasteryEvidence(row)
              : `${row.subjectName} · ${describeMasteryEvidence(row)}`}
          </RTText>
          <RTButton
            label="Open concept"
            variant="ghost"
            size="sm"
            onPress={() => onOpenConcept(row.conceptId)}
            testID={`progress-mastery-open-${row.conceptId}`}
            style={{ alignSelf: 'flex-start', marginTop: theme.spacing.sm }}
          />
        </RTSurface>
      ))}
    </View>
  );
};
