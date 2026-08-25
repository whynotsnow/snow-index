import { typeLabels } from "./constants.js";
import { applyTopicMeta } from "./meta.js";
import { selectedTypeLabel } from "./routing.js";

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

export function createStateCard(title, body, actions = []) {
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

export function renderList(topics, source, selectedType) {
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
				selectedType === "all" ? "暂无公开主题" : `${selectedTypeLabel(selectedType)} 暂无内容`,
				selectedType === "all" ? "当前没有可见内容。" : "当前分类没有可见内容。",
				selectedType === "all" ? [] : [{ label: "查看全部", href: "/plaza/" }],
			)])
	);

	if (sourceText) {
		const sourceLabel = source === "public-api"
			? "公开 API"
			: "公开 API 暂不可用，已显示本地降级";
		sourceText.textContent = `主题来源：${sourceLabel} · ${selectedTypeLabel(selectedType)}`;
	}
}

export function renderTopicDetail(topic, replies, source) {
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
