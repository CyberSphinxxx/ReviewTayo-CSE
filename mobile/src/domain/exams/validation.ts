import {
  IssueCollector,
  findDuplicateIds,
  readArray,
  readBoolean,
  readNumber,
  readObject,
  readString,
  type ValidationIssue,
} from '@/domain/validation/issue-collector';

import {
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  SCORING_MODES,
  type ConceptDefinition,
  type ContentManifest,
  type ExamBlueprint,
  type ExamBlueprintSection,
  type ExamContentPack,
  type ExamRuleConfig,
  type ExamTrack,
  type JourneyPhase,
  type Question,
  type QuestionChoice,
  type RawContentPack,
  type ScoringRules,
  type StudyPolicy,
  type SubjectDefinition,
  type TimingRules,
} from './types';

/**
 * Content pack validation.
 *
 * Runs in tests (so a bad pack fails CI), before import into SQLite, and before a
 * downloaded pack is trusted. A pack that does not validate is never persisted:
 * bad content is far cheaper to reject than to migrate away from.
 */

export const SUPPORTED_CONTENT_SCHEMA_VERSION = 1;
export const MIN_CHOICES_PER_QUESTION = 2;
export const MAX_CHOICES_PER_QUESTION = 6;
export const ALLOWED_JOURNEY_MIN_DAYS = { min: 0, max: 730 } as const;

export interface ExamValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly pack: ExamContentPack | null;
  readonly errorCount: number;
  readonly warningCount: number;
}

/** Narrow a validated enum string to its union type. */
const asEnumValue = <T extends string>(
  value: string | undefined,
  allowed: readonly string[],
  fallback: T,
): T => (value !== undefined && allowed.includes(value) ? (value as T) : fallback);

const readIdList = (collector: IssueCollector, path: string, value: unknown): readonly string[] =>
  readArray(collector, path, value, { required: true, minLength: 1 })
    .map((entry, index) => readString(collector, `${path}[${index}]`, entry, { required: true }))
    .filter((entry): entry is string => entry !== undefined);

const parseManifest = (collector: IssueCollector, value: unknown): ContentManifest => {
  const path = 'manifest';
  const object = readObject(collector, path, value, { required: true });
  const schemaVersion = readNumber(collector, `${path}.schemaVersion`, object.schemaVersion, {
    required: true,
    integer: true,
    min: 1,
  });
  if (schemaVersion !== undefined && schemaVersion !== SUPPORTED_CONTENT_SCHEMA_VERSION) {
    collector.error(
      `${path}.schemaVersion`,
      'schema-version-mismatch',
      `Content schema ${schemaVersion} is not supported by this app version (expected ${SUPPORTED_CONTENT_SCHEMA_VERSION}).`,
    );
  }
  return {
    examId: readString(collector, `${path}.examId`, object.examId, { required: true }) ?? '',
    schemaVersion: schemaVersion ?? 0,
    contentVersion:
      readString(collector, `${path}.contentVersion`, object.contentVersion, { required: true }) ??
      '',
    generatedAt: readString(collector, `${path}.generatedAt`, object.generatedAt) ?? '',
    minimumAppVersion: readString(collector, `${path}.minimumAppVersion`, object.minimumAppVersion),
    checksum: readString(collector, `${path}.checksum`, object.checksum),
  };
};

const parseJourneyPhases = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly JourneyPhase[] => {
  const entries = readArray(collector, path, value, { required: true, minLength: 1 });
  const phases = entries.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      name: readString(collector, `${itemPath}.name`, object.name, { required: true }) ?? '',
      minDaysRemaining:
        readNumber(collector, `${itemPath}.minDaysRemaining`, object.minDaysRemaining, {
          required: true,
          integer: true,
          min: ALLOWED_JOURNEY_MIN_DAYS.min,
          max: ALLOWED_JOURNEY_MIN_DAYS.max,
        }) ?? 0,
      description:
        readString(collector, `${itemPath}.description`, object.description, { required: true }) ??
        '',
    };
  });

  for (const duplicate of findDuplicateIds(phases.map((phase) => phase.id))) {
    collector.error(path, 'duplicate-id', `Duplicate journey phase id "${duplicate}".`);
  }

  // Phases must describe a strictly decreasing horizon so resolution is unambiguous.
  const sorted = [...phases].sort((a, b) => b.minDaysRemaining - a.minDaysRemaining);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      previous.minDaysRemaining === current.minDaysRemaining
    ) {
      collector.error(
        path,
        'duplicate-id',
        `Journey phases "${previous.id}" and "${current.id}" share the same minDaysRemaining (${current.minDaysRemaining}); phase resolution would be ambiguous.`,
      );
    }
  }

  return phases;
};

