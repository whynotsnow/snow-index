import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-deploy.yml", "utf8");
const candidateReporter = readFileSync("scripts/report-deployment-candidate.mjs", "utf8");
const runReporter = readFileSync("scripts/report-deployment-run.mjs", "utf8");
const apiPreflight = readFileSync("scripts/check-api-compatibility.mjs", "utf8");

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
    "Report candidate run started",
    "Report candidate run success",
    "Report candidate run failure",
    "Report deployment run started",
    "Report deployment run success",
    "Report deployment run failure",
    "Check snow-base public API compatibility",
  ]) {
    assert.ok(workflow.includes(phrase), `workflow missing ${phrase}`);
  }
  assert.doesNotMatch(workflow, /deployments:artifact-(?:promote|download)/u);
  assert.doesNotMatch(workflow, /\b(?:apply_d1_migrations|d1_migration_risk|worker_version|DEPLOY_RUN_CREATE_IF_MISSING)\b/u);
  assert.match(workflow, /retention-days: 7/u);
  assert.match(workflow, /actions: write/u);
});

test("candidate path reports the standard candidate run lifecycle after artifact registration", () => {
  const started = workflow.indexOf("Report candidate run started");
  const validate = workflow.indexOf("Validate source");
  const register = workflow.indexOf("Register candidate artifact");
  const success = workflow.indexOf("Report candidate run success");
  const failure = workflow.indexOf("Report candidate run failure");
  assert.ok(started >= 0 && started < validate);
  assert.ok(register >= 0 && register < success);
  assert.ok(failure > success);
  assert.match(workflow, /DEPLOY_CANDIDATE_ARTIFACT_ID:\s+\$\{\{ steps\.register\.outputs\.artifact_id \}\}/u);
  assert.match(workflow, /DEPLOY_CANDIDATE_ARTIFACT_DIGEST:\s+\$\{\{ steps\.register\.outputs\.artifact_digest \}\}/u);
});

test("selected path verifies, requests, consumes, then deploys the same payload", () => {
  const runStarted = workflow.indexOf("Report deployment run started");
  const preflight = workflow.indexOf("Check snow-base public API compatibility");
  const verify = workflow.indexOf("Verify and extract selected canonical payload");
  const request = workflow.indexOf("Request and wait for owner approval");
  const consume = workflow.indexOf("Consume exact owner approval");
  const deploy = workflow.indexOf("Deploy verified canonical payload");
  const success = workflow.indexOf("Report deployment run success");
  assert.ok(runStarted >= 0 && runStarted < preflight && preflight < verify);
  assert.ok(verify >= 0 && verify < request && request < consume && consume < deploy && deploy < success);
  assert.match(workflow, /wrangler.*pages deploy public/su);
  assert.match(workflow, /--expected-digest\s+"\$\{\{ inputs\.artifact_digest \}\}"/u);
  assert.match(workflow, /--extract-to\s+"\$RUNNER_TEMP\/pages-payload"/u);
  assert.match(workflow, /DEPLOY_APPROVAL_VALIDATION_SUMMARY:\s+\$\{\{ steps\.api_preflight\.outputs\.validation_summary \|\| inputs\.validation_summary \}\}/u);
});

test("deployment callback clients stay scoped to snow-index/pages", () => {
  assert.match(candidateReporter, /\/api\/v1\/deployments\/candidate-runs/u);
  assert.match(runReporter, /\/api\/v1\/deployments\/runs\/update/u);
  for (const source of [candidateReporter, runReporter]) {
    assert.match(source, /snow-index/u);
    assert.match(source, /pages/u);
    assert.doesNotMatch(source, /(?:applyD1Migrations|d1MigrationRisk|workerVersion|createIfMissing|artifact-promote|artifact-download)/u);
  }
});

test("public API preflight checks only external read-only contracts", () => {
  assert.match(apiPreflight, /\/api\/v1\/portal\/summary/u);
  assert.match(apiPreflight, /\/api\/v1\/plaza\/topics\?type=all&limit=20&offset=0/u);
  assert.doesNotMatch(
    apiPreflight,
    /\b(?:Authorization|DEPLOY_APPROVAL_TOKEN|CLOUDFLARE_|wrangler)\b|method:\s*["'](?:POST|PUT|DELETE)["']/u,
  );
});
