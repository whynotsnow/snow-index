# Portal Visual and Content Boundary

This document records the durable visual and content direction for the `whynotsnow.com` Portal.

## Decision

`snow-index` should use an independent Portal visual language: related to Blog through tone and public identity, but not a copy of the Blog article reading experience.

The current direction is:

- Sky/cyan/navy/light cloud palette.
- Dense but calm navigation surface.
- First viewport focused on identity, primary routes, and current status.
- Plaza preview as public activity, not as a replacement for the Plaza list/detail pages.
- Abstract Portal map imagery for the public entry surface.

## Recommendation

Keep this project closer to a personal digital-space dashboard than a marketing landing page.

That means:

- Prefer compact labels, status, activity, and route cards over long explanations.
- Keep `WhynotSnow` visible as the first-viewport identity signal.
- Keep core routes visible without scrolling: Blog, Plaza, Projects, RSS, Admin.
- Use short operational copy that explains public state and fallback behavior.
- Let visual polish come from spacing, hierarchy, color, and one strong visual asset rather than decorative sections.

## Content Ownership

| Content | Owner | Portal Behavior |
| --- | --- | --- |
| Site identity | `snow-index` | Short first-screen statement and navigation context. |
| Long articles | Blog | Link out to Blog; do not duplicate article content. |
| Short public activity | Plaza / `snow-base` public API | Preview visible public DTOs only. |
| Project/service directory | `snow-index` | Show public route cards and stable external entries. |
| Admin workflows | `snow-base` / protected Admin | Show only protected entry, no internal tool list. |
| Comments/Twikoo | `snow-base` or Blog integration | Future public summaries only if sanitized. |
| Status/now text | `snow-index` initially, Plaza/status later | Keep short and replaceable by public DTOs later. |

## Blog Boundary

Blog remains the long-form reading system.

Do not move these into Portal:

- Full posts or article collections.
- Long personal biography.
- Blog theme-specific reading components.
- Comments as a Blog-wide community surface.

Portal may link to Blog and later show a short public recent-post summary if a stable feed or DTO exists.

## Plaza Boundary

Plaza is the public community/activity layer.

Portal may show:

- Pinned notices.
- Recent public topics.
- Public counts and timestamps.
- Entry points to `/plaza/` and `/plaza/t/:id`.

Portal must not show:

- Pending, hidden, deleted, or moderation-only content.
- Admin review notes.
- D1/R2 internals.
- Turnstile secret, service tokens, raw logs, or protected Access state.

## Visual Rules

- Keep cards at 8px border radius or less.
- Use navy text on light cloud surfaces for contrast.
- Use cyan for public navigation, active state, and system status.
- Use coral/pink only for secondary emphasis such as locked, pending, or protected states.
- Avoid long hero copy, marketing claims, large feature sections, and decorative one-off sections.
- Do not use the Blog reference image directly as a Portal asset; only reuse its color language.
- Keep `public/assets/portal-map.png` or a future equivalent as a subject-bearing image, not a generic gradient.

## Copy Rules

Use short, concrete interface copy.

Preferred:

- "Plaza 摘要已接入公开契约；Blog 和站点状态聚合后续接入。"
- "受保护入口，不展示内部工具。"
- "提交成功后进入审核队列。"

Avoid:

- Long personal essays on the home page.
- Product-marketing promises.
- Internal implementation details in visitor-facing copy.
- Any secret, private URL, raw log, cookie, token, or Access identifier.

## Expansion Rules

Future additions should land in this order:

1. Public Blog summary from the existing Blog RSS feed with fixture fallback.
2. Public site status or now text from a static config or public endpoint.
3. Optional public comments/Twikoo summary only after `snow-base` provides a sanitized adapter.
4. Visual asset refresh after content modules stabilize.

If a new module does not fit these ownership rules, add or update a sidecar item before implementing it.