const parseStudyPolicy = (collector: IssueCollector, value: unknown): StudyPolicy => {
  const path = 'exam.studyPolicy';
  const object = readObject(collector, path, value, { required: true });
  const review = readObject(collector, `${path}.review`, object.review, { required: true });
  const mastery = readObject(collector, `${path}.mastery`, object.mastery, { required: true });
  const weights = readObject(collector, `${path}.smartDrillWeights`, object.smartDrillWeights, {
    required: true,
  });

  const gotItIntervalDays = readArray(
    collector,
    `${path}.review.gotItIntervalDays`,
    review.gotItIntervalDays,
    { required: true, minLength: 2 },
  )
    .map((entry, index) =>
      readNumber(collector, `${path}.review.gotItIntervalDays[${index}]`, entry, {
        required: true,
        min: 1,
      }),
    )
    .filter((entry): entry is number => entry !== undefined);

  const levelCount = readNumber(collector, `${path}.mastery.levelCount`, mastery.levelCount, {
    required: true,
    integer: true,
    min: 2,
    max: 8,
  });

  const developingThreshold = readNumber(
    collector,
    `${path}.mastery.developingThreshold`,
    mastery.developingThreshold,
    { required: true, min: 0, max: 1 },
  );
  const strongThreshold = readNumber(
    collector,
    `${path}.mastery.strongThreshold`,
    mastery.strongThreshold,
    { required: true, min: 0, max: 1 },
  );
  const masteredThreshold = readNumber(
    collector,
    `${path}.mastery.masteredThreshold`,
    mastery.masteredThreshold,
    { required: true, min: 0, max: 1 },
  );
  if (
    developingThreshold !== undefined &&
    strongThreshold !== undefined &&
    masteredThreshold !== undefined &&
    !(developingThreshold < strongThreshold && strongThreshold < masteredThreshold)
  ) {
    collector.error(
      `${path}.mastery`,
      'out-of-range',
      'Mastery thresholds must increase: developingThreshold < strongThreshold < masteredThreshold.',
    );
  }

  return {
    supportsSmartDrill:
      readBoolean(collector, `${path}.supportsSmartDrill`, object.supportsSmartDrill, {
        fallback: true,
      }) ?? true,
    supportsTimedPractice:
      readBoolean(collector, `${path}.supportsTimedPractice`, object.supportsTimedPractice, {
        fallback: true,
      }) ?? true,
    supportsDailyQuestion:
      readBoolean(collector, `${path}.supportsDailyQuestion`, object.supportsDailyQuestion, {
        fallback: true,
      }) ?? true,
    supportsMasteryRounds:
      readBoolean(collector, `${path}.supportsMasteryRounds`, object.supportsMasteryRounds, {
        fallback: true,
      }) ?? true,
    supportsBuildAQuiz:
      readBoolean(collector, `${path}.supportsBuildAQuiz`, object.supportsBuildAQuiz, {
        fallback: true,
      }) ?? true,
    drillSize:
      readNumber(collector, `${path}.drillSize`, object.drillSize, {
        required: true,
        integer: true,
        min: 3,
        max: 50,
      }) ?? 10,
    weakestAreaMinimumAttempts:
      readNumber(
        collector,
        `${path}.weakestAreaMinimumAttempts`,
        object.weakestAreaMinimumAttempts,
        { fallback: 8 },
      ) ?? 8,
    needsAttentionAccuracy:
      readNumber(collector, `${path}.needsAttentionAccuracy`, object.needsAttentionAccuracy, {
        fallback: 0.7,
        min: 0,
        max: 1,
      }) ?? 0.7,
    timedPracticeQuestionCount:
      readNumber(
        collector,
        `${path}.timedPracticeQuestionCount`,
        object.timedPracticeQuestionCount,
        { fallback: 10, integer: true, min: 1, max: 100 },
      ) ?? 10,
    timedPracticeMinutes:
      readNumber(collector, `${path}.timedPracticeMinutes`, object.timedPracticeMinutes, {
        fallback: 8,
        min: 1,
        max: 240,
      }) ?? 8,
    dailyQuestionMinutes:
      readNumber(collector, `${path}.dailyQuestionMinutes`, object.dailyQuestionMinutes, {
        fallback: 1,
        min: 1,
        max: 60,
      }) ?? 1,
    review: {
      gotItIntervalDays,
      againIntervalDays:
        readNumber(collector, `${path}.review.againIntervalDays`, review.againIntervalDays, {
          required: true,
          min: 0,
          max: 30,
        }) ?? 1,
      dailyDueLimit:
        readNumber(collector, `${path}.review.dailyDueLimit`, review.dailyDueLimit, {
          required: true,
          integer: true,
          min: 1,
        }) ?? 40,
    },
    mastery: {
      levelCount: levelCount ?? 4,
      developingThreshold: developingThreshold ?? 0.4,
      strongThreshold: strongThreshold ?? 0.6,
      masteredThreshold: masteredThreshold ?? 0.85,
      correctDelta:
        readNumber(collector, `${path}.mastery.correctDelta`, mastery.correctDelta, {
          fallback: 1,
        }) ?? 1,
      wrongDelta:
        readNumber(collector, `${path}.mastery.wrongDelta`, mastery.wrongDelta, { fallback: 1 }) ??
        1,
    },
    journeyPhases: parseJourneyPhases(collector, `${path}.journeyPhases`, object.journeyPhases),
    smartDrillWeights: {
      weakness:
        readNumber(collector, `${path}.smartDrillWeights.weakness`, weights.weakness, {
          fallback: 3,
        }) ?? 3,
      dueReview:
        readNumber(collector, `${path}.smartDrillWeights.dueReview`, weights.dueReview, {
          fallback: 2.5,
        }) ?? 2.5,
      unseen:
        readNumber(collector, `${path}.smartDrillWeights.unseen`, weights.unseen, {
          fallback: 2,
        }) ?? 2,
      lowCoverage:
        readNumber(collector, `${path}.smartDrillWeights.lowCoverage`, weights.lowCoverage, {
          fallback: 1.5,
        }) ?? 1.5,
      recentLesson:
        readNumber(collector, `${path}.smartDrillWeights.recentLesson`, weights.recentLesson, {
          fallback: 1,
        }) ?? 1,
    },
  };
};

