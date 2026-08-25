# Deployment Approval Token Naming

This note records the naming cleanup for `snow-index` and the follow-up changes that should be made in `snow-base` separately.

## Current Decision

Use `DEPLOY_APPROVAL_TOKEN` as the GitHub `production` Environment secret name in `snow-index`.

Reasoning:

- The credential is consumed by the `snow-index` production workflow.
- The permission purpose is deployment approval, not general `snow-base` access.
- The issuing system is `snow-base`, but repository secret names should describe the local workflow contract.
- The CI client already reads the generic environment variable `DEPLOY_APPROVAL_TOKEN`.

The local CI client keeps `SNOW_BASE_DEPLOY_APPROVAL_TOKEN` as a compatibility fallback so existing projects do not break immediately.

## snow-index Changes

- `.github/workflows/production-deploy.yml` maps `DEPLOY_APPROVAL_TOKEN` from `${{ secrets.DEPLOY_APPROVAL_TOKEN }}`.
- `scripts/verify-deployment-approval.mjs` reports generic variable names first and treats old `SNOW_BASE_*` names as compatibility only.
- `docs/developers/deployment-routing.md` documents `DEPLOY_APPROVAL_TOKEN` as the required production Environment secret.

## Required GitHub Configuration

In `whynotsnow/snow-index` -> `Settings` -> `Environments` -> `production`, configure:

```text
DEPLOY_APPROVAL_TOKEN
```

The value should be a `snow-base` Admin service token with only:

```text
deployments:request
deployments:verify
```

Do not add the token value to Git, docs, issues, sidecar records, logs, or chat.

## snow-base Follow-up, Do Not Edit Here

These changes should be made in the `snow-base` project in a separate scoped task:

1. In `scripts/verify-deployment-approval.mjs`, keep reading generic variables first:
   - `DEPLOY_APPROVAL_TOKEN`
   - `DEPLOY_APPROVAL_COMMIT_SHA`
   - `DEPLOY_APPROVAL_TARGET`
   - `DEPLOY_APPROVAL_REQUEST_SOURCE`
   - `DEPLOY_APPROVAL_REQUEST_URL`
   - `DEPLOY_APPROVAL_WAIT_SECONDS`
   - `DEPLOY_APPROVAL_POLL_SECONDS`

2. Keep old `SNOW_BASE_*` variables as backwards-compatible fallbacks for one migration window.

3. Update error messages in the script to mention generic `DEPLOY_APPROVAL_*` names first, with old names described only as compatibility aliases.

4. Update `docs/developers/deployment-approval-integration.md` so external projects configure `DEPLOY_APPROVAL_TOKEN`, not `SNOW_BASE_DEPLOY_APPROVAL_TOKEN`.

5. Update `docs/developers/deployment.md` to distinguish:
   - `snow-base` internal workflow compatibility, if still needed.
   - external project integration using generic `DEPLOY_APPROVAL_TOKEN`.

6. Update Admin token template UI:
   - `apps/admin/src/pages/tokens/tokenTemplates.ts`
   - `apps/admin/src/pages/tokens/components/CreatedTokenModal.tsx`

   The copied GitHub CLI command should set `DEPLOY_APPROVAL_TOKEN` for external project repositories.

7. If `SNOW_BASE_DEPLOY_APPROVAL_TOKEN` remains useful for the `snow-base` repository itself, label it as a legacy or internal alias rather than the recommended integration name.
