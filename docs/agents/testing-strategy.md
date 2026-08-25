# Impact-Based Testing Strategy

This is the validation-selection contract for agents working in `snow-index`. Validation should prove the changed public static behavior, documentation contract, routing, and deployment boundary without turning every edit into release validation.

## Selection Procedure

1. List changed paths owned by the task and keep unrelated user work out of scope.
2. Classify each path as documentation, public HTML/CSS/JS, public data fixture, Pages routing/function, deployment workflow, tooling/dependency, or generated artifact.
3. Select the lowest validation layer that directly proves the behavior.
4. Add checks for public API contract assumptions when Portal or Plaza fetch behavior changes.
5. Escalate when the change touches routing, security headers, deployment approval, package dependencies, or multiple public surfaces.
6. Report classification, selected checks, results, and skipped higher layers.

## Validation Layers

| Layer | Purpose | Typical scope |
| --- | --- | --- |
| L0 Documentation and disclosure | Markdown structure, Agent Docs, sidecar boundary | Changed docs and agent files |
| L1 Static project checks | Required files, fixture shape, public config, metadata, routing files | `pnpm check` |
| L2 Script syntax checks | Node script parseability for tooling and CI helpers | `node --check scripts/<file>.mjs` |
| L3 Local static preview | Rendered static pages through local server | `pnpm dev` plus targeted HTTP/browser checks |
| L4 Pages routing checks | Redirects, headers, topic URL preservation, effective URL | Preview or production URL checks |
| L5 Production workflow checks | GitHub Actions deployment, approval, Cloudflare Pages result | Pushed commit and GitHub Actions run |

## Change Matrix

| Change class | Required starting checks | Add when applicable |
| --- | --- | --- |
| Documentation only | Agent Docs validation | Command verification if command examples changed |
| `AGENTS.md` or agent docs | Agent Docs validation; `pnpm check` if commands or required files changed | Sidecar validation when plan workflow changes |
| Public HTML/CSS | `pnpm check` | Local browser or screenshot smoke for layout, interaction, or responsive changes |
| Public JS | `pnpm check`; relevant `node --check` only for Node scripts | Local browser smoke for DOM behavior, API fetch, filters, forms, or topic parsing |
| Public data fixtures | `pnpm check` | Local preview when fixture drives rendered behavior |
| `public/site-config.js` | `pnpm check` | Local preview for copy, navigation, SEO, or public link changes |
| Pages routing files or functions | `pnpm check`; `node --check functions/**/*.js` when edited | Preview/production HTTP checks for status, headers, redirects, and `url_effective` |
| Deployment workflow or approval script | `node --check scripts/verify-deployment-approval.mjs`; `pnpm check` | GitHub Actions run from pushed commit for release confidence |
| Cue config or cue script | `node scripts/codex-cue.mjs help`; `node scripts/codex-cue.mjs show done` | Do not play audio unless the task explicitly requires preview |
| Dependencies or lockfile | `pnpm install --frozen-lockfile`; `pnpm check` | Local preview or release workflow when runtime behavior may change |

## Escalation

Run broader validation when:

- public routing, security headers, CSP, canonical URLs, or Pages Functions change;
- Plaza topic parsing, public submission, Turnstile widget wiring, attachment upload, or API fallback behavior changes;
- deployment approval, GitHub Actions, Wrangler, package manager, or lockfile behavior changes;
- a selected check reveals an unexpected cross-surface dependency;
- the user asks for release-level confidence.

An expensive check may be skipped only when a narrower layer proves the same contract or the environment cannot run it. Keep the validation gap explicit.

## Browser Checks

Use local browser validation when rendered layout, interaction, dynamic data loading, form behavior, or responsive behavior matters. Do not report browser-dependent validation as complete based only on `pnpm check`.

For production or preview route validation, verify more than HTTP 200 when routing semantics matter. Topic clean URLs require checking that the effective URL preserves `/plaza/t/<topic>` and that the topic ID remains available to client-side code.

## Handoff Evidence

Every implementation handoff should state:

- changed paths;
- impact classification;
- public contracts considered;
- exact commands run and observed results;
- skipped higher validation and reason;
- whether any dev server remains running.
