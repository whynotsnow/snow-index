# Deployment and Routing Boundary

This document records the first deployable boundary for `snow-index`.

## Hosting Target

Use a static Cloudflare Pages project for the first production release.

- Project source: this repository.
- Build command: `pnpm check`.
- Publish directory: `public`.
- Runtime secrets: none in `snow-index`.
- Public API owner: `snow-base`, exposed through `https://api.whynotsnow.com`.

The current output keeps static assets in `public/` and uses one Pages Function for `/plaza/t/*` so topic URLs keep their original path while serving the static topic shell.

## Production Deploy

Follow the same deployment boundary used by `snow-base`: production deploys must run from GitHub Actions against a commit that has already been pushed to the remote repository.

Do not deploy local working-tree state, unpushed commits, or manually assembled artifacts. Exceptions require an explicit maintainer request or a documented exceptional situation, and must record the source commit, reason, validation, and residual risk.

Workflow:

```text
.github/workflows/production-deploy.yml
```

The workflow:

- Requires the GitHub Environment named `production`.
- Verifies the checked-out commit matches `origin/main`.
- Uses Node.js 22 and pnpm through Corepack.
- Runs `pnpm install --frozen-lockfile`.
- Runs `pnpm check`.
- Direct Uploads `public/` and Pages Functions to the Cloudflare Pages project `snow-index` with Wrangler.

Required GitHub Environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The Cloudflare API token should use the narrowest permissions that can deploy the `snow-index` Pages project and read the account context. Do not write the token, account ID, dashboard URLs, cookies, or raw deployment logs into sidecar records.

One-time Cloudflare setup:

- Create or confirm the Cloudflare Pages project named `snow-index`.
- Ensure the production branch is `main`.
- Attach `whynotsnow.com` as the production custom domain.
- Configure `www.whynotsnow.com` as a host-level redirect to `https://whynotsnow.com`.

Emergency local deploys are allowed only with explicit maintainer approval and should still target a commit that has been pushed to the remote repository unless the maintainer explicitly accepts the risk:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec wrangler pages deploy public --project-name snow-index --branch main
```

Record the reason, source commit, and sanitized validation result after any emergency local deploy.

## Domains

Production should attach the apex domain:

```text
whynotsnow.com
```

Use `www.whynotsnow.com` only as a redirecting alias. Configure host-level `www` to apex redirection in Cloudflare Bulk Redirects or an equivalent zone rule, not in this repository's `_redirects`, because `_redirects` is path routing inside the deployed site.

Existing service boundaries remain external links or API origins:

- `blog.whynotsnow.com`: Blog long-form content.
- `api.whynotsnow.com`: public `snow-base` API.
- `admin.whynotsnow.com`: protected Admin entry.
- Image, comments, and other service hostnames remain owned by their existing projects.

## Routes

Static routes owned by `snow-index`:

| Route | Owner | Behavior |
| --- | --- | --- |
| `/` | `snow-index` | Portal home. |
| `/plaza/` | `snow-index` | Plaza public list shell. |
| `/plaza/t/:id` | `snow-index` | Topic detail shell, served by a Pages Function that preserves the original URL. |
| `/assets/*` | `snow-index` | Static assets with immutable cache. |
| `/data/*` | `snow-index` | Public fixture/fallback JSON with short cache. |

Routes explicitly not owned by `snow-index`:

| Route/Host | Owner |
| --- | --- |
| `/api/*` or `api.whynotsnow.com` | `snow-base` |
| `/admin/*` or `admin.whynotsnow.com` | `snow-base` / protected Admin |
| Blog article routes | Blog project |
| D1/R2/Admin moderation internals | `snow-base` |

## Routing Files

`public/_redirects`:

- Normalizes `/plaza` to `/plaza/`.

`public/_routes.json`:

- Limits Pages Function invocation to `/plaza/t/*`.

`functions/plaza/t/[[topic]].js`:

- Serves the static Plaza topic shell through `env.ASSETS.fetch()` while preserving the requested topic URL for client-side topic ID parsing.

`public/_headers`:

- Adds security headers for static pages.
- Allows frontend fetches only to same-origin and `https://api.whynotsnow.com`.
- Pre-allows Cloudflare Turnstile script/frame origins for the future public submit flow.
- Gives `/assets/*` long immutable cache and `/data/*` short cache.

## Preview

Preview deployments must not require private tokens or protected APIs. Plaza and Portal pages must keep fixture fallback behavior when `api.whynotsnow.com` is unavailable, blocked by CORS, or not yet populated.

## Rollback

Rollback should use the hosting provider's previous deployment rollback when available. Avoid changing DNS as the first rollback step; detaching or repointing a custom domain can create activation delays. If the new Plaza path behavior fails, revert the deployment containing `_redirects` and keep `/` available as the minimal Portal.

## Production Checklist

- `pnpm check` passes.
- GitHub Actions `Production Deploy` passes from `origin/main`.
- `/`, `/plaza/`, and `/plaza/t/<known-topic>` render in preview.
- Custom domain `whynotsnow.com` is attached to the static hosting project.
- `www.whynotsnow.com` redirects to `https://whynotsnow.com`.
- `api.whynotsnow.com` allows the production origin in CORS for public Plaza endpoints.
- No `snow-index` environment variable contains secrets, service tokens, Turnstile secret, cookies, raw logs, or private hostnames.
