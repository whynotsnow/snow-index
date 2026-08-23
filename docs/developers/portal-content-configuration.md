# Portal Content Configuration

`public/site-config.js` owns public, operator-editable Portal content.

Use it for:

- Top navigation and hero actions.
- Directory entries and project links.
- Stable Portal, Plaza, Blog, and boundary copy.
- Public site title and description values that can be reused by metadata.

Do not use it for:

- Credentials, tokens, cookies, Access JWTs, or service keys.
- Private admin workflows, moderation notes, raw logs, D1/R2 object keys, or internal API details.
- Blog long-form content; Blog remains owned by `blog.whynotsnow.com`.
- Backend API contracts owned by `snow-base`.

The homepage keeps static fallback markup, then `public/app.js` renders the configured content when JavaScript loads. `pnpm check` validates required fields, duplicate IDs, and public URL shape.
