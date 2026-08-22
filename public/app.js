const API_BASE = "https://api.whynotsnow.com";
const SUMMARY_ENDPOINT = `${API_BASE}/api/v1/portal/summary`;
const BLOG_FEED_ENDPOINT = "https://blog.whynotsnow.com/rss.xml";
const FIXTURE_ENDPOINT = "/data/portal-summary.fixture.json";
const BLOG_FIXTURE_ENDPOINT = "/data/blog-summary.fixture.json";
const CACHE_KEY = "snow-index:portal-summary:v1";
const BLOG_CACHE_KEY = "snow-index:blog-summary:v1";
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

function isBlogPost(value) {
	return (
		value &&
		typeof value.title === "string" &&
		typeof value.excerpt === "string" &&
		typeof value.url === "string" &&
		typeof value.publishedAt === "string" &&
		Array.isArray(value.categories) &&
		value.categories.every((category) => typeof category === "string")
	);
}

function isBlogSummary(value) {
	return (
		value?.ok === true &&
		typeof value?.data?.generatedAt === "string" &&
		typeof value?.data?.cacheTtlSeconds === "number" &&
		Array.isArray(value?.data?.posts) &&
		value.data.posts.every(isBlogPost)
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

async function fetchText(url, options = {}) {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { Accept: "application/rss+xml, application/xml, text/xml" },
			signal: controller.signal,
			...options,
		});
		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}
		return response.text();
	} finally {
		window.clearTimeout(timeout);
	}
}

function readCache() {
	return readTypedCache(CACHE_KEY, isSummary);
}

function readTypedCache(key, validator) {
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) {
			return null;
		}
		const cached = JSON.parse(raw);
		return validator(cached) ? cached : null;
	} catch {
		return null;
	}
}

function writeCache(summary) {
	writeTypedCache(CACHE_KEY, summary);
}

function writeTypedCache(key, payload) {
	try {
		window.localStorage.setItem(key, JSON.stringify(payload));
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

async function loadBlogSummary() {
	try {
		const xml = await fetchText(BLOG_FEED_ENDPOINT, { mode: "cors" });
		const summary = parseBlogFeed(xml);
		writeTypedCache(BLOG_CACHE_KEY, summary);
		return { summary, source: "public-feed" };
	} catch {
		const cached = readTypedCache(BLOG_CACHE_KEY, isBlogSummary);
		if (cached) {
			return { summary: cached, source: "stale-cache" };
		}
		const summary = await fetchBlogFixture();
		return { summary, source: "fixture" };
	}
}

async function fetchBlogFixture() {
	const response = await fetch(BLOG_FIXTURE_ENDPOINT, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`Request failed with ${response.status}`);
	}
	const payload = await response.json();
	if (!isBlogSummary(payload)) {
		throw new Error("Unexpected Blog summary fixture shape");
	}
	return payload;
}

function parseBlogFeed(xml) {
	const document = new DOMParser().parseFromString(xml, "application/xml");
	const parseError = document.querySelector("parsererror");
	if (parseError) {
		throw new Error("Invalid Blog feed XML");
	}
	const posts = Array.from(document.querySelectorAll("item"))
		.slice(0, 4)
		.map((item) => ({
			title: item.querySelector("title")?.textContent?.trim() ?? "",
			excerpt: stripHtml(item.querySelector("description")?.textContent ?? ""),
			url: item.querySelector("link")?.textContent?.trim() ?? "https://blog.whynotsnow.com/",
			publishedAt: parseDate(item.querySelector("pubDate")?.textContent),
			categories: Array.from(item.querySelectorAll("category"))
				.map((category) => category.textContent?.trim() ?? "")
				.filter(Boolean)
				.slice(0, 3),
		}))
		.filter(isBlogPost);
	if (posts.length === 0) {
		throw new Error("Blog feed has no public posts");
	}
	return {
		ok: true,
		data: {
			generatedAt: new Date().toISOString(),
			cacheTtlSeconds: 300,
			posts,
		},
	};
}

function stripHtml(value) {
	const element = document.createElement("div");
	element.innerHTML = value;
	return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseDate(value) {
	const date = new Date(value ?? Date.now());
	return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
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

function createBlogItem(post) {
	const item = document.createElement("li");
	const type = document.createElement("span");
	const title = document.createElement("strong");
	const excerpt = document.createElement("p");
	const meta = document.createElement("small");
	const link = document.createElement("a");

	type.className = "activity-type";
	type.textContent = post.categories[0] ?? "Blog";
	title.textContent = post.title;
	excerpt.textContent = post.excerpt;
	meta.className = "activity-meta";
	meta.textContent = formatDate(post.publishedAt);
	link.href = post.url;
	link.textContent = "阅读";

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

function renderBlogSummary(summary, source) {
	const list = document.querySelector("[data-blog-posts]");
	const sourceText = document.querySelector("[data-blog-source]");
	if (!list) {
		return;
	}

	list.replaceChildren(
		...summary.data.posts.slice(0, 4).map(createBlogItem),
	);

	if (sourceText) {
		const sourceLabel = {
			"public-feed": "公开 RSS",
			"stale-cache": "本地缓存",
			fixture: "本地降级",
		}[source];
		sourceText.textContent = `Blog 摘要来源：${sourceLabel} · ${summary.data.cacheTtlSeconds}s TTL`;
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

loadBlogSummary()
	.then(({ summary, source }) => renderBlogSummary(summary, source))
	.catch(() => {
		const sourceText = document.querySelector("[data-blog-source]");
		if (sourceText) {
			sourceText.textContent = "Blog 摘要暂不可用，保留 Blog 入口。";
		}
	});