const parseBlueprintSections = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly ExamBlueprintSection[] =>
  readArray(collector, path, value, { required: true, minLength: 1 }).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    const trackIds =
      object.trackIds === undefined
        ? undefined
        : readIdList(collector, `${itemPath}.trackIds`, object.trackIds);
    return {
      subjectId:
        readString(collector, `${itemPath}.subjectId`, object.subjectId, {
          required: true,
        }) ?? '',
      questionCount:
        readNumber(collector, `${itemPath}.questionCount`, object.questionCount, {
          required: true,
          integer: true,
          min: 1,
        }) ?? 0,
      ...(trackIds === undefined ? {} : { trackIds }),
    };
  });

const parseBlueprint = (collector: IssueCollector, path: string, value: unknown): ExamBlueprint => {
  const object = readObject(collector, path, value, { required: true });
  return {
    sections: parseBlueprintSections(collector, `${path}.sections`, object.sections),
    totalItems: readNumber(collector, `${path}.totalItems`, object.totalItems, {
      integer: true,
      min: 1,
    }),
  };
};

const parseTiming = (collector: IssueCollector, path: string, value: unknown): TimingRules => {
  const object = readObject(collector, path, value, { required: true });
  return {
    totalMinutes:
      readNumber(collector, `${path}.totalMinutes`, object.totalMinutes, {
        required: true,
        min: 1,
      }) ?? 0,
    perQuestionSeconds: readNumber(
      collector,
      `${path}.perQuestionSeconds`,
      object.perQuestionSeconds,
      { min: 5 },
    ),
    allowPause:
      readBoolean(collector, `${path}.allowPause`, object.allowPause, {
        required: true,
      }) ?? true,
    pauseLimitMinutes: readNumber(
      collector,
      `${path}.pauseLimitMinutes`,
      object.pauseLimitMinutes,
      { min: 1 },
    ),
  };
};

