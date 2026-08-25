import { siteConfig } from "./site-config.js";

const API_BASE = "https://api.whynotsnow.com";
const FIXTURE_ENDPOINT = "/data/plaza.fixture.json";
const FETCH_TIMEOUT_MS = 3200;
const TURNSTILE_READY_TIMEOUT_MS = 10000;

const typeLabels = {
	all: "全部",
	notice: "公告",
	status: "动态",
	discussion: "讨论",
	question: "问答",
	feedback: "反馈",
	guestbook: "留言",
};

const validTypes = new Set(Object.keys(typeLabels));

const submitErrorCopy = {
	missing_turnstile: "请先完成人机验证。",
	invalid_turnstile: "验证失败，请重试。",
	turnstile_unavailable: "验证服务暂时不可用，请稍后。",
	turnstile_not_configured: "Plaza 提交暂未开放。",
	rate_limited: "提交过于频繁，请稍后再试。",
	invalid_type: "请选择有效类型。",
	invalid_title: "标题长度不符合要求。",
	invalid_body: "正文长度不符合要求。",
	invalid_author_name: "昵称长度不符合要求。",
	topic_not_found: "主题不存在或不可见。",
	topic_locked: "该主题已锁定，不能回复。",
};

function absoluteUrl(path) {
	return new URL(path, siteConfig.seo.baseUrl).toString();
}

function setMeta(selector, value) {
	const element = document.querySelector(selector);
	if (element && typeof value === "string") {
		element.setAttribute("content", value);
	}
}

function setCanonical(url) {
	const canonical = document.querySelector("link[rel='canonical']");
	if (canonical) {
		canonical.setAttribute("href", url);
	}
}

function applyPageMeta(page, url = absoluteUrl(page.path)) {
	document.title = page.title;
	setMeta("meta[name='description']", page.description);
	setCanonical(url);
	setMeta("meta[property='og:title']", page.title);
	setMeta("meta[property='og:description']", page.description);
	setMeta("meta[property='og:url']", url);
	setMeta("meta[name='twitter:title']", page.title);
	setMeta("meta[name='twitter:description']", page.description);
}

function applyTopicMeta(topic) {
	const title = `${topic.title} · WhynotSnow`;
	const description = topic.excerpt;
	const url = absoluteUrl(topic.url);
	document.title = title;
	setMeta("meta[name='description']", description);
	setCanonical(url);
	setMeta("meta[property='og:title']", title);
	setMeta("meta[property='og:description']", description);
	setMeta("meta[property='og:url']", url);
	setMeta("meta[name='twitter:title']", title);
	setMeta("meta[name='twitter:description']", description);
}

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
		typeof value.attachmentCount === "number" &&
		typeof value.pinned === "boolean" &&
		typeof value.locked === "boolean" &&
		typeof value.lastActivityAt === "string" &&
		typeof value.createdAt === "string"
	);
}

function isTopicDetail(value) {
	return isTopic(value) && typeof value.body === "string" && Array.isArray(value.attachments);
}

function isReply(value) {
	return (
		value &&
		typeof value.id === "string" &&
		typeof value.body === "string" &&
		typeof value.createdAt === "string" &&
		Array.isArray(value.attachments)
	);
}

async function fetchJson(url) {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: controller.signal,
			mode: url.startsWith("http") ? "cors" : "same-origin",
		});
		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}
		return response.json();
	} finally {
		window.clearTimeout(timeout);
	}
}

async function postJson(url, body) {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: controller.signal,
			mode: "cors",
		});
		let payload = null;
		try {
			payload = await response.json();
		} catch {
			// Some failures may not have a JSON body.
		}
		if (!response.ok) {
			const error = new Error(`Request failed with ${response.status}`);
			error.payload = payload;
			throw error;
		}
		return payload;
	} finally {
		window.clearTimeout(timeout);
	}
}

async function loadFixture() {
	const payload = await fetchJson(FIXTURE_ENDPOINT);
	const data = payload?.data;
	if (!Array.isArray(data?.topics) || !data.topics.every(isTopic)) {
		throw new Error("Invalid Plaza fixture topics");
	}
	return data;
}

