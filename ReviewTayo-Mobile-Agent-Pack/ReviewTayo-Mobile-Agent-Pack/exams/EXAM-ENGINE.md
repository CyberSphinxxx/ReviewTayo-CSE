# Generic Exam Engine

The mobile app is CSE-first, not CSE-hardcoded.

## Core config

```ts
export interface ExamRuleConfig {
  id: string;
  version: number;
  name: string;
  shortName: string;
  authority: string;

  tracks: ExamTrack[];
  subjects: SubjectDefinition[];
  concepts: ConceptDefinition[];

  blueprint: ExamBlueprint;
  scoring: ScoringRules;
  timing: TimingRules;
  studyPolicy: StudyPolicy;
}
```

## Registry

```ts
ExamRegistry.register(cseExam);
const exam = ExamRegistry.get(activeExamId);
```

Generic services receive config. They must not repeatedly branch on `examId`.

## Generic consumers
- onboarding exam profile
- Practice
- quiz session planner
- Smart Drill
- Review
- mastery
- Progress
- Mock Exam
- study planning

## Escape hatch
Only if config cannot represent behavior:

```ts
interface ExamExtension {
  examId: string;
  customScoring?: CustomScoring;
  customQuestionRenderer?: CustomQuestionRenderer;
  customMockRules?: CustomMockRules;
}
```

Extensions must be rare and justified with an ADR.