const parseScoring = (collector: IssueCollector, path: string, value: unknown): ScoringRules => {
  const object = readObject(collector, path, value, { required: true });
  return {
    mode: asEnumValue(
      readString(collector, `${path}.mode`, object.mode, {
        required: true,
        enumValues: SCORING_MODES,
      }),
      SCORING_MODES,
      'raw-correct',
    ),
    pointsPerCorrect:
      readNumber(collector, `${path}.pointsPerCorrect`, object.pointsPerCorrect, {
        fallback: 1,
      }) ?? 1,
    penaltyPerWrong:
      readNumber(collector, `${path}.penaltyPerWrong`, object.penaltyPerWrong, { fallback: 0 }) ??
      0,
    passingPercent: readNumber(collector, `${path}.passingPercent`, object.passingPercent, {
      min: 0,
      max: 1,
    }),
  };
};

const parseTracks = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly ExamTrack[] =>
  readArray(collector, path, value, { required: true, minLength: 1 }).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      name: readString(collector, `${itemPath}.name`, object.name, { required: true }) ?? '',
      shortName: readString(collector, `${itemPath}.shortName`, object.shortName),
      description:
        readString(collector, `${itemPath}.description`, object.description, { required: true }) ??
        '',
      subjectIds: readIdList(collector, `${itemPath}.subjectIds`, object.subjectIds),
      blueprintOverride:
        object.blueprintOverride === undefined
          ? undefined
          : parseBlueprint(collector, `${itemPath}.blueprintOverride`, object.blueprintOverride),
      timingOverride:
        object.timingOverride === undefined
          ? undefined
          : parseTiming(collector, `${itemPath}.timingOverride`, object.timingOverride),
      scoringOverride:
        object.scoringOverride === undefined
          ? undefined
          : parseScoring(collector, `${itemPath}.scoringOverride`, object.scoringOverride),
    };
  });

const parseSubjects = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly SubjectDefinition[] =>
  readArray(collector, path, value, { required: true, minLength: 1 }).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      name: readString(collector, `${itemPath}.name`, object.name, { required: true }) ?? '',
      shortName:
        readString(collector, `${itemPath}.shortName`, object.shortName, { required: true }) ?? '',
      order:
        readNumber(collector, `${itemPath}.order`, object.order, { required: true, min: 0 }) ?? 0,
      conceptIds: readIdList(collector, `${itemPath}.conceptIds`, object.conceptIds),
      category: readString(collector, `${itemPath}.category`, object.category),
    };
  });

const parseConcepts = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly ConceptDefinition[] =>
  readArray(collector, path, value, { required: true, minLength: 1 }).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      subjectId:
        readString(collector, `${itemPath}.subjectId`, object.subjectId, {
          required: true,
        }) ?? '',
      name: readString(collector, `${itemPath}.name`, object.name, { required: true }) ?? '',
      parentConceptId: readString(collector, `${itemPath}.parentConceptId`, object.parentConceptId),
      tags: readArray(collector, `${itemPath}.tags`, object.tags).map(
        (tag, tagIndex) =>
          readString(collector, `${itemPath}.tags[${tagIndex}]`, tag, { required: true }) ?? '',
      ),
      summary: readString(collector, `${itemPath}.summary`, object.summary),
    };
  });

