const API_BASE = "https://api.whynotsnow.com";
const SUMMARY_ENDPOINT = `${API_BASE}/api/v1/portal/summary`;
const FIXTURE_ENDPOINT = "/data/portal-summary.fixture.json";
const CACHE_KEY = "snow-index:portal-summary:v1";
const FETCH_TIMEOUT_MS = 3200;

const labels = {
	notice: "公告",
	status: "动态",
	discussion: "讨论",
	question: "问答",
	feedback: "反馈",
	guestbook: "留言",
};

function isTopic(value) {
	return (
		value &&
		typeof value.id === "string" &&
		typeof value.type === "string" &&
		typeof value.title === "string" &&
		typeof value.excerpt === "string" &&
		typeof value.url === "string" &&
		typeof value.replyCount === "number" &&
		typeof value.reactionCount === "number" &&
		typeof value.pinned === "boolean" &&
		typeof value.locked === "boolean" &&
		typeof value.lastActivityAt === "string" &&
		typeof value.createdAt === "string"
	);
}

function isSummary(value) {
	const plaza = value?.data?.plaza;
	return (
		value?.ok === true &&
		typeof value?.data?.generatedAt === "string" &&
		typeof value?.data?.cacheTtlSeconds === "number" &&
		Array.isArray(plaza?.pinnedNotices) &&
		Array.isArray(plaza?.recentTopics) &&
		plaza.pinnedNotices.every(isTopic) &&
		plaza.recentTopics.every(isTopic)
	);
}

async function fetchJson(url, options = {}) {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: controller.signal,
			...options,
		});
		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}
		const payload = await response.json();
		if (!isSummary(payload)) {
			throw new Error("Unexpected portal summary shape");
		}
		return payload;
	} finally {
		window.clearTimeout(timeout);
	}
}

function readCache() {
	try {
		const raw = window.localStorage.getItem(CACHE_KEY);
		if (!raw) {
			return null;
		}
		const cached = JSON.parse(raw);
		return isSummary(cached) ? cached : null;
	} catch {
		return null;
	}
}

function writeCache(summary) {
	try {
		window.localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
	} catch {
		// Cache is best-effort. Rendering must not depend on it.
	}
}

async function loadPortalSummary() {
	try {
		const summary = await fetchJson(SUMMARY_ENDPOINT, { mode: "cors" });
		writeCache(summary);
		return { summary, source: "public-api" };
	} catch {
		const cached = readCache();
		if (cached) {
			return { summary: cached, source: "stale-cache" };
		}
		const summary = await fetchJson(FIXTURE_ENDPOINT);
		return { summary, source: "fixture" };
	}
}

function formatDate(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return new Intl.DateTimeFormat("zh-CN", {
		month: "short",
		day: "numeric",
	}).format(date);
}

function createTopicItem(topic) {
	const item = document.createElement("li");
	const type = document.createElement("span");
	const title = document.createElement("strong");
	const excerpt = document.createElement("p");
	const meta = document.createElement("small");
	const link = document.createElement("a");

	type.className = "activity-type";
	type.textContent = topic.pinned ? "置顶" : (labels[topic.type] ?? topic.type);
	title.textContent = topic.title;
	excerpt.textContent = topic.excerpt;
	meta.className = "activity-meta";
	meta.textContent = `${formatDate(topic.lastActivityAt)} · ${topic.replyCount} 回复 · ${topic.reactionCount} 反应`;
	link.href = topic.url;
	link.textContent = "查看";

	item.append(type, title, excerpt, meta, link);
	return item;
}

function renderSummary(summary, source) {
	const list = document.querySelector("[data-portal-activity]");
	const sourceText = document.querySelector("[data-summary-source]");
	if (!list) {
		return;
	}

	const topics = [
		...summary.data.plaza.pinnedNotices,
		...summary.data.plaza.recentTopics,
	].slice(0, 5);

	list.replaceChildren(
		...(topics.length > 0
			? topics.map(createTopicItem)
			: [createEmptyItem()])
	);

	if (sourceText) {
		const sourceLabel = {
			"public-api": "公开 API",
			"stale-cache": "本地缓存",
			fixture: "本地降级",
		}[source];
		sourceText.textContent = `Plaza 摘要来源：${sourceLabel} · ${summary.data.cacheTtlSeconds}s TTL`;
	}
}

function createEmptyItem() {
	const item = document.createElement("li");
	const type = document.createElement("span");
	const title = document.createElement("strong");
	const excerpt = document.createElement("p");
	type.className = "activity-type";
	type.textContent = "Plaza";
	title.textContent = "暂无公开动态";
	excerpt.textContent = "公开聚合接口暂未返回可见内容，Portal 保持可用。";
	item.append(type, title, excerpt);
	return item;
}

loadPortalSummary()
	.then(({ summary, source }) => renderSummary(summary, source))
	.catch(() => {
		const sourceText = document.querySelector("[data-summary-source]");
		if (sourceText) {
			sourceText.textContent = "Plaza 摘要暂不可用，已保留静态入口。";
		}
	});
