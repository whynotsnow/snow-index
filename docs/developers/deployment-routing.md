# Deployment and Routing Boundary

This document records the first deployable boundary for `snow-index`.

## Hosting Target

Use a static Cloudflare Pages project for the first production release.

- Project source: this repository.
- Build command: `pnpm check`.
- Publish directory: `public`.
- Runtime secrets: none in `snow-index`.
- Public API owner: `snow-base`, exposed through `https://api.whynotsnow.com`.

The current static output also keeps a migration path to Workers Static Assets because the routing files live inside the publish directory.

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
| `/plaza/t/:id` | `snow-index` | Topic detail shell, routed to `/plaza/topic.html`. |
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
- Rewrites `/plaza/t/*` to `/plaza/topic.html` with status `200`, allowing topic URLs to work on static hosting.

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
- `/`, `/plaza/`, and `/plaza/t/<known-topic>` render in preview.
- Custom domain `whynotsnow.com` is attached to the static hosting project.
- `www.whynotsnow.com` redirects to `https://whynotsnow.com`.
- `api.whynotsnow.com` allows the production origin in CORS for public Plaza endpoints.
- No `snow-index` environment variable contains secrets, service tokens, Turnstile secret, cookies, raw logs, or private hostnames.
