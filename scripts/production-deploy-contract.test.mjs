import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-deploy.yml", "utf8");
const apiPreflight = readFileSync("scripts/check-api-compatibility.mjs", "utf8");
const actionPin = "whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac";

test("production workflow exposes candidate and selected-artifact paths", () => {
  for (const phrase of [
    "push:",
    "selected-artifact",
    "actions/upload-artifact@v4",
    "actions/download-artifact@v5",
    "pages-dist.tar.gz",
    "snow-index-pages-candidate",
    "artifact_id",
    "artifact_digest",
    "artifact_run_id",
    "artifact_github_id",
    "canonical Pages artifact",
    "run-name: snow-index/pages",
    "DEPLOY_CANDIDATE_REQUEST_ID",
    "Check deployment approval contract",
    "Report candidate run started",
    "Register candidate artifact",
    "Report candidate run success",
    "Report candidate run failure",
    "Report deployment run started",
    "Request and wait for owner approval",
    "Wait for owner approval",
    "Consume exact owner approval",
    "Report deployment run success",
    "Report deployment run failure",
    "Check snow-base public API compatibility",
  ]) {
    assert.ok(workflow.includes(phrase), `workflow missing ${phrase}`);
  }
  assert.ok(workflow.includes(actionPin));
  assert.equal(workflow.split(actionPin).length - 1, 12);
  assert.doesNotMatch(workflow, /deployments:artifact-(?:promote|download)/u);
  assert.doesNotMatch(workflow, /scripts\/(?:register-candidate-artifact|report-deployment-candidate|report-deployment-run|verify-deployment-approval)\.mjs/u);
  assert.doesNotMatch(workflow, /\b(?:apply_d1_migrations|d1_migration_risk|worker_version|DEPLOY_RUN_CREATE_IF_MISSING)\b/u);
  assert.match(workflow, /retention-days: 7/u);
  assert.match(workflow, /actions: write/u);
});

test("candidate path reports the standard candidate run lifecycle after artifact registration", () => {
  const contract = workflow.indexOf("Check deployment approval contract");
  const started = workflow.indexOf("Report candidate run started");
  const validate = workflow.indexOf("Validate source");
  const register = workflow.indexOf("Register candidate artifact");
  const success = workflow.indexOf("Report candidate run success");
  const failure = workflow.indexOf("Report candidate run failure");
  assert.ok(contract >= 0 && contract < started && started < validate);
  assert.ok(register >= 0 && register < success);
  assert.ok(failure > success);
  assert.match(workflow, /operation: candidate-callback[\s\S]*?callback-status: in_progress/u);
  assert.match(workflow, /operation: register-artifact[\s\S]*?metadata-json:/u);
  assert.match(workflow, /artifact-id: \$\{\{ steps\.register\.outputs\['artifact-id'\] \}\}/u);
  assert.match(workflow, /artifact-digest: \$\{\{ steps\.register\.outputs\['artifact-digest'\] \}\}/u);
});

test("selected path verifies, requests, consumes, then deploys the same payload", () => {
  const contract = workflow.indexOf("Check deployment approval contract", workflow.indexOf("selected-artifact:"));
  const runStarted = workflow.indexOf("Report deployment run started");
  const preflight = workflow.indexOf("Check snow-base public API compatibility");
  const verify = workflow.indexOf("Verify and extract selected canonical payload");
  const request = workflow.indexOf("Request and wait for owner approval");
  const wait = workflow.indexOf("Wait for owner approval");
  const consume = workflow.indexOf("Consume exact owner approval");
  const deploy = workflow.indexOf("Deploy verified canonical payload");
  const success = workflow.indexOf("Report deployment run success");
  assert.ok(contract >= 0 && contract < runStarted && runStarted < preflight && preflight < verify);
  assert.ok(verify >= 0 && verify < request && request < wait && wait < consume && consume < deploy && deploy < success);
  assert.match(workflow, /wrangler.*pages deploy public/su);
  assert.match(workflow, /--expected-digest\s+"\$\{\{ inputs\.artifact_digest \}\}"/u);
  assert.match(workflow, /--extract-to\s+"\$RUNNER_TEMP\/pages-payload"/u);
  assert.match(workflow, /operation: deployment-callback[\s\S]*?callback-status: in_progress/u);
  assert.match(workflow, /operation: request-approval[\s\S]*?idempotency-key: \$\{\{ inputs\.request_id \}\}/u);
  assert.match(workflow, /operation: wait-approval[\s\S]*?request-id: \$\{\{ steps\.approval_request\.outputs\['request-id'\] \}\}/u);
  assert.match(workflow, /operation: consume-approval[\s\S]*?approval-id: \$\{\{ steps\.approval_wait\.outputs\['approval-id'\] \}\}/u);
  assert.doesNotMatch(workflow, /\b(?:apply_d1_migrations|d1_migration_risk|worker_version|create-if-missing:\s*true)\b/u);
});

test("public API preflight checks only external read-only contracts", () => {
  assert.match(apiPreflight, /\/api\/v1\/portal\/summary/u);
  assert.match(apiPreflight, /\/api\/v1\/plaza\/topics\?type=all&limit=20&offset=0/u);
  assert.doesNotMatch(
    apiPreflight,
    /\b(?:Authorization|DEPLOY_APPROVAL_TOKEN|CLOUDFLARE_|wrangler)\b|method:\s*["'](?:POST|PUT|DELETE)["']/u,
  );
});
