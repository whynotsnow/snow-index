# snow-index

`snow-index` is the planned public portal for `whynotsnow.com`.

## Scope

- Main-domain portal and navigation surface.
- Plaza entry and public activity aggregation UI.
- Public links to Blog, Plaza, Projects, Admin, RSS, and related services.
- Lightweight summaries from Blog, Plaza, and site status sources.

## Boundaries

- Blog long-form content remains in `blog.whynotsnow.com`.
- Private operations remain in `snow-base` and `admin.whynotsnow.com`.
- Plaza backend APIs, moderation, D1, R2, Turnstile, and admin workflows are planned in `snow-base`.
- Planning records live in the adjacent `../snow-index.plan` sidecar.

## Commands

```bash
pnpm plan:status
pnpm dev:plan
```
