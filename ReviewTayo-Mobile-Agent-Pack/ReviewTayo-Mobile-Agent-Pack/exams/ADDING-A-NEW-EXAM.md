# Adding a New Exam

Adding a new exam must not mean copying CSE screens.

## Procedure

1. Assign stable `examId`.
2. Create exam manifest.
3. Define exam metadata/authority.
4. Define tracks/levels.
5. Define subjects.
6. Define concept hierarchy.
7. Define exam blueprint.
8. Define timing rules.
9. Define scoring rules.
10. Define study policy.
11. Add/import questions.
12. Add source/provenance metadata where available.
13. Run exam schema validation.
14. Run cross-reference validation.
15. Run content quality validation.
16. Register exam.
17. Run generic engine contract tests.
18. Run Smart Drill tests.
19. Run Review/mastery tests.
20. Run mock blueprint tests.
21. Run onboarding/profile compatibility tests.
22. Run progress rendering smoke test.
23. Verify no new exam-specific branches were added to generic services.
24. Document any necessary ExamExtension and justify it with an ADR.
25. Publish/version the content pack.

## Required proof

Before declaring multi-exam architecture complete, create a small non-CSE fixture exam and prove:
- registration works,
- subject/concept lookup works,
- generic quiz works,
- mock blueprint can be read,
- no CSE code change is required.

The fixture need not ship to users.
