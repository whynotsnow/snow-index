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
pnpm dev
pnpm check
pnpm plan:status
pnpm dev:plan
```

## Current MVP

The first implementation is a static Portal shell under `public/`.

- `/` presents the main-domain identity, public navigation, Plaza summary, project links, and the protected Admin entry boundary.
- `/plaza/` presents the Plaza frontend list shell with public API consumption and fixture fallback.
- `/plaza/t/:id` presents the Plaza topic detail shell through static routing fallback.
- Aggregated Blog, comments, and site status data remain future work; the first public Portal summary consumes Plaza data only.
- Visual and content boundaries are documented in [docs/developers/portal-visual-content-boundary.md](docs/developers/portal-visual-content-boundary.md).

## Deployment Boundary

The first deployable target is static hosting with `public/` as the publish directory.

- `public/_redirects` owns path normalization and the `/plaza/t/:id` topic-shell fallback.
- `public/_headers` owns static security headers and cache policy.
- DNS, custom-domain attachment, production deployment, Access configuration, and `www` to apex redirect rules are intentionally not performed by this repository.

See [docs/developers/deployment-routing.md](docs/developers/deployment-routing.md).
