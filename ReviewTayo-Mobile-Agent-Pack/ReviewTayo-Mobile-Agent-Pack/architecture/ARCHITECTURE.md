# Mobile Architecture

## Goal
A scalable offline-first feature/domain/data architecture that supports CSE today and additional Philippine exams later without duplicating the app.

## Dependency direction

UI / Routes
↓
Feature controllers/hooks/use cases
↓
Domain services/entities/contracts
↓
Repository interfaces
↓
Local / Remote / Sync implementations

Dependencies must not point upward.

## Suggested structure

```text
mobile/
├── app/
│   ├── _layout.tsx
│   ├── (onboarding)/
│   ├── (tabs)/
│   │   ├── learn/
│   │   ├── practice/
│   │   ├── home/
│   │   ├── review/
│   │   └── progress/
│   ├── quiz/
│   ├── mock/
│   └── settings/
├── src/
│   ├── features/
│   ├── domain/
│   ├── data/
│   ├── components/
│   ├── theme/
│   ├── hooks/
│   ├── store/
│   ├── services/
│   ├── utils/
│   ├── types/
│   └── constants/
├── content/exams/
├── tests/
├── e2e/
└── assets/
```

## Feature ownership

Features own user-facing workflows:
- onboarding
- home
- learn
- practice
- quiz
- review
- progress
- mockExam
- settings
- notifications

Domain owns reusable business meaning:
- exams
- questions
- mastery
- review scheduling
- study planning
- scoring
- progression

Data owns:
- SQLite
- migrations
- repositories
- API clients
- sync
- serialization

## Boundary examples

Bad:
`HomeScreen.tsx -> SQLite query`

Good:
`HomeScreen -> useHomeModel -> GetTodayPlan -> StudyPlanRepository`

Bad:
`QuizScreen -> if examId === "cse" ...`

Good:
`QuizSessionService -> ExamRuleConfig`

## Shared contracts with web

Do not restructure the existing web app solely to share code.

If a stable contract is useful:
- extract schema/type only when low-risk,
- or mirror the contract with explicit compatibility tests.

Mobile autonomy is preferable to destabilizing the web product.