const parseChoices = (
  collector: IssueCollector,
  path: string,
  value: unknown,
): readonly QuestionChoice[] => {
  const entries = readArray(collector, path, value, {
    required: true,
    minLength: MIN_CHOICES_PER_QUESTION,
  });
  if (entries.length > MAX_CHOICES_PER_QUESTION) {
    collector.error(
      path,
      'out-of-range',
      `A question may have at most ${MAX_CHOICES_PER_QUESTION} choices.`,
    );
  }
  return entries.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      text: readString(collector, `${itemPath}.text`, object.text, { required: true }) ?? '',
    };
  });
};

const parseQuestions = (
  collector: IssueCollector,
  path: string,
  value: readonly unknown[],
): readonly Question[] =>
  value.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const object = readObject(collector, itemPath, entry, { required: true });
    const sourceObject = readObject(collector, `${itemPath}.source`, object.source);
    return {
      id: readString(collector, `${itemPath}.id`, object.id, { required: true }) ?? '',
      examId: readString(collector, `${itemPath}.examId`, object.examId, { required: true }) ?? '',
      trackIds: readIdList(collector, `${itemPath}.trackIds`, object.trackIds),
      subjectId:
        readString(collector, `${itemPath}.subjectId`, object.subjectId, { required: true }) ?? '',
      conceptIds: readIdList(collector, `${itemPath}.conceptIds`, object.conceptIds),
      difficulty: asEnumValue(
        readString(collector, `${itemPath}.difficulty`, object.difficulty, {
          required: true,
          enumValues: QUESTION_DIFFICULTIES,
        }),
        QUESTION_DIFFICULTIES,
        'standard',
      ),
      cognitiveSkill: readString(collector, `${itemPath}.cognitiveSkill`, object.cognitiveSkill),
      stem:
        readString(collector, `${itemPath}.stem`, object.stem, {
          required: true,
          minLength: 5,
        }) ?? '',
      choices: parseChoices(collector, `${itemPath}.choices`, object.choices),
      correctChoiceId:
        readString(collector, `${itemPath}.correctChoiceId`, object.correctChoiceId, {
          required: true,
        }) ?? '',
      explanation:
        readString(collector, `${itemPath}.explanation`, object.explanation, {
          required: true,
          minLength: 5,
        }) ?? '',
      simplifiedExplanation: readString(
        collector,
        `${itemPath}.simplifiedExplanation`,
        object.simplifiedExplanation,
      ),
      exampleExplanation: readString(
        collector,
        `${itemPath}.exampleExplanation`,
        object.exampleExplanation,
      ),
      relatedQuestionGroupId: readString(
        collector,
        `${itemPath}.relatedQuestionGroupId`,
        object.relatedQuestionGroupId,
      ),
      source:
        object.source === undefined
          ? undefined
          : {
              reference: readString(
                collector,
                `${itemPath}.source.reference`,
                sourceObject.reference,
              ),
              year: readNumber(collector, `${itemPath}.source.year`, sourceObject.year, {
                min: 1900,
                max: 2100,
                integer: true,
              }),
              note: readString(collector, `${itemPath}.source.note`, sourceObject.note),
            },
      status: asEnumValue(
        readString(collector, `${itemPath}.status`, object.status, {
          required: true,
          enumValues: QUESTION_STATUSES,
        }),
        QUESTION_STATUSES,
        'published',
      ),
      contentVersion:
        readString(collector, `${itemPath}.contentVersion`, object.contentVersion, {
          required: true,
        }) ?? '',
    };
  });

/**
 * Content packs keep subjects, concepts and tracks in their own files (see
 * CONTENT-PACKS.md) while `ExamRuleConfig` is the assembled runtime shape. This
 * resolves either layout: pack-level parts win when present, otherwise the values
 * declared inside exam.json are used.
 */
interface ExamConfigParts {
  readonly subjects: unknown;
  readonly concepts: unknown;
  readonly tracks: Readonly<Record<string, unknown>>;
}

