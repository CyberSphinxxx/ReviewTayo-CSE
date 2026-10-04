import type {
  ExamBlueprint,
  ExamBlueprintSection,
  ExamRuleConfig,
  ExamTrackId,
  ScoringRules,
  SubjectId,
  TimingRules,
} from './types';

/**
 * Blueprint resolution.
 *
 * Mock exams and practice modes must never hard-code item counts or durations:
 * those live in exam config and can differ per track. Everything here is pure, so
 * the numbers are unit-testable and identical between the practice and mock flows.
 */

export const resolveBlueprint = (exam: ExamRuleConfig, trackId: ExamTrackId): ExamBlueprint => {
  const track = exam.tracks.find((entry) => entry.id === trackId);
  const override = track?.blueprintOverride;
  if (override === undefined) return exam.blueprint;

  const applied =
    override.totalItems !== undefined ? override.totalItems : exam.blueprint.totalItems;
  return {
    sections: override.sections,
    ...(applied === undefined ? {} : { totalItems: applied }),
  };
};

export const resolveTiming = (exam: ExamRuleConfig, trackId: ExamTrackId): TimingRules => {
  const track = exam.tracks.find((entry) => entry.id === trackId);
  return { ...exam.timing, ...(track?.timingOverride ?? {}) };
};

export const resolveScoring = (exam: ExamRuleConfig, trackId: ExamTrackId): ScoringRules => {
  const track = exam.tracks.find((entry) => entry.id === trackId);
  return { ...exam.scoring, ...(track?.scoringOverride ?? {}) };
};

/** Sections that apply to a track, in declared order. */
export const sectionsForTrack = (
  exam: ExamRuleConfig,
  trackId: ExamTrackId,
): readonly ExamBlueprintSection[] => {
  const track = exam.tracks.find((entry) => entry.id === trackId);
  const allowedSubjects = new Set(track?.subjectIds ?? exam.subjects.map((entry) => entry.id));
  return resolveBlueprint(exam, trackId).sections.filter(
    (section) =>
      allowedSubjects.has(section.subjectId) &&
      (section.trackIds === undefined || section.trackIds.includes(trackId)),
  );
};

export const blueprintTotalItems = (exam: ExamRuleConfig, trackId: ExamTrackId): number => {
  const blueprint = resolveBlueprint(exam, trackId);
  const sectionTotal = sectionsForTrack(exam, trackId).reduce(
    (total, section) => total + section.questionCount,
    0,
  );
  return blueprint.totalItems ?? sectionTotal;
};

export interface SubjectAllocation {
  readonly subjectId: SubjectId;
  readonly requested: number;
  /** What can actually be served from available published questions. */
  readonly planned: number;
}

export interface MockAllocationPlan {
  readonly allocations: readonly SubjectAllocation[];
  readonly plannedTotal: number;
  readonly requestedTotal: number;
  /** True when the content bank could not satisfy the full blueprint. */
  readonly shortfall: boolean;
}

/**
 * Allocates blueprint counts against what the content bank can actually serve.
 *
 * A shortfall is reported rather than hidden: the mock screen can then explain that
 * a partial simulation is being offered instead of silently under-delivering.
 */
export const planAllocation = (
  exam: ExamRuleConfig,
  trackId: ExamTrackId,
  availableBySubject: (subjectId: SubjectId) => number,
): MockAllocationPlan => {
  const sections = sectionsForTrack(exam, trackId);
  const allocations = sections.map((section) => {
    const available = Math.max(0, availableBySubject(section.subjectId));
    return {
      subjectId: section.subjectId,
      requested: section.questionCount,
      planned: Math.min(section.questionCount, available),
    };
  });
  const requestedTotal = blueprintTotalItems(exam, trackId);
  const plannedTotal = allocations.reduce((total, entry) => total + entry.planned, 0);
  return {
    allocations,
    plannedTotal,
    requestedTotal,
    shortfall: plannedTotal < requestedTotal,
  };
};

/** "3h 10m" / "45m" for config-driven timing copy. */
export const formatDuration = (totalMinutes: number): string => {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const formatClock = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export interface MockSummary {
  readonly trackId: ExamTrackId;
  readonly trackName: string;
  readonly totalItems: number;
  readonly totalMinutes: number;
  readonly durationLabel: string;
  readonly allowPause: boolean;
  readonly allocations: readonly ExamBlueprintSection[];
}

export const summarizeMock = (exam: ExamRuleConfig, trackId: ExamTrackId): MockSummary => {
  const track = exam.tracks.find((entry) => entry.id === trackId);
  const timing = resolveTiming(exam, trackId);
  return {
    trackId,
    trackName: track?.name ?? exam.shortName,
    totalItems: blueprintTotalItems(exam, trackId),
    totalMinutes: timing.totalMinutes,
    durationLabel: formatDuration(timing.totalMinutes),
    allowPause: timing.allowPause,
    allocations: sectionsForTrack(exam, trackId),
  };
};
