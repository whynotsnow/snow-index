const apiBaseUrl = (
  process.env.SNOW_INDEX_PUBLIC_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/u, "");

const checks = [
  {
    label: "portal summary",
    path: "/api/v1/portal/summary",
    validate(data) {
      return (
        data?.ok === true &&
        Array.isArray(data?.data?.plaza?.pinnedNotices) &&
        Array.isArray(data?.data?.plaza?.recentTopics)
      );
    },
  },
  {
    label: "Plaza feed",
    path: "/api/v1/plaza/topics?type=all&limit=20&offset=0",
    validate(data) {
      return (
        data?.ok === true &&
        Array.isArray(data?.data?.items) &&
        Number.isInteger(data?.data?.total) &&
        Number.isInteger(data?.data?.limit) &&
        Number.isInteger(data?.data?.offset)
      );
    },
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const check of checks) {
  const url = `${apiBaseUrl}${check.path}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  }).catch((error) => fail(`${check.label} 请求失败：${error.name}`));
  if (!response.ok) fail(`${check.label} 返回 HTTP ${response.status}。`);
  const data = await response.json().catch(() => fail(`${check.label} 返回值不是 JSON。`));
  if (!check.validate(data)) fail(`${check.label} JSON shape 不符合 snow-index 预期。`);
}

const summary = "snow-base public API preflight passed for portal summary and Plaza feed.";
if (process.env.GITHUB_OUTPUT) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_OUTPUT, `validation_summary=${summary}\n`, "utf8");
}
console.log(summary);
