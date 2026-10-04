# CI/CD

Baseline PR/commit quality gate:
1. install from lockfile
2. format check
3. lint
4. strict typecheck
5. unit tests
6. component/integration tests
7. exam/content validation

Heavier gate:
- E2E
- build verification
- visual QA artifacts when practical

Never publish/store-submit automatically from an unreviewed agent change.