const preferPackPart = (packPart: unknown, inlinePart: unknown): unknown => {
  if (Array.isArray(packPart) && packPart.length > 0) return packPart;
  if (Array.isArray(inlinePart) && inlinePart.length > 0) return inlinePart;
  return packPart ?? inlinePart;
};

const preferPackTracks = (
  packTracks: Readonly<Record<string, unknown>>,
  inlineTracks: unknown,
): unknown => {
  const packValues = Object.values(packTracks);
  if (packValues.length > 0) return packValues;
  if (Array.isArray(inlineTracks) && inlineTracks.length > 0) return inlineTracks;
  return packValues;
};

const parseExamConfig = (
  collector: IssueCollector,
  value: unknown,
  parts: ExamConfigParts,
): ExamRuleConfig => {
  const path = 'exam';
  const object = readObject(collector, path, value, { required: true });
  return {
    id: readString(collector, `${path}.id`, object.id, { required: true }) ?? '',
    version:
      readNumber(collector, `${path}.version`, object.version, {
        required: true,
        integer: true,
        min: 1,
      }) ?? 1,
    name: readString(collector, `${path}.name`, object.name, { required: true }) ?? '',
    shortName:
      readString(collector, `${path}.shortName`, object.shortName, { required: true }) ?? '',
    authority:
      readString(collector, `${path}.authority`, object.authority, { required: true }) ?? '',
    description:
      readString(collector, `${path}.description`, object.description, { required: true }) ?? '',
    tracks: parseTracks(collector, `${path}.tracks`, preferPackTracks(parts.tracks, object.tracks)),
    subjects: parseSubjects(
      collector,
      `${path}.subjects`,
      preferPackPart(parts.subjects, object.subjects),
    ),
    concepts: parseConcepts(
      collector,
      `${path}.concepts`,
      preferPackPart(parts.concepts, object.concepts),
    ),
    blueprint: parseBlueprint(collector, `${path}.blueprint`, object.blueprint),
    timing: parseTiming(collector, `${path}.timing`, object.timing),
    scoring: parseScoring(collector, `${path}.scoring`, object.scoring),
    studyPolicy: parseStudyPolicy(collector, object.studyPolicy),
    defaultTrackId:
      readString(collector, `${path}.defaultTrackId`, object.defaultTrackId, { required: true }) ??
      '',
  };
};

