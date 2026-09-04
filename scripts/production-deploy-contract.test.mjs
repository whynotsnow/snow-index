import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-deploy.yml", "utf8");

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
  ]) {
    assert.ok(workflow.includes(phrase), `workflow missing ${phrase}`);
  }
  assert.doesNotMatch(workflow, /deployments:(?:artifact-promote|run-update)/u);
  assert.match(workflow, /retention-days: 7/u);
  assert.match(workflow, /actions: write/u);
});

test("selected path verifies, requests, consumes, then deploys the same payload", () => {
  const verify = workflow.indexOf("Verify and extract selected canonical payload");
  const request = workflow.indexOf("Request and wait for owner approval");
  const consume = workflow.indexOf("Consume exact owner approval");
  const deploy = workflow.indexOf("Deploy verified canonical payload");
  assert.ok(verify >= 0 && verify < request && request < consume && consume < deploy);
  assert.match(workflow, /wrangler.*pages deploy public/su);
  assert.match(workflow, /--expected-digest\s+"\$\{\{ inputs\.artifact_digest \}\}"/u);
  assert.match(workflow, /--extract-to\s+"\$RUNNER_TEMP\/pages-payload"/u);
});
