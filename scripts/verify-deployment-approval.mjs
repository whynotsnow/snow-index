const apiBaseUrl = (
  process.env.DEPLOY_APPROVAL_API_BASE_URL ??
  process.env.SNOW_BASE_API_BASE_URL ??
  "https://api.whynotsnow.com"
).replace(/\/+$/, "");
const approvalToken =
  process.env.DEPLOY_APPROVAL_TOKEN ?? process.env.SNOW_BASE_DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_APPROVAL_PROJECT ?? "snow-base";
const commitSha = process.env.DEPLOY_APPROVAL_COMMIT_SHA ?? process.env.SNOW_BASE_DEPLOY_COMMIT_SHA;
const target = process.env.DEPLOY_APPROVAL_TARGET ?? process.env.SNOW_BASE_DEPLOY_TARGET;
const requestSource =
  process.env.DEPLOY_APPROVAL_REQUEST_SOURCE ??
  process.env.SNOW_BASE_DEPLOY_REQUEST_SOURCE ??
  "github-actions";
const requestUrl =
  process.env.DEPLOY_APPROVAL_REQUEST_URL ?? process.env.SNOW_BASE_DEPLOY_REQUEST_URL;
const runId = process.env.GITHUB_RUN_ID;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const waitSeconds = Number.parseInt(
  process.env.DEPLOY_APPROVAL_WAIT_SECONDS ??
    process.env.SNOW_BASE_DEPLOY_APPROVAL_WAIT_SECONDS ??
    "900",
  10,
);
const pollSeconds = Number.parseInt(
  process.env.DEPLOY_APPROVAL_POLL_SECONDS ??
    process.env.SNOW_BASE_DEPLOY_APPROVAL_POLL_SECONDS ??
    "15",
  10,
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function approvalCreateUrl() {
  const params = new URLSearchParams({
    projectSlug,
    target,
    commitSha,
  });
  if (requestUrl) params.set("requestUrl", requestUrl);
  return `https://admin.whynotsnow.com/deployments?${params.toString()}`;
}

async function readJsonResponse(response) {
  return await response.json().catch(() => null);
}

async function postJson(path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${approvalToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return { response, body: await readJsonResponse(response) };
}

async function getJson(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${approvalToken}`,
    },
  });

  return { response, body: await readJsonResponse(response) };
}

function apiErrorCode(response, body) {
  return body?.ok === false ? body.error.code : `http_${response.status}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!approvalToken) {
  fail(
    "缺少 DEPLOY_APPROVAL_TOKEN。请在 GitHub production Environment secret 中配置部署审批 token。旧名称 SNOW_BASE_DEPLOY_APPROVAL_TOKEN 仍可作为兼容回退。",
  );
}

if (!/^[a-z][a-z0-9-]{0,63}$/u.test(projectSlug)) {
  fail("DEPLOY_APPROVAL_PROJECT 必须是小写 slug，例如 snow-base 或 snow-index。");
}

if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha)) {
  fail("DEPLOY_APPROVAL_COMMIT_SHA 必须是 40 位小写十六进制 commit SHA。");
}

if (!target || !/^[a-z][a-z0-9-]{0,63}$/u.test(target)) {
  fail("DEPLOY_APPROVAL_TARGET 必须是小写 target slug，例如 admin、api、both 或 pages。");
}

if (!Number.isFinite(waitSeconds) || waitSeconds < 1 || waitSeconds > 1800) {
  fail("DEPLOY_APPROVAL_WAIT_SECONDS 必须是 1 到 1800 之间的秒数。");
}

if (!Number.isFinite(pollSeconds) || pollSeconds < 5 || pollSeconds > 60) {
  fail("DEPLOY_APPROVAL_POLL_SECONDS 必须是 5 到 60 之间的秒数。");
}

const requestBody = {
  commitSha,
  projectSlug,
  target,
  expiresAt: new Date(Date.now() + waitSeconds * 1000).toISOString(),
  note: `Production Deploy workflow requested ${projectSlug}/${target} deployment for ${commitSha}.`,
  requestSource,
  requestUrl,
  idempotencyKey:
    runId && runAttempt
      ? `production-deploy:${runId}:${runAttempt}:${projectSlug}:${target}`
      : undefined,
};

const requestResult = await postJson("/api/v1/deployments/request", requestBody);
let approvalId;

if (requestResult.response.status === 404) {
  console.log("部署审批自动请求接口暂不可用，将回退到旧版 verify-only 校验流程。");
} else if (!requestResult.response.ok || requestResult.body?.ok !== true) {
  const code = apiErrorCode(requestResult.response, requestResult.body);
  if (code === "missing_scope") {
    fail(
      "部署审批 token 缺少 deployments:request。请重新创建或轮换 DEPLOY_APPROVAL_TOKEN，并同时勾选 deployments:request 和 deployments:verify。",
    );
  }
  fail(`创建部署审批请求失败：${code}`);
} else {
  approvalId = requestResult.body.data.approval.id;
  const action = requestResult.body.data.reused ? "复用已有" : "已创建";
  console.log(`${action}部署审批请求：${approvalId}`);
  console.log(`请在 15 分钟内打开 Admin 审批页面并批准或拒绝：${approvalCreateUrl()}`);

  const deadline = Date.now() + waitSeconds * 1000;
  while (Date.now() <= deadline) {
    const statusResult = await getJson(`/api/v1/deployments/requests/${approvalId}`);
    if (!statusResult.response.ok || statusResult.body?.ok !== true) {
      const code = apiErrorCode(statusResult.response, statusResult.body);
      fail(`查询部署审批状态失败：${code}`);
    }

    const approval = statusResult.body.data;
    if (approval.status === "approved") {
      console.log(`部署审批已批准：${approval.id}`);
      break;
    }
    if (approval.status === "rejected") {
      fail(`部署审批已拒绝：${approval.id}`);
    }
    if (approval.status === "expired") {
      fail(`部署审批已过期。请用该链接预填并创建新的审批请求：${approvalCreateUrl()}`);
    }
    if (approval.status === "used") {
      fail(`部署审批已被消费，不能重复使用：${approval.id}`);
    }

    const remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    console.log(`等待部署审批 ${approval.id}，剩余 ${remainingSeconds} 秒。`);
    await delay(pollSeconds * 1000);
  }

  if (Date.now() > deadline) {
    fail(
      `等待部署审批超时，已等待 ${waitSeconds} 秒。请用该链接预填并创建新的审批请求：${approvalCreateUrl()}`,
    );
  }
}

const verifyResult = await postJson("/api/v1/deployments/verify", {
  commitSha,
  projectSlug,
  target,
});

if (!verifyResult.response.ok || verifyResult.body?.ok !== true) {
  const code = apiErrorCode(verifyResult.response, verifyResult.body);
  fail(`部署审批消费校验失败：${code}`);
}

console.log(`部署审批已校验并消费：${verifyResult.body.data.approvalId}`);
