# Agent Guide

This repository is the planned public portal for `whynotsnow.com`.

## Project Shape

- Project name: `snow-index`.
- Product role: main-domain portal, navigation page, Plaza frontend entry, and public aggregation surface.
- Adjacent planning sidecar: `../snow-index.plan`.
- Package manager: pnpm only.

## Architecture Boundaries

- Keep `snow-index` focused on public-facing portal and Plaza frontend surfaces.
- Keep Blog long-form content in the existing Blog project at `blog.whynotsnow.com`.
- Keep private admin workflows, API routes, D1/R2 access, moderation, Turnstile verification, and service tokens in `snow-base`.
- Do not duplicate `snow-base` API logic or secrets in this repository.
- Do not store private Cloudflare identifiers, tokens, cookies, Access JWTs, raw logs, local absolute paths, or personal identity data in tracked files.

## Planning Sidecar

- Use `../snow-index.plan` for planning, decisions, executable plans, sanitized run records, validation notes, and handoffs.
- Use `pnpm --silent plan:status --json` to inspect sidecar items.
- Do not implement sidecar items unless their status is `ready` or `running`.
- Product source, deployable files, runtime configuration, and product documentation stay in this repository.
- Main-repo commits that directly execute a sidecar item must include `Plan-Item: <id>`. Related non-execution commits may use `Related-Plan: <id>`.
- A main-repo commit must link at most one `Plan-Item` by default. Linking multiple `Plan-Item` trailers requires explicit maintainer approval before committing and a detailed explanation of why the work cannot be split into separate commits.

## Commands

- `pnpm plan:status`: print adjacent sidecar planning board status.
- `pnpm plan`: start the adjacent sidecar preview board.
- `pnpm check`: run static project validation.
- `pnpm agent:validate`: validate Agent Workspace structure and disclosure basics.
- `pnpm cue:attention`: play the project attention cue before stopping for required user input.
- `pnpm cue:validation-start`: play before a full or long-running validation flow.
- `pnpm cue:deploy-start`: play before triggering a production deployment workflow.
- `pnpm cue:deploy-approval`: play while locally monitoring a production deployment waiting for approval.
- `pnpm cue:deploy-pass`: play after production deployment completes successfully.
- `pnpm cue:deploy-fail`: play after production deployment fails and needs attention.
- `pnpm cue:tests-pass`: play after a meaningful validation pass.
- `pnpm cue:tests-fail`: play after a validation failure that needs attention.

Do not claim a command passed unless it was actually run in this workspace and observed.

## Documentation Rules

- Use `docs/README.md` as the documentation router. Do not load every document by default.
- Before splitting large source files or adding new module files, read `docs/developers/code-organization.md`.
- Use `docs/agents/testing-strategy.md` to select validation for non-trivial changes.
- Use `.agent-workspace/manifest.json` and `pnpm agent:validate` for project-local Agent Workspace checks.
- Keep `docs/agents/*` in English for agent-facing reusable knowledge.
- Keep `docs/developers/*` in Chinese because developer and operations documents are for human readers.
- Preserve stable technical identifiers, commands, paths, environment variables, API names, hostnames, and product names in their original form.
- Do not add new root Markdown files unless they are root-level entry points such as `README.md` or `AGENTS.md`.

## Deployment Policy

- Deployment actions must use a commit that has already been pushed to the remote repository and must run through GitHub Actions.
- Do not deploy directly from a local working tree or an unpushed commit unless there is an explicit maintainer request or a documented exceptional situation.

## Agent Workspace

- `.agent-workspace/manifest.json` declares the project-local Agent Workspace contract.
- `.agent-workspace/tools/agent-workspace.mjs` owns local Agent Workspace validation.
- `.agent-workspace/local/`, `.agent-workspace/raw/`, and `.agent-workspace/quarantine/` are ignored private local state and must not be tracked or copied into docs, sidecar records, or handoffs.
- Agent Workspace does not replace `../snow-index.plan`; the sidecar still owns planning items, plans, decisions, runs, validation notes, and handoffs.

## Sound Cues

Use sound cues sparingly and only for attention-worthy events. Do not play cues for ordinary reading, searching, editing, formatting, or intermediate progress. Read `docs/agents/sound-cues.md` before using or modifying cue behavior.

Never play local sound cues from CI or GitHub Actions. The global Codex `Stop` hook already plays the `done` cue at turn completion, so do not manually play `done` for routine responses.

## Git Safety

- The workspace may contain user changes. Do not revert changes you did not make unless explicitly requested.
- Avoid destructive commands such as `git reset --hard` and `git checkout --` unless explicitly requested.
- Keep changes focused and commit messages Conventional Commits when committing.
- Keep implementation commits aligned to one sidecar item unless an approved exception is recorded.
