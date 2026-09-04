const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const token = process.env.DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_RUN_PROJECT ?? "snow-index";
const target = process.env.DEPLOY_RUN_TARGET ?? "pages";
const requestId = process.env.DEPLOY_RUN_REQUEST_ID;
const commitSha = process.env.DEPLOY_RUN_COMMIT_SHA;
const artifactId = process.env.DEPLOY_RUN_ARTIFACT_ID;
const artifactDigest = process.env.DEPLOY_RUN_ARTIFACT_DIGEST;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunUrl =
  process.env.DEPLOY_RUN_GITHUB_RUN_URL ??
  `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${githubRunId}`;
const status = process.env.DEPLOY_RUN_STATUS;
const conclusion = process.env.DEPLOY_RUN_CONCLUSION;
const phase = process.env.DEPLOY_RUN_PHASE;
const errorCode = process.env.DEPLOY_RUN_ERROR_CODE;

const statusValues = new Set(["queued", "in_progress", "completed"]);
const conclusionValues = new Set(["success", "failure", "cancelled", "skipped", "timed_out"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!token) fail("缺少 DEPLOY_APPROVAL_TOKEN。");
for (const [name, value] of Object.entries({
  DEPLOY_RUN_REQUEST_ID: requestId,
  DEPLOY_RUN_COMMIT_SHA: commitSha,
  DEPLOY_RUN_ARTIFACT_ID: artifactId,
  DEPLOY_RUN_ARTIFACT_DIGEST: artifactDigest,
  DEPLOY_RUN_STATUS: status,
  GITHUB_RUN_ID: githubRunId,
  GITHUB_SERVER_URL: process.env.GITHUB_SERVER_URL,
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
})) {
  if (!value) fail(`缺少 ${name}。`);
}
if (projectSlug !== "snow-index") fail("DEPLOY_RUN_PROJECT 必须是 snow-index。");
if (target !== "pages") fail("DEPLOY_RUN_TARGET 必须是 pages。");
if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(requestId)) {
  fail("DEPLOY_RUN_REQUEST_ID 必须是 1 到 128 位的字母、数字、点、下划线、冒号或短横线。");
}
if (!/^[0-9a-f]{40}$/u.test(commitSha)) {
  fail("DEPLOY_RUN_COMMIT_SHA 必须是 40 位小写十六进制 SHA。");
}
if (!/^sha256:[0-9a-f]{64}$/u.test(artifactDigest)) {
  fail("DEPLOY_RUN_ARTIFACT_DIGEST 必须是 sha256:<64 位小写十六进制摘要>。");
}
if (!/^\d+$/u.test(githubRunId)) fail("GITHUB_RUN_ID 必须是数字。");
if (!statusValues.has(status)) fail(`DEPLOY_RUN_STATUS 不支持：${status}`);
if (status === "completed" && !conclusionValues.has(conclusion)) {
  fail("DEPLOY_RUN_CONCLUSION 必须在 completed 状态下设置为有效 conclusion。");
}

const response = await fetch(`${apiBaseUrl}/api/v1/deployments/runs/update`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectSlug,
    target,
    requestId,
    commitSha,
    artifactId,
    artifactDigest,
    githubRunId,
    githubRunUrl,
    status,
    conclusion,
    phase,
    errorCode,
  }),
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
  const code = body?.ok === false ? body.error.code : `http_${response.status}`;
  fail(`回写 deployment run 失败：${code}`);
}
console.log(`回写 deployment run ${requestId} ${status}${conclusion ? `/${conclusion}` : ""}`);
