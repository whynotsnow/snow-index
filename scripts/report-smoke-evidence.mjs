const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const smokeOnly = process.argv.includes("--smoke-only") || process.env.DEPLOY_SMOKE_ONLY === "1";
const token = process.env.DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_SMOKE_PROJECT ?? "snow-index";
const target = process.env.DEPLOY_SMOKE_TARGET ?? "pages";
const deploymentRunId = process.env.DEPLOY_SMOKE_DEPLOYMENT_RUN_ID;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunUrl =
  process.env.DEPLOY_SMOKE_GITHUB_RUN_URL ??
  (githubRunId && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${githubRunId}`
    : undefined);

const checks = [
  {
    name: "home",
    url: "https://whynotsnow.com/",
    expectedStatus: 200,
    validateText(text) {
      return text.includes("Plaza") && text.includes("Blog") && text.includes("Admin");
    },
  },
  {
    name: "robots",
    url: "https://whynotsnow.com/robots.txt",
    expectedStatus: 200,
    validateText(text) {
      return text.includes("User-agent") && text.includes("Sitemap");
    },
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (projectSlug !== "snow-index") fail("DEPLOY_SMOKE_PROJECT 必须是 snow-index。");
if (target !== "pages") fail("DEPLOY_SMOKE_TARGET 必须是 pages。");
if (!smokeOnly) {
  if (!token) fail("缺少 DEPLOY_APPROVAL_TOKEN。");
  if (!deploymentRunId) fail("缺少 DEPLOY_SMOKE_DEPLOYMENT_RUN_ID。");
}

const results = [];
for (const check of checks) {
  const startedAt = new Date().toISOString();
  const response = await fetch(check.url, {
    headers: { Accept: "text/plain, text/html;q=0.9, */*;q=0.8" },
    signal: AbortSignal.timeout(15_000),
  }).catch((error) => ({
    ok: false,
    status: 0,
    url: check.url,
    text: async () => "",
    errorName: error.name,
  }));
  const text = await response.text().catch(() => "");
  const statusOk = response.status === check.expectedStatus;
  const bodyOk = statusOk && check.validateText(text);
  results.push({
    name: check.name,
    url: check.url,
    effectiveUrl: response.url || check.url,
    status: response.status,
    ok: statusOk && bodyOk,
    checkedAt: startedAt,
    error: response.errorName,
  });
}

const succeeded = results.every((result) => result.ok);
const failureCode = succeeded
  ? undefined
  : results
      .filter((result) => !result.ok)
      .map((result) => `${result.name}_${result.status || result.error || "failed"}`)
      .join("__")
      .replace(/[^A-Za-z0-9._:-]/gu, "_")
      .slice(0, 128) || "public_smoke_failed";
const outcome = succeeded ? "succeeded" : "failed";

if (!smokeOnly) {
  const payload = {
    projectSlug,
    target,
    deploymentRunId,
    outcome,
  };
  if (failureCode) payload.failureCode = failureCode;
  const response = await fetch(`${apiBaseUrl}/api/v1/deployments/integration-evidence/smoke`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok !== true) {
    const code = body?.ok === false ? body.error.code : `http_${response.status}`;
    fail(`写入 smoke evidence 失败：${code}`);
  }
}

console.log(
  `${smokeOnly ? "public smoke" : "run-bound smoke evidence"} ${outcome}: ${results
    .map((result) => `${result.name}=${result.status}`)
    .join(" ")}`,
);
if (!succeeded) fail("公开站点 smoke 未通过。");
