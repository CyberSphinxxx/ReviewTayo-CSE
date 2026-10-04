# Autonomous Development Loop

## Invariant
The agent continues until the final Definition of Done passes.

## Iteration procedure

### 1. Load state
Read:
- `AGENTS.md`
- `agent/PROJECT-STATE.md`
- `agent/PROJECT-STATE.json`
- `agent/MASTER-CHECKLIST.md`
- `agent/BLOCKERS.md`
- `agent/DECISIONS.md`

### 2. Inspect repository reality
Run or inspect:
- `git status`
- current branch
- recent commits
- `/mobile` existence/current architecture
- package manager/lockfiles
- failing tests
- current build state

Never assume state solely from documentation if source control disagrees.

### 3. Baseline verification
Run the cheapest relevant baseline:
- dependency consistency
- format/lint
- TypeScript
- currently failing targeted tests

If baseline is red, determine whether the failure is pre-existing or introduced.

### 4. Choose work
Select the highest-priority:
- unchecked,
- dependency-ready,
- unblocked
task from `MASTER-CHECKLIST.md`.

Prefer completing a vertical slice rather than many disconnected half-features.

### 5. Read only relevant context
Read:
- phase spec
- feature/product spec
- architecture rules
- affected source/tests
- prototype reference for the screen/flow

Avoid reloading every project document unnecessarily.

### 6. Implement
Implement the smallest coherent unit that satisfies acceptance criteria.

### 7. Test immediately
Add/update:
- unit tests for domain logic,
- component tests for UI behavior,
- integration tests for repositories/feature flows,
as appropriate.

### 8. Repair loop
If verification fails:
1. inspect failure,
2. identify root cause,
3. fix,
4. rerun targeted gate.

Do not move on while a failure caused by the current change remains.

### 9. Self-review
Before marking the task complete, review:
- architecture boundary
- naming
- duplication
- error handling
- accessibility
- offline behavior
- CSE hardcoding risk
- performance risk
- security implications
- prototype fidelity

### 10. Run task gate
At minimum:
- formatter for changed files,
- lint,
- typecheck,
- targeted tests.

For phase completion, run the entire phase gate defined in its document.

### 11. Persist state
Update:
- `agent/MASTER-CHECKLIST.md`
- `agent/PROJECT-STATE.md`
- `agent/PROJECT-STATE.json`
- `agent/SESSION-LOG.md`
- `agent/FAILURE-LOG.md` when relevant
- `agent/DECISIONS.md` / ADRs when relevant

### 12. Commit stable checkpoint
Use a focused conventional-style commit when repository policy permits.

### 13. Continue
Immediately select the next task.

## Failure escalation protocol

### Attempt 1
Diagnose the direct error and repair.

### Attempt 2
Re-read affected implementation, contract, and test assumptions.

### Attempt 3
Perform root-cause analysis. Consider an alternative implementation.

### Repeated unresolved failure
- capture evidence in `FAILURE-LOG.md`,
- mark temporary internal block,
- continue independent work,
- revisit before final release gate.

Never label a programming problem as an external blocker.

## Finalization loop

When all phase tasks appear complete:
1. re-read `DEFINITION-OF-DONE.md`,
2. perform full regression,
3. run architecture scan,
4. run exam/content validators,
5. run E2E,
6. run visual QA,
7. run accessibility review,
8. run performance review,
9. run security review,
10. run production build path,
11. resolve every internal failure,
12. produce final report.

Only then may development stop.
