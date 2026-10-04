# Question Schema

Suggested contract:

```ts
interface Question {
  id: string;
  examId: string;
  trackIds: string[];

  subjectId: string;
  conceptIds: string[];

  difficulty: "easy" | "standard" | "challenging" | "exam";
  cognitiveSkill?: string;

  stem: string;
  choices: QuestionChoice[];
  correctChoiceId: string;

  explanation: string;
  simplifiedExplanation?: string;
  exampleExplanation?: string;

  relatedQuestionGroupId?: string;

  source?: QuestionSource;
  status: "draft" | "reviewed" | "published" | "retired";
  contentVersion: string;
}
```

Rules:
- stable IDs,
- correct answer must exist,
- concepts must exist,
- subjects must belong to exam,
- track ids must be valid,
- related question groups enable Try Another Like This,
- retired questions remain referenceable by historical answer records.
