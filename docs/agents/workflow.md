# Agent Workflow

## Standard loop

1. Read root instructions and only the task-relevant documentation.
2. Inspect the current working tree before editing.
3. Make the smallest coherent change.
4. Use `docs/agents/testing-strategy.md` to choose the narrowest meaningful validation.
5. Update documentation only when behavior, ownership, constraints, or reusable knowledge changed.
6. Report changed files, checks run, skipped validation, and material risks.

## Agent Workspace

Use `.agent-workspace/manifest.json` as the project-local Agent Workspace contract. If it declares local tooling, prefer that tooling for workspace checks:

```bash
pnpm agent:validate
```

Agent Workspace local state directories are private and ignored:

- `.agent-workspace/local/`
- `.agent-workspace/raw/`
- `.agent-workspace/quarantine/`

Do not copy local/raw/quarantine contents into tracked docs, sidecar runs, or handoffs. Agent Workspace does not replace the adjacent planning sidecar; `../snow-index.plan` still owns plan-bound execution records.

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
- A main-repo commit must link at most one `Plan-Item` by default.
- If implementation appears to span multiple sidecar items, split the work into one commit per item.
- Linking multiple `Plan-Item` trailers in one commit is an exception that requires explicit maintainer approval before committing. The commit message or sidecar run must explain why the work could not be split cleanly.

## Deployment execution

- Treat GitHub Actions as the required production deployment path.
- Before any deployment action, confirm the source is a commit already pushed to the remote repository.
- Production deployment must run through the repository production deployment workflow and pass its approval gate before Cloudflare Pages deploy starts.
- Do not deploy from local working-tree state, local-only commits, ad hoc Wrangler commands, or manually assembled artifacts.
- Exceptions require explicit maintainer approval before action and a written special-case note explaining why the GitHub Actions approval path cannot be used.
- When an exception is approved, record the reason, source commit, validation performed, residual risk, and approval context without storing secrets or raw private logs.

## Validation truthfulness

Never claim that a command, test, build, browser check, or deployment passed unless it actually ran and produced that result.

## Documentation routing

Read only the documents needed for the task:

| Task area | Read |
| --- | --- |
| Repository shape, service boundary, or data flow | `docs/agents/project-map.md` |
| Validation selection | `docs/agents/testing-strategy.md` |
| Agent Workspace validation or local state boundary | `.agent-workspace/manifest.json`, this file, `docs/agents/disclosure-policy.md` |
| Large file split or new module organization | `docs/developers/code-organization.md` |
| Deployment or Pages routing | `docs/developers/deployment-routing.md`, `docs/agents/runtime-requirements.md` |
| Production recovery or rollback | `docs/developers/recovery.md` |
| Known runtime or routing failures | `docs/developers/troubleshooting.md`, `docs/agents/runtime-playbook.md`, `docs/agents/failure-index.md` |
| Cue behavior | `docs/agents/sound-cues.md` |
| Public/private boundary | `docs/agents/disclosure-policy.md` |

## Sound cues

Use project sound cues only for attention-worthy events. Do not play cues for ordinary reading, searching, editing, formatting, or intermediate progress. Read `docs/agents/sound-cues.md` before using or modifying cue behavior.
