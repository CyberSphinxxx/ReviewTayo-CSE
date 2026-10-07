import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { RTBadge, RTChip, RTProgressBar, RTText, RTSurface } from '@/components';
import type {
  ConceptReference,
  ContinueLearning,
  GuideSection,
  QuickSheet,
  StudyGuidesSummary,
  SubjectProgressRow,
} from '@/domain/learn';
import { useTheme } from '@/theme';

/**
 * Learn sections.
 *
 * The approved composition, kept out of the route so the screen is layout only: the
 * editorial title, one Continue Learning row, the Quick Sheets cards, the Subjects
 * list with its accuracy bars, and the Study Guides index. Every row is a real
 * destination — nothing on this screen is a decorative placeholder.
 */

/** Eyebrow and editorial title: "Learn" over "Understand it first." */
export const LearnHeader = ({
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
      <RTText role="eyebrow" tone="secondary" testID="learn-eyebrow">
        {eyebrow}
      </RTText>
      <RTText role="pageTitle" testID="learn-title" style={{ marginTop: theme.spacing.xs }}>
        {title}
      </RTText>
    </View>
  );
};

/** A section heading: a small eyebrow over an optional subtitle. */
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
      style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}
    >
      {label}
    </RTText>
  );
};

/** Continue Learning: the concept the learner is partway through, or where to start. */
export const LearnContinue = ({
  next,
  onOpen,
}: {
  readonly next: ContinueLearning;
  readonly onOpen: (conceptId: string) => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="learn-continue">
      <SectionHeading label={next.eyebrow} testID="learn-continue-eyebrow" />
      <RTSurface variant="soft" padding="md" radius="lg">
        <Pressable
          onPress={() => onOpen(next.concept.conceptId)}
          testID="learn-continue-row"
          accessibilityRole="button"
          accessibilityLabel={`${next.concept.name}. ${next.lessonLine}. ${next.concept.subjectName}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            minHeight: theme.touchTarget.comfortable,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <RTText role="cardTitle" testID="learn-continue-concept">
              {next.concept.name}
            </RTText>
            <RTText role="meta" tone="secondary" testID="learn-continue-lesson">
              {next.lessonLine}
            </RTText>
            <RTText role="meta" tone="secondary" testID="learn-continue-subject">
              {next.concept.subjectName}
            </RTText>
          </View>
          <RTBadge label={next.mastery} mastery={next.mastery} testID="learn-continue-mastery" />
          <ChevronRightIcon color={theme.colors.textSecondary} />
        </Pressable>
      </RTSurface>
    </View>
  );
};

/** Quick sheets: one short card per subject. */
export const LearnQuickSheets = ({
  sheets,
  onOpen,
}: {
  readonly sheets: readonly QuickSheet[];
  readonly onOpen: (conceptId: string) => void;
}) => {
  const theme = useTheme();
  if (sheets.length === 0) return null;

  return (
    <View testID="learn-quick-sheets">
      <SectionHeading label="Quick sheets" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {sheets.map((sheet) => (
          <RTChip
            key={sheet.conceptId}
            label={sheet.label}
            hint={sheet.hint}
            onPress={() => onOpen(sheet.conceptId)}
            testID={`learn-quick-sheet-${sheet.conceptId}`}
          />
        ))}
      </View>
    </View>
  );
};

/** Subjects: accuracy per subject, with the concept count it is measured over. */
export const LearnSubjects = ({
  rows,
  onOpenSubject,
}: {
  readonly rows: readonly SubjectProgressRow[];
  readonly onOpenSubject: (subjectId: string) => void;
}) => {
  const theme = useTheme();
  if (rows.length === 0) return null;

  return (
    <View testID="learn-subjects">
      <SectionHeading label="Subjects" />
      {rows.map((row, index) => (
        <Pressable
          key={row.subjectId}
          onPress={() => onOpenSubject(row.subjectId)}
          testID={`learn-subject-${row.subjectId}`}
          accessibilityRole="button"
          accessibilityLabel={`${row.name}. ${row.subtitle}`}
          accessibilityHint="Opens this subject's study guide"
          style={({ pressed }) => ({
            minHeight: theme.touchTarget.comfortable,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.sm,
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
            <RTText role="cardTitle" style={{ flex: 1, minWidth: 0 }}>
              {row.name}
            </RTText>
            <ChevronRightIcon color={theme.colors.textSecondary} />
          </View>
          <RTProgressBar
            value={row.progress}
            height={8}
            label={`${row.name}: ${row.subtitle}`}
            testID={`learn-subject-progress-${row.subjectId}`}
          />
          <RTText role="meta" tone="secondary" testID={`learn-subject-meta-${row.subjectId}`}>
            {row.subtitle}
          </RTText>
        </Pressable>
      ))}
    </View>
  );
};

/**
 * Study Guides: one row into the whole reference index, as the prototype has it.
 *
 * The Subjects list above already opens each subject's guide, so repeating them here
 * would give the same destination two names and make the section look like a second
 * list rather than the way into the whole thing.
 */
export const LearnStudyGuides = ({
  guides,
  onOpen,
}: {
  readonly guides: StudyGuidesSummary;
  readonly onOpen: () => void;
}) => {
  const theme = useTheme();
  return (
    <View testID="learn-study-guides">
      <SectionHeading label="Study guides" />
      <Pressable
        /* Wrapped, not passed directly: `onPress` receives the press event, which
           would arrive as a subject id. */
        onPress={() => onOpen()}
        testID="learn-guides-all"
        accessibilityRole="button"
        accessibilityLabel={`Study guides. ${guides.line}. ${guides.masteredCount} concepts mastered`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          minHeight: theme.touchTarget.comfortable,
          paddingVertical: theme.spacing.sm,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <RTText role="body" testID="learn-guides-title">
            Study Guides
          </RTText>
          <RTText role="meta" tone="secondary" testID="learn-guides-line">
            {guides.line} · {guides.masteredCount} mastered
          </RTText>
        </View>
        <ChevronRightIcon color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
};

/** The study guide itself: a subject's lessons in order, with mastery. */
export const GuideSections = ({
  sections,
  onOpenConcept,
  sectionHeadings = true,
}: {
  readonly sections: readonly GuideSection[];
  readonly onOpenConcept: (conceptId: string) => void;
  /** Off when the screen header already names the one subject on show. */
  readonly sectionHeadings?: boolean;
}) => {
  const theme = useTheme();
  return (
    <View testID="guide-sections">
      {sections.map((section) => (
        <View key={section.subjectId} testID={`guide-section-${section.subjectId}`}>
          {sectionHeadings && <SectionHeading label={section.name} />}
          {section.concepts.map((row) => (
            <Pressable
              key={row.concept.conceptId}
              onPress={() => onOpenConcept(row.concept.conceptId)}
              testID={`guide-concept-${row.concept.conceptId}`}
              accessibilityRole="button"
              accessibilityLabel={`${row.concept.name}. Lesson ${row.concept.lessonNumber} of ${
                row.concept.lessonCount
              }. ${row.mastery}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                minHeight: theme.touchTarget.comfortable,
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: theme.borderWidth.hairline,
                borderBottomColor: theme.colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <RTText role="cardTitle">{row.concept.name}</RTText>
                <RTText role="meta" tone="secondary">
                  Lesson {row.concept.lessonNumber} of {row.concept.lessonCount}
                </RTText>
              </View>
              <RTBadge label={row.started ? row.mastery : 'Not started'} mastery={row.mastery} />
              <ChevronRightIcon color={theme.colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
};

/**
 * One concept's page: what it means, where it sits, and how well it is known.
 *
 * The name itself lives in the screen header, so the body never repeats it.
 */
export const ConceptBody = ({ reference }: { readonly reference: ConceptReference }) => {
  const theme = useTheme();
  return (
    <View testID="concept-body" style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <RTBadge
          label={reference.started ? reference.mastery : 'Not started'}
          mastery={reference.mastery}
          testID="concept-mastery"
        />
        <RTText role="meta" tone="secondary" testID="concept-lesson">
          Lesson {reference.concept.lessonNumber} of {reference.concept.lessonCount}
        </RTText>
      </View>

      <RTSurface variant="soft" padding="md" radius="lg">
        <RTText role="lead" testID="concept-summary">
          {reference.concept.summary ??
            'No summary was written for this concept yet. Practise it to build mastery.'}
        </RTText>
      </RTSurface>

      {reference.concept.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {reference.concept.tags.map((tag) => (
            <RTBadge key={tag} label={tag} />
          ))}
        </View>
      )}

      {reference.evidence !== null && (
        <RTText role="meta" tone="secondary" testID="concept-evidence">
          {reference.evidence.correctCount} right · {reference.evidence.wrongCount} wrong
        </RTText>
      )}
    </View>
  );
};
