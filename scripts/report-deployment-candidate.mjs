const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const token = process.env.DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_CANDIDATE_PROJECT ?? "snow-index";
const target = process.env.DEPLOY_CANDIDATE_TARGET ?? "pages";
const requestId = process.env.DEPLOY_CANDIDATE_REQUEST_ID;
const commitSha = process.env.DEPLOY_CANDIDATE_COMMIT_SHA;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunUrl =
  process.env.DEPLOY_CANDIDATE_RUN_URL ??
  `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${githubRunId}`;
const status = process.env.DEPLOY_CANDIDATE_STATUS;
const conclusion = process.env.DEPLOY_CANDIDATE_CONCLUSION;
const phase = process.env.DEPLOY_CANDIDATE_PHASE;
const errorCode = process.env.DEPLOY_CANDIDATE_ERROR_CODE;
const artifactId = process.env.DEPLOY_CANDIDATE_ARTIFACT_ID;
const artifactDigest = process.env.DEPLOY_CANDIDATE_ARTIFACT_DIGEST;

const statusValues = new Set(["queued", "in_progress", "completed"]);
const conclusionValues = new Set(["success", "failure", "cancelled", "skipped", "timed_out"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!token) fail("缺少 DEPLOY_APPROVAL_TOKEN。");
for (const [name, value] of Object.entries({
  DEPLOY_CANDIDATE_REQUEST_ID: requestId,
  DEPLOY_CANDIDATE_COMMIT_SHA: commitSha,
  DEPLOY_CANDIDATE_STATUS: status,
  GITHUB_RUN_ID: githubRunId,
  GITHUB_SERVER_URL: process.env.GITHUB_SERVER_URL,
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
})) {
  if (!value) fail(`缺少 ${name}。`);
}
if (projectSlug !== "snow-index") fail("DEPLOY_CANDIDATE_PROJECT 必须是 snow-index。");
if (target !== "pages") fail("DEPLOY_CANDIDATE_TARGET 必须是 pages。");
if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(requestId)) {
  fail("DEPLOY_CANDIDATE_REQUEST_ID 必须是 1 到 128 位的字母、数字、点、下划线、冒号或短横线。");
}
if (!/^[0-9a-f]{40}$/u.test(commitSha)) {
  fail("DEPLOY_CANDIDATE_COMMIT_SHA 必须是 40 位小写十六进制 SHA。");
}
if (!/^\d+$/u.test(githubRunId)) fail("GITHUB_RUN_ID 必须是数字。");
if (!statusValues.has(status)) fail(`DEPLOY_CANDIDATE_STATUS 不支持：${status}`);
if (status === "completed" && !conclusionValues.has(conclusion)) {
  fail("DEPLOY_CANDIDATE_CONCLUSION 必须在 completed 状态下设置为有效 conclusion。");
}
if (artifactDigest && !/^sha256:[0-9a-f]{64}$/u.test(artifactDigest)) {
  fail("DEPLOY_CANDIDATE_ARTIFACT_DIGEST 必须是 sha256:<64 位小写十六进制摘要>。");
}
if ((artifactId && !artifactDigest) || (!artifactId && artifactDigest)) {
  fail("DEPLOY_CANDIDATE_ARTIFACT_ID 和 DEPLOY_CANDIDATE_ARTIFACT_DIGEST 必须同时设置。");
}

const response = await fetch(`${apiBaseUrl}/api/v1/deployments/candidate-runs`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requestId,
    projectSlug,
    target,
    commitSha,
    githubRunId,
    githubRunUrl,
    status,
    conclusion,
    phase,
    errorCode,
    artifactId,
    artifactDigest,
  }),
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
  const code = body?.ok === false ? body.error.code : `http_${response.status}`;
  fail(`回写 candidate run 失败：${code}`);
}
console.log(`回写 candidate run ${requestId} ${status}${conclusion ? `/${conclusion}` : ""}`);
