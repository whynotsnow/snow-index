const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const token = process.env.DEPLOY_APPROVAL_TOKEN;
const required = [
  "DEPLOY_APPROVAL_COMMIT_SHA",
  "DEPLOY_APPROVAL_ARTIFACT_DIGEST",
  "DEPLOY_APPROVAL_ARTIFACT_ID",
  "DEPLOY_APPROVAL_ARTIFACT_NAME",
  "DEPLOY_APPROVAL_ARTIFACT_URL",
  "DEPLOY_APPROVAL_RUN_URL",
  "GITHUB_RUN_ID",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!token) fail("缺少 DEPLOY_APPROVAL_TOKEN。");
for (const name of required) if (!process.env[name]) fail(`缺少 ${name}。`);
if (!/^[0-9a-f]{40}$/u.test(process.env.DEPLOY_APPROVAL_COMMIT_SHA)) {
  fail("DEPLOY_APPROVAL_COMMIT_SHA 必须是 40 位小写十六进制 SHA。");
}
if (!/^sha256:[0-9a-f]{64}$/u.test(process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST)) {
  fail("DEPLOY_APPROVAL_ARTIFACT_DIGEST 必须是 sha256:<64 位小写十六进制摘要>。");
}
if (process.env.DEPLOY_APPROVAL_ARTIFACT_NAME !== "snow-index-pages-candidate") {
  fail("DEPLOY_APPROVAL_ARTIFACT_NAME 必须是 snow-index-pages-candidate。");
}
const retentionDays = Number.parseInt(process.env.DEPLOY_APPROVAL_RETENTION_DAYS ?? "7", 10);
if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 7) {
  fail("DEPLOY_APPROVAL_RETENTION_DAYS 必须是 1 到 7 之间的整数。");
}

const response = await fetch(`${apiBaseUrl}/api/v1/deployments/artifacts`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectSlug: "snow-index",
    target: "pages",
    role: "candidate",
    commitSha: process.env.DEPLOY_APPROVAL_COMMIT_SHA,
    artifactType: "pages-dist",
    digest: process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST,
    storageProvider: "github-actions",
    storageKey: process.env.DEPLOY_APPROVAL_ARTIFACT_NAME,
    requestSource: "github-actions",
    requestUrl: process.env.DEPLOY_APPROVAL_RUN_URL,
    buildStatus: "succeeded",
    validationStatus: "succeeded",
    expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      githubArtifactId: process.env.DEPLOY_APPROVAL_ARTIFACT_ID,
      githubArtifactRunId: process.env.GITHUB_RUN_ID,
      githubArtifactName: process.env.DEPLOY_APPROVAL_ARTIFACT_NAME,
      canonicalArchiveName: "pages-dist.tar.gz",
      artifactUrl: process.env.DEPLOY_APPROVAL_ARTIFACT_URL,
      githubRunUrl: process.env.DEPLOY_APPROVAL_RUN_URL,
      retentionDays,
    },
  }),
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
  const code = body?.ok === false ? body.error.code : `http_${response.status}`;
  fail(`登记 candidate artifact 失败：${code}`);
}
const artifact = body.data.artifact;
if (!artifact?.id || artifact.digest !== process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST) {
  fail("登记 candidate artifact 返回的 identity 不匹配。");
}
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_OUTPUT, `artifact_id=${artifact.id}\nartifact_digest=${artifact.digest}\n`, "utf8");
}
console.log(`${body.data.reused ? "复用" : "登记"} candidate artifact ${artifact.id} ${artifact.digest}`);
