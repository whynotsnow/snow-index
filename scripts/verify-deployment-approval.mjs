import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const approvalToken = process.env.DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_APPROVAL_PROJECT;
const target = process.env.DEPLOY_APPROVAL_TARGET;
const commitSha = process.env.DEPLOY_APPROVAL_COMMIT_SHA;
const requestSource = process.env.DEPLOY_APPROVAL_REQUEST_SOURCE ?? "github-actions";
const requestUrl = process.env.DEPLOY_APPROVAL_REQUEST_URL;
const artifactType = process.env.DEPLOY_APPROVAL_ARTIFACT_TYPE;
const artifactId = process.env.DEPLOY_APPROVAL_ARTIFACT_ID;
const artifactDigest = process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST;
const artifactRunId = process.env.DEPLOY_APPROVAL_ARTIFACT_RUN_ID;
const artifactName = process.env.DEPLOY_APPROVAL_ARTIFACT_NAME;
const requestId = process.env.DEPLOY_APPROVAL_REQUEST_ID;
const suppliedApprovalId = process.env.DEPLOY_APPROVAL_ID;
const phase = process.env.DEPLOY_APPROVAL_PHASE ?? "complete";
const waitSeconds = Number.parseInt(process.env.DEPLOY_APPROVAL_WAIT_SECONDS ?? "900", 10);
const pollSeconds = Number.parseInt(process.env.DEPLOY_APPROVAL_POLL_SECONDS ?? "15", 10);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function truncate(value, max = 500) {
  const normalized = value.trim();
  return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

function changeSummary() {
  const supplied = process.env.DEPLOY_APPROVAL_CHANGE_SUMMARY?.trim();
  if (supplied) return truncate(supplied);
  try {
    const message = execFileSync("git", ["log", "-1", "--pretty=format:%s", commitSha], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (message.trim()) return truncate(message);
  } catch {
    // Keep the approval client usable in a shallow checkout.
  }
  return `Production Pages deployment for ${projectSlug}/${target}.`;
}

function approvalUrl() {
  const params = new URLSearchParams({ projectSlug, target, commitSha });
  if (requestUrl) params.set("requestUrl", requestUrl);
  params.set("artifactId", artifactId);
  params.set("artifactDigest", artifactDigest);
  return `https://admin.whynotsnow.com/deployments?${params.toString()}`;
}

async function json(response) {
  return await response.json().catch(() => null);
}

async function post(path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${approvalToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { response, body: await json(response) };
}

async function get(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${approvalToken}` },
  });
  return { response, body: await json(response) };
}

function errorCode(response, body) {
  return body?.ok === false ? body.error.code : `http_${response.status}`;
}

function writeOutputs(approval) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `approval_id=${approval}\nartifact_id=${artifactId}\nartifact_digest=${artifactDigest}\n`,
    "utf8",
  );
}

function validateInput() {
  if (!approvalToken) fail("缺少 DEPLOY_APPROVAL_TOKEN。请在 GitHub production Environment secret 中配置部署审批 token。");
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(projectSlug ?? "")) fail("DEPLOY_APPROVAL_PROJECT 必须是小写 slug。");
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(target ?? "")) fail("DEPLOY_APPROVAL_TARGET 必须是小写 target slug。");
  if (!/^[0-9a-f]{40}$/u.test(commitSha ?? "")) fail("DEPLOY_APPROVAL_COMMIT_SHA 必须是 40 位小写十六进制 SHA。");
  if (!["complete", "request", "consume"].includes(phase)) fail("DEPLOY_APPROVAL_PHASE 必须是 complete、request 或 consume。");
  if (!Number.isFinite(waitSeconds) || waitSeconds < 1 || waitSeconds > 1800) fail("DEPLOY_APPROVAL_WAIT_SECONDS 必须是 1 到 1800 之间的秒数。");
  if (!Number.isFinite(pollSeconds) || pollSeconds < 5 || pollSeconds > 60) fail("DEPLOY_APPROVAL_POLL_SECONDS 必须是 5 到 60 之间的秒数。");
  if (artifactType !== "pages-dist") fail("Pages v2 deployment 必须使用 pages-dist artifact。");
  if (!artifactId || !/^\S{1,128}$/u.test(artifactId)) fail("DEPLOY_APPROVAL_ARTIFACT_ID 必须存在。");
  if (!/^sha256:[0-9a-f]{64}$/u.test(artifactDigest ?? "")) fail("DEPLOY_APPROVAL_ARTIFACT_DIGEST 必须是 sha256:<64 位小写十六进制摘要>。");
  if (!artifactRunId || !/^\d+$/u.test(artifactRunId)) fail("DEPLOY_APPROVAL_ARTIFACT_RUN_ID 必须是 GitHub run id。");
  if (!artifactName || artifactName !== "snow-index-pages-candidate") fail("DEPLOY_APPROVAL_ARTIFACT_NAME 不匹配 snow-index candidate。");
  if (phase === "consume" && !suppliedApprovalId) fail("consume 阶段必须提供 DEPLOY_APPROVAL_ID。");
}

async function requestApproval() {
  const result = await post("/api/v1/deployments/request", {
    commitSha,
    projectSlug,
    target,
    expiresAt: new Date(Date.now() + waitSeconds * 1000).toISOString(),
    changeSummary: changeSummary(),
    validationSummary: process.env.DEPLOY_APPROVAL_VALIDATION_SUMMARY ?? "Canonical Pages artifact rechecked before approval.",
    note: `Production Pages workflow requested ${projectSlug}/${target} for ${commitSha}. artifact=${artifactId} digest=${artifactDigest}`,
    artifactId,
    artifactDigest,
    requestSource,
    requestUrl,
    idempotencyKey:
      requestId ??
      (process.env.GITHUB_RUN_ID && process.env.GITHUB_RUN_ATTEMPT
        ? `production-deploy:${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT}:${projectSlug}:${target}`
        : undefined),
  });
  if (result.response.status === 404) fail("部署审批 artifact-bound 接口不可用，已停止部署。");
  if (!result.response.ok || result.body?.ok !== true) {
    const code = errorCode(result.response, result.body);
    if (code === "missing_scope") fail("部署审批 token 缺少 deployments:request；未扩大 scope，已停止部署。");
    fail(`创建部署审批请求失败：${code}`);
  }
  const approvalId = result.body.data.approval.id;
  console.log(`${result.body.data.reused ? "复用" : "已创建"}部署审批请求：${approvalId}`);
  console.log(`请在请求窗口内打开 Admin 审批页面并批准或拒绝：${approvalUrl()}`);

  const deadline = Date.now() + waitSeconds * 1000;
  while (Date.now() <= deadline) {
    const status = await get(`/api/v1/deployments/requests/${approvalId}`);
    if (!status.response.ok || status.body?.ok !== true) fail(`查询部署审批状态失败：${errorCode(status.response, status.body)}`);
    const approval = status.body.data;
    if (approval.status === "approved") {
      console.log(`部署审批已批准：${approval.id}`);
      return approval.id;
    }
    if (approval.status === "rejected") fail(`部署审批已拒绝：${approval.id}`);
    if (approval.status === "expired") fail(`部署审批已过期，请创建新的审批请求：${approvalUrl()}`);
    if (approval.status === "used") fail(`部署审批已被消费，不能重复使用：${approval.id}`);
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    console.log(`等待部署审批 ${approval.id}，剩余 ${remaining} 秒。`);
    await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
  }
  fail(`等待部署审批超时，已等待 ${waitSeconds} 秒，请创建新的审批请求：${approvalUrl()}`);
}

async function consumeApproval(approvalId) {
  const result = await post("/api/v1/deployments/verify", {
    approvalId,
    commitSha,
    projectSlug,
    target,
    artifactId,
    artifactDigest,
  });
  if (!result.response.ok || result.body?.ok !== true) {
    const code = errorCode(result.response, result.body);
    if (code === "missing_scope") fail("部署审批 token 缺少 deployments:verify；未扩大 scope，已停止部署。");
    fail(`部署审批消费校验失败：${code}`);
  }
  console.log(`部署审批已校验并消费：${result.body.data.approvalId}`);
  return result.body.data.approvalId;
}

validateInput();
let approvalId = suppliedApprovalId;
if (phase !== "consume") approvalId = await requestApproval();
if (phase === "request") {
  writeOutputs(approvalId);
  console.log(`部署审批已批准，等待中心归档复验和部署：${approvalId}`);
} else {
  const consumed = await consumeApproval(approvalId);
  writeOutputs(consumed);
}