/** Cross-reference checks: the failures that typing alone cannot catch. */
const crossValidate = (
  collector: IssueCollector,
  manifest: ContentManifest,
  exam: ExamRuleConfig,
  questions: readonly Question[],
): void => {
  if (manifest.examId !== '' && exam.id !== '' && manifest.examId !== exam.id) {
    collector.error(
      'manifest.examId',
      'manifest-mismatch',
      `Manifest targets "${manifest.examId}" but the exam config declares "${exam.id}".`,
    );
  }

  for (const duplicate of findDuplicateIds(exam.tracks.map((track) => track.id))) {
    collector.error('exam.tracks', 'duplicate-id', `Duplicate track id "${duplicate}".`);
  }
  for (const duplicate of findDuplicateIds(exam.subjects.map((subject) => subject.id))) {
    collector.error('exam.subjects', 'duplicate-id', `Duplicate subject id "${duplicate}".`);
  }
  for (const duplicate of findDuplicateIds(exam.concepts.map((concept) => concept.id))) {
    collector.error('exam.concepts', 'duplicate-id', `Duplicate concept id "${duplicate}".`);
  }
  for (const duplicate of findDuplicateIds(questions.map((question) => question.id))) {
    collector.error('questions', 'duplicate-id', `Duplicate question id "${duplicate}".`);
  }

  const subjectIds = new Set(exam.subjects.map((subject) => subject.id));
  const conceptIds = new Set(exam.concepts.map((concept) => concept.id));
  const trackIds = new Set(exam.tracks.map((track) => track.id));

  if (!trackIds.has(exam.defaultTrackId)) {
    collector.error(
      'exam.defaultTrackId',
      'missing-reference',
      `defaultTrackId "${exam.defaultTrackId}" is not one of the declared tracks.`,
    );
  }

  for (const concept of exam.concepts) {
    if (!subjectIds.has(concept.subjectId)) {
      collector.error(
        `exam.concepts.${concept.id}.subjectId`,
        'missing-reference',
        `Concept "${concept.id}" references unknown subject "${concept.subjectId}".`,
      );
    }
    if (concept.parentConceptId !== undefined && !conceptIds.has(concept.parentConceptId)) {
      collector.error(
        `exam.concepts.${concept.id}.parentConceptId`,
        'missing-reference',
        `Concept "${concept.id}" references unknown parent concept "${concept.parentConceptId}".`,
      );
    }
  }

  for (const subject of exam.subjects) {
    if (subject.conceptIds.length === 0) {
      collector.error(
        `exam.subjects.${subject.id}.conceptIds`,
        'empty-collection',
        `Subject "${subject.id}" declares no concepts.`,
      );
    }
    for (const conceptId of subject.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        collector.error(
          `exam.subjects.${subject.id}.conceptIds`,
          'missing-reference',
          `Subject "${subject.id}" references unknown concept "${conceptId}".`,
        );
      }
    }
    const declared = exam.concepts.filter((concept) => concept.subjectId === subject.id);
    for (const concept of declared) {
      if (!subject.conceptIds.includes(concept.id)) {
        collector.warn(
          `exam.concepts.${concept.id}`,
          'orphan-concept',
          `Concept "${concept.id}" belongs to subject "${subject.id}" but is not listed in its conceptIds.`,
        );
      }
    }
  }

  for (const track of exam.tracks) {
    if (track.subjectIds.length === 0) {
      collector.error(
        `exam.tracks.${track.id}.subjectIds`,
        'empty-collection',
        `Track "${track.id}" declares no subjects.`,
      );
    }
    for (const subjectId of track.subjectIds) {
      if (!subjectIds.has(subjectId)) {
        collector.error(
          `exam.tracks.${track.id}.subjectIds`,
          'missing-reference',
          `Track "${track.id}" references unknown subject "${subjectId}".`,
        );
      }
    }
  }

  for (const [index, section] of exam.blueprint.sections.entries()) {
    if (!subjectIds.has(section.subjectId)) {
      collector.error(
        `exam.blueprint.sections[${index}].subjectId`,
        'missing-reference',
        `Blueprint section references unknown subject "${section.subjectId}".`,
      );
    }
    for (const trackId of section.trackIds ?? []) {
      if (!trackIds.has(trackId)) {
        collector.error(
          `exam.blueprint.sections[${index}].trackIds`,
          'missing-reference',
          `Blueprint section references unknown track "${trackId}".`,
        );
      }
    }
  }

  const sectionTotal = exam.blueprint.sections.reduce(
    (total, section) => total + section.questionCount,
    0,
  );
  if (exam.blueprint.totalItems !== undefined && exam.blueprint.totalItems > sectionTotal) {
    collector.error(
      'exam.blueprint.totalItems',
      'invalid-blueprint',
      `totalItems (${exam.blueprint.totalItems}) exceeds the sum of its sections (${sectionTotal}).`,
    );
  }

  // Questions.
  const groupMembers = new Map<string, { conceptIds: Set<string>; ids: string[] }>();

  for (const question of questions) {
    const path = `questions.${question.id || 'unknown'}`;

    if (question.examId !== exam.id) {
      collector.error(
        `${path}.examId`,
        'missing-reference',
        `Question belongs to exam "${question.examId}" but is bundled with "${exam.id}".`,
      );
    }
    if (!subjectIds.has(question.subjectId)) {
      collector.error(
        `${path}.subjectId`,
        'missing-reference',
        `Question references unknown subject "${question.subjectId}".`,
      );
      continue;
    }
    if (question.conceptIds.length === 0) {
      collector.error(
        `${path}.conceptIds`,
        'empty-collection',
        'A question must belong to at least one concept.',
      );
    }
    for (const conceptId of question.conceptIds) {
      if (!conceptIds.has(conceptId)) {
        collector.error(
          `${path}.conceptIds`,
          'missing-reference',
          `Question references unknown concept "${conceptId}".`,
        );
      } else {
        const concept = exam.concepts.find((entry) => entry.id === conceptId);
        if (concept !== undefined && concept.subjectId !== question.subjectId) {
          collector.error(
            `${path}.conceptIds`,
            'missing-reference',
            `Concept "${conceptId}" belongs to subject "${concept.subjectId}" but the question is filed under "${question.subjectId}".`,
          );
        }
      }
    }

    if (question.trackIds.length === 0) {
      collector.error(`${path}.trackIds`, 'empty-collection', 'A question must belong to a track.');
    }
    for (const trackId of question.trackIds) {
      const track = exam.tracks.find((entry) => entry.id === trackId);
      if (track === undefined) {
        collector.error(
          `${path}.trackIds`,
          'missing-reference',
          `Question references unknown track "${trackId}".`,
        );
        continue;
      }
      if (!track.subjectIds.includes(question.subjectId)) {
        collector.error(
          `${path}.trackIds`,
          'track-subject-mismatch',
          `Track "${trackId}" does not examine subject "${question.subjectId}".`,
        );
      }
    }

    if (question.choices.length > 0) {
      const choiceIds = question.choices.map((choice) => choice.id);
      for (const duplicate of findDuplicateIds(choiceIds)) {
        collector.error(`${path}.choices`, 'duplicate-id', `Duplicate choice id "${duplicate}".`);
      }
      if (!choiceIds.includes(question.correctChoiceId)) {
        collector.error(
          `${path}.correctChoiceId`,
          'answer-not-found',
          `correctChoiceId "${question.correctChoiceId}" does not match any choice.`,
        );
      }
    }

    if (question.status === 'published') {
      const publishedConceptIds = new Set(question.conceptIds);
      const hasPublishedConcept = [...publishedConceptIds].some((conceptId) =>
        conceptIds.has(conceptId),
      );
      if (!hasPublishedConcept) {
        collector.error(
          path,
          'orphan-question',
          'A published question must reference at least one existing concept.',
        );
      }
    }

    if (question.relatedQuestionGroupId !== undefined) {
      const group = groupMembers.get(question.relatedQuestionGroupId) ?? {
        conceptIds: new Set<string>(),
        ids: [],
      };
      group.ids.push(question.id);
      for (const conceptId of question.conceptIds) group.conceptIds.add(conceptId);
      groupMembers.set(question.relatedQuestionGroupId, group);
    }
  }

  for (const [groupId, group] of groupMembers) {
    if (group.ids.length < 2) {
      collector.warn(
        `questions.${group.ids[0] ?? groupId}`,
        'orphan-question',
        `Related-question group "${groupId}" contains a single question, so "Try another like this" has nothing to offer.`,
      );
    }
  }
};

/** Validates a raw content pack and returns typed content plus every issue found. */
export const validateContentPack = (raw: RawContentPack): ExamValidationResult => {
  const collector = new IssueCollector();

  const manifest = parseManifest(collector, raw.manifest);
  const exam = parseExamConfig(collector, raw.exam, {
    subjects: raw.subjects,
    concepts: raw.concepts,
    tracks: raw.tracks,
  });
  const questions = parseQuestions(collector, 'questions', raw.questions);
  crossValidate(collector, manifest, exam, questions);

  const issues = collector.issues;
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.length - errorCount;
  const ok = errorCount === 0;

  return {
    ok,
    issues,
    errorCount,
    warningCount,
    pack: ok ? { manifest, exam, questions } : null,
  };
};

/** Formats issues for a readable CI failure. */
export const formatValidationIssues = (issues: readonly ValidationIssue[]): string =>
  issues
    .map(
      (issue) =>
        `${issue.severity === 'error' ? 'ERROR' : 'WARN'} ${issue.path}: [${issue.code}] ${issue.message}`,
    )
    .join('\n');