function extractTopics(payload) {
	const candidates = [
		payload?.data?.topics,
		payload?.data?.items,
		payload?.data,
		payload?.topics,
		payload?.items,
	];
	const topics = candidates.find(Array.isArray);
	if (!topics || !topics.every(isTopic)) {
		throw new Error("Unexpected Plaza topics shape");
	}
	return topics;
}

function extractTopicDetail(payload) {
	const detail = payload?.data?.topic ?? payload?.data ?? payload?.topic;
	if (!isTopicDetail(detail)) {
		throw new Error("Unexpected Plaza topic detail shape");
	}
	return detail;
}

function extractReplies(payload) {
	const candidates = [
		payload?.data?.replies,
		payload?.data?.items,
		payload?.data,
		payload?.replies,
		payload?.items,
	];
	const replies = candidates.find(Array.isArray);
	if (!replies || !replies.every(isReply)) {
		throw new Error("Unexpected Plaza replies shape");
	}
	return replies;
}

function getSelectedType() {
	const type = new URLSearchParams(window.location.search).get("type") ?? "all";
	return validTypes.has(type) ? type : "all";
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

function topicType(topic) {
	return topic.pinned ? "置顶" : (typeLabels[topic.type] ?? topic.type);
}

function createTopicCard(topic) {
	const article = document.createElement("article");
	const content = document.createElement("div");
	const type = document.createElement("span");
	const title = document.createElement("h2");
	const link = document.createElement("a");
	const excerpt = document.createElement("p");
	const meta = document.createElement("span");

	article.className = `topic${topic.pinned ? " pinned" : ""}`;
	type.className = "activity-type";
	type.textContent = topicType(topic);
	link.href = topic.url;
	link.textContent = topic.title;
	title.append(link);
	excerpt.textContent = topic.excerpt;
	meta.className = "topic-meta";
	meta.textContent = [
		formatDate(topic.lastActivityAt),
		`${topic.replyCount} 回复`,
		`${topic.reactionCount} 反应`,
		topic.attachmentCount > 0 ? `${topic.attachmentCount} 附件` : "",
		topic.locked ? "已锁定" : "",
	].filter(Boolean).join(" · ");

	content.append(type, title, excerpt);
	article.append(content, meta);
	return article;
}

function renderList(topics, source, selectedType) {
	const feed = document.querySelector("[data-plaza-feed]");
	const sourceText = document.querySelector("[data-plaza-source]");
	if (!feed) {
		return;
	}

	const visible = selectedType === "all"
		? topics
		: topics.filter((topic) => topic.type === selectedType);

	feed.replaceChildren(
		...(visible.length > 0
			? visible.map(createTopicCard)
			: [createStateCard(
				selectedType === "all" ? "暂无公开主题" : `${typeLabels[selectedType]} 暂无内容`,
				selectedType === "all" ? "当前没有可见内容。" : "当前分类没有可见内容。",
				selectedType === "all" ? [] : [{ label: "查看全部", href: "/plaza/" }],
			)])
	);

	if (sourceText) {
		const sourceLabel = source === "public-api"
			? "公开 API"
			: "公开 API 暂不可用，已显示本地降级";
		sourceText.textContent = `主题来源：${sourceLabel} · ${typeLabels[selectedType]}`;
	}
}

function createStateCard(title, body, actions = []) {
	const article = document.createElement("article");
	const content = document.createElement("div");
	const label = document.createElement("span");
	const heading = document.createElement("h2");
	const copy = document.createElement("p");
	article.className = "topic muted";
	label.className = "activity-type";
	label.textContent = "状态";
	heading.textContent = title;
	copy.textContent = body;
	content.append(label, heading, copy);
	if (actions.length > 0) {
		const actionList = document.createElement("div");
		actionList.className = "state-actions";
		for (const action of actions) {
			const link = document.createElement("a");
			link.href = action.href;
			link.textContent = action.label;
			actionList.append(link);
		}
		content.append(actionList);
	}
	article.append(content);
	return article;
}

function wireFilters(selectedType) {
	for (const button of document.querySelectorAll("[data-plaza-type]")) {
		const type = button.getAttribute("data-plaza-type") ?? "all";
		button.setAttribute("aria-pressed", String(type === selectedType));
		button.addEventListener("click", () => {
			const next = new URL(window.location.href);
			if (type === "all") {
				next.searchParams.delete("type");
			} else {
				next.searchParams.set("type", type);
			}
			window.location.href = next.toString();
		});
	}
}

async function loadTopics(type) {
	try {
		const payload = await fetchJson(`${API_BASE}/api/v1/plaza/topics?type=${encodeURIComponent(type)}&limit=20&offset=0`);
		return { topics: extractTopics(payload), source: "public-api" };
	} catch {
		const fixture = await loadFixture();
		return { topics: fixture.topics, source: "fixture" };
	}
}

function topicIdFromPath() {
	const match = window.location.pathname.match(/\/plaza\/t\/([^/?#]+)/);
	return match ? decodeURIComponent(match[1]) : new URLSearchParams(window.location.search).get("id");
}

async function loadTopicDetail(id) {
	try {
		const [topicPayload, repliesPayload] = await Promise.all([
			fetchJson(`${API_BASE}/api/v1/plaza/topics/${encodeURIComponent(id)}`),
			fetchJson(`${API_BASE}/api/v1/plaza/topics/${encodeURIComponent(id)}/replies?limit=50&offset=0`),
		]);
		return {
			topic: extractTopicDetail(topicPayload),
			replies: extractReplies(repliesPayload),
			source: "public-api",
		};
	} catch {
		let fixture;
		try {
			fixture = await loadFixture();
		} catch {
			const error = new Error("Fallback unavailable");
			error.code = "fallback-unavailable";
			throw error;
		}
		const topic = fixture.topicDetails?.[id];
		if (!isTopicDetail(topic)) {
			const error = new Error("Topic not found");
			error.code = "not-found";
			throw error;
		}
		const replies = fixture.replies?.[id] ?? [];
		if (!replies.every(isReply)) {
			const error = new Error("Invalid fixture replies");
			error.code = "fallback-unavailable";
			throw error;
		}
		return { topic, replies, source: "fixture" };
	}
}

function renderTopicDetail(topic, replies, source) {
	const root = document.querySelector("[data-topic-detail]");
	const repliesRoot = document.querySelector("[data-topic-replies]");
	const sourceText = document.querySelector("[data-plaza-source]");
	if (!root || !repliesRoot) {
		return;
	}

	root.replaceChildren(createTopicDetailCard(topic));
	applyTopicMeta(topic);
	repliesRoot.replaceChildren(
		...(replies.length > 0
			? replies.map(createReplyCard)
			: [createStateCard("暂无公开回复", "可见回复会在审核通过后出现在这里。")])
	);

	if (sourceText) {
		const sourceLabel = source === "public-api"
			? "公开 API"
			: "公开 API 暂不可用，已显示本地降级";
		sourceText.textContent = `详情来源：${sourceLabel}`;
	}
}

function createTopicDetailCard(topic) {
	const article = document.createElement("article");
	const label = document.createElement("span");
	const title = document.createElement("h1");
	const body = document.createElement("p");
	const meta = document.createElement("span");
	const states = document.createElement("div");
	article.className = "topic-detail-card";
	label.className = "activity-type";
	label.textContent = topicType(topic);
	title.textContent = topic.title;
	body.textContent = topic.body;
	meta.className = "topic-meta";
	meta.textContent = [
		formatDate(topic.createdAt),
		`${topic.replyCount} 回复`,
		`${topic.reactionCount} 反应`,
		topic.attachmentCount > 0 ? `${topic.attachmentCount} 附件` : "",
	].filter(Boolean).join(" · ");
	states.className = "topic-states";
	if (topic.pinned) states.append(createPill("置顶"));
	if (topic.locked) states.append(createPill("已锁定"));
	if (topic.attachments.length === 0) states.append(createPill("无附件"));
	article.append(label, title, body, meta, states);
	return article;
}

function createReplyCard(reply) {
	const article = document.createElement("article");
	const author = document.createElement("strong");
	const body = document.createElement("p");
	const meta = document.createElement("span");
	article.className = "reply-card";
	author.textContent = reply.authorName ?? "访客";
	body.textContent = reply.body;
	meta.className = "topic-meta";
	meta.textContent = formatDate(reply.createdAt);
	article.append(author, body, meta);
	return article;
}

function createPill(text) {
	const pill = document.createElement("span");
	pill.className = "state-pill";
	pill.textContent = text;
	return pill;
}

function setComposeStatus(form, message, tone = "neutral") {
	const status = form.querySelector("[data-compose-status]");
	if (status) {
		status.textContent = message;
		status.dataset.tone = tone;
	}
}

function waitForTurnstile() {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		const check = () => {
			if (window.turnstile?.render) {
				resolve(window.turnstile);
				return;
			}
			if (Date.now() - startedAt > TURNSTILE_READY_TIMEOUT_MS) {
				reject(new Error("Turnstile script did not load"));
				return;
			}
			window.setTimeout(check, 120);
		};
		check();
	});
}

async function createTurnstileController(form, action) {
	const sitekey = siteConfig.plaza?.turnstileSiteKey;
	const slot = form.querySelector("[data-turnstile-widget]");
	if (!sitekey || !slot) {
		throw new Error("Turnstile sitekey is not configured");
	}

	const state = {
		token: "",
		widgetId: null,
	};
	const turnstile = await waitForTurnstile();
	state.widgetId = turnstile.render(slot, {
		sitekey,
		action,
		callback(token) {
			state.token = token;
			setComposeStatus(form, "验证已完成，可以提交。", "success");
		},
		"expired-callback"() {
			state.token = "";
			setComposeStatus(form, "验证已过期，请重新完成验证。", "error");
		},
		"error-callback"() {
			state.token = "";
			setComposeStatus(form, "验证加载失败，请刷新后重试。", "error");
		},
	});

	return {
		getToken() {
			return state.token;
		},
		reset() {
			state.token = "";
			if (state.widgetId !== null) {
				turnstile.reset(state.widgetId);
			}
		},
	};
}

function submitErrorMessage(error) {
	const code = error?.payload?.error?.code ?? error?.payload?.code;
	return submitErrorCopy[code] ?? "提交失败，请稍后重试。";
}

function formValue(form, name) {
	return String(new FormData(form).get(name) ?? "").trim();
}

async function wireTopicForm() {
	const form = document.querySelector("[data-topic-form]");
	if (!form) {
		return;
	}

	setComposeStatus(form, "正在加载人机验证...", "neutral");
	const turnstileReady = createTurnstileController(form, "plaza_topic").catch(() => {
		setComposeStatus(form, "Turnstile 未加载，公开提交暂不可用。", "error");
		return null;
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const submitButton = form.querySelector("button[type='submit']");
		let turnstile;
		turnstile = await turnstileReady;
		if (!turnstile) {
			return;
		}
		const token = turnstile.getToken();
		if (!token) {
			setComposeStatus(form, "请先完成人机验证。", "error");
			return;
		}

		submitButton.disabled = true;
		setComposeStatus(form, "正在提交审核...", "neutral");
		try {
			await postJson(`${API_BASE}/api/v1/plaza/topics`, {
				type: formValue(form, "type"),
				title: formValue(form, "title"),
				body: formValue(form, "body"),
				authorName: formValue(form, "authorName") || undefined,
				attachmentIds: [],
				turnstileToken: token,
			});
			form.reset();
			turnstile.reset();
			setComposeStatus(form, "已提交，等待审核。", "success");
		} catch (error) {
			turnstile.reset();
			setComposeStatus(form, submitErrorMessage(error), "error");
		} finally {
			submitButton.disabled = false;
		}
	});
}

async function wireReplyForm() {
	const form = document.querySelector("[data-reply-form]");
	if (!form) {
		return;
	}
	const id = topicIdFromPath();
	if (!id) {
		setComposeStatus(form, "缺少主题 ID，无法提交回复。", "error");
		return;
	}

	setComposeStatus(form, "正在加载人机验证...", "neutral");
	const turnstileReady = createTurnstileController(form, "plaza_reply").catch(() => {
		setComposeStatus(form, "Turnstile 未加载，公开回复暂不可用。", "error");
		return null;
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const submitButton = form.querySelector("button[type='submit']");
		let turnstile;
		turnstile = await turnstileReady;
		if (!turnstile) {
			return;
		}
		const token = turnstile.getToken();
		if (!token) {
			setComposeStatus(form, "请先完成人机验证。", "error");
			return;
		}

		submitButton.disabled = true;
		setComposeStatus(form, "正在提交审核...", "neutral");
		try {
			await postJson(`${API_BASE}/api/v1/plaza/topics/${encodeURIComponent(id)}/replies`, {
				body: formValue(form, "body"),
				authorName: formValue(form, "authorName") || undefined,
				attachmentIds: [],
				turnstileToken: token,
			});
			form.reset();
			turnstile.reset();
			setComposeStatus(form, "已提交，等待审核。", "success");
		} catch (error) {
			turnstile.reset();
			setComposeStatus(form, submitErrorMessage(error), "error");
		} finally {
			submitButton.disabled = false;
		}
	});
}

async function initList() {
	applyPageMeta(siteConfig.seo.pages.plaza);
	const selectedType = getSelectedType();
	wireFilters(selectedType);
	wireTopicForm();
	const feed = document.querySelector("[data-plaza-feed]");
	if (feed) {
		feed.replaceChildren(createStateCard("正在读取 Plaza 动态", "优先连接公开 API，失败时会显示本地降级数据。"));
	}
	const { topics, source } = await loadTopics(selectedType);
	renderList(topics, source, selectedType);
}

async function initDetail() {
	applyPageMeta(siteConfig.seo.pages.plazaTopic, absoluteUrl(window.location.pathname));
	wireReplyForm();
	const id = topicIdFromPath();
	const root = document.querySelector("[data-topic-detail]");
	const sourceText = document.querySelector("[data-plaza-source]");
	if (!id) {
		root?.replaceChildren(createStateCard("缺少主题 ID", "请从 Plaza 列表进入主题详情。", [
			{ label: "返回 Plaza", href: "/plaza/" },
		]));
		if (sourceText) {
			sourceText.textContent = "主题详情未加载：缺少公开主题 ID。";
		}
		return;
	}
	try {
		const { topic, replies, source } = await loadTopicDetail(id);
		renderTopicDetail(topic, replies, source);
	} catch (error) {
		const fallbackUnavailable = error?.code === "fallback-unavailable";
		root?.replaceChildren(createStateCard(
			fallbackUnavailable ? "主题暂不可用" : "主题不存在或不可见",
			fallbackUnavailable
				? "公开 API 和本地降级数据都无法读取。"
				: "待审核、隐藏、删除或不存在的主题都会按公开不可见处理。",
			[{ label: "返回 Plaza", href: "/plaza/" }],
		));
		const repliesRoot = document.querySelector("[data-topic-replies]");
		repliesRoot?.replaceChildren(createStateCard("暂无公开回复", "当前没有可显示的回复。"));
		if (sourceText) {
			sourceText.textContent = fallbackUnavailable
				? "主题详情暂不可用。"
				: "主题详情未公开。";
		}
	}
}

const page = document.body.dataset.plazaPage;
if (page === "list") {
	initList().catch(() => {
		const feed = document.querySelector("[data-plaza-feed]");
		feed?.replaceChildren(createStateCard("Plaza 暂不可用", "公开 API 和本地降级数据都无法读取。"));
	});
}

if (page === "topic") {
	initDetail();
}
