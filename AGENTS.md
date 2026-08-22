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

## Commands

- `pnpm plan:status`: print adjacent sidecar planning board status.
- `pnpm plan`: start the adjacent sidecar preview board.

Do not claim a command passed unless it was actually run in this workspace and observed.

## Git Safety

- The workspace may contain user changes. Do not revert changes you did not make unless explicitly requested.
- Avoid destructive commands such as `git reset --hard` and `git checkout --` unless explicitly requested.
- Keep changes focused and commit messages Conventional Commits when committing.
