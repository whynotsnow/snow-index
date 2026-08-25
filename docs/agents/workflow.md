# Agent Workflow

## Standard loop

1. Read root instructions and only the task-relevant documentation.
2. Inspect the current working tree before editing.
3. Make the smallest coherent change.
4. Use `docs/agents/testing-strategy.md` to choose the narrowest meaningful validation.
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

## Deployment execution

- Treat GitHub Actions as the default and required production deployment path.
- Before any deployment action, confirm the source is a commit already pushed to the remote repository.
- Do not deploy from local working-tree state, local-only commits, or ad hoc Wrangler commands unless the maintainer explicitly asks for it or the situation is documented as exceptional.
- When an exception is used, record the reason, source commit, validation performed, and residual risk without storing secrets or raw private logs.

## Validation truthfulness

Never claim that a command, test, build, browser check, or deployment passed unless it actually ran and produced that result.

## Documentation routing

Read only the documents needed for the task:

| Task area | Read |
| --- | --- |
| Repository shape, service boundary, or data flow | `docs/agents/project-map.md` |
| Validation selection | `docs/agents/testing-strategy.md` |
| Large file split or new module organization | `docs/developers/code-organization.md` |
| Deployment or Pages routing | `docs/developers/deployment-routing.md`, `docs/agents/runtime-requirements.md` |
| Production recovery or rollback | `docs/developers/recovery.md` |
| Known runtime or routing failures | `docs/developers/troubleshooting.md`, `docs/agents/runtime-playbook.md`, `docs/agents/failure-index.md` |
| Cue behavior | `docs/agents/sound-cues.md` |
| Public/private boundary | `docs/agents/disclosure-policy.md` |

## Sound cues

Use project sound cues only for attention-worthy events. Do not play cues for ordinary reading, searching, editing, formatting, or intermediate progress. Read `docs/agents/sound-cues.md` before using or modifying cue behavior.
