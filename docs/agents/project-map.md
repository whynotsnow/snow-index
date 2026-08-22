# Project Map

## Overview

`snow-index` is the planned public portal for `whynotsnow.com`. It owns the main-domain navigation page, Plaza public frontend entry, and public aggregation surfaces.

## Repository shape

- `README.md`: project identity, public scope, and primary commands.
- `AGENTS.md`: mandatory coding-agent rules and repository boundaries.
- `docs/`: durable project documentation.
- `docs/developers/`: human-facing implementation guidance.
- `docs/agents/`: agent-facing reusable project knowledge.
- `public/`: public site assets and static frontend surface when present.
- `../snow-index.plan`: adjacent planning sidecar for decisions, run records, validation notes, and handoffs.

## Architecture boundaries

- Keep this repository focused on public-facing portal and Plaza frontend surfaces.
- Keep Blog long-form content in the existing Blog project at `blog.whynotsnow.com`.
- Keep private admin workflows, API routes, D1/R2 access, moderation, Turnstile verification, and service tokens in `snow-base`.
- Do not duplicate `snow-base` API logic or secrets in this repository.
- Do not store private Cloudflare identifiers, tokens, cookies, Access JWTs, raw logs, local absolute paths, or personal identity data in tracked files.

## Data flow

- Portal first screen consumes `https://api.whynotsnow.com/api/v1/portal/summary` for public Plaza summary data.
- Plaza public pages consume `https://api.whynotsnow.com/api/v1/plaza/*`.
- Public submit forms embed a Cloudflare Turnstile widget and pass a one-time token to `snow-base`.
- Plaza attachments must use the Plaza-specific public attachment API. Do not call Twikoo/Lsky-compatible `/api/v1/upload`.
- Submitted topics, replies, and attachments enter the `snow-base` moderation flow before public display.

## High-risk areas

- Plaza submission, attachment upload, and Turnstile integration.
- Portal summary fallback and cache behavior.
- Any change that introduces API calls, secrets, Cloudflare bindings, admin routes, or private infrastructure assumptions.
- Any change that crosses the `snow-index` / `snow-base` responsibility boundary.
