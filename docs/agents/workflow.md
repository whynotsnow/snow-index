# Agent Workflow

## Standard loop

1. Read root instructions and only the task-relevant documentation.
2. Inspect the current working tree before editing.
3. Make the smallest coherent change.
4. Run the narrowest meaningful validation.
5. Update documentation only when behavior, ownership, constraints, or reusable knowledge changed.
6. Report changed files, checks run, skipped validation, and material risks.

## Documentation maintenance

- Update `project-map.md` for architecture, ownership, or data-flow changes.
- Update this file for Agent execution or validation changes.
- Update developer documents for human-facing workflow changes.
- Record only confirmed reusable failures in the runtime playbook and failure index.
- Record only stable machine-readable knowledge in `memory.json`.
- Keep routine task history out of `execution-log.md`.

## Planning sidecar

- Use `../snow-index.plan` for planning, decisions, executable plans, sanitized run records, validation notes, and handoffs.
- Inspect sidecar items with `pnpm --silent plan:status --json`.
- Do not implement sidecar items unless their status is `ready` or `running`.
- Main-repo commits that directly execute a sidecar item must include `Plan-Item: <id>`. Related non-execution commits may use `Related-Plan: <id>`.

## Validation truthfulness

Never claim that a command, test, build, browser check, or deployment passed unless it actually ran and produced that result.
