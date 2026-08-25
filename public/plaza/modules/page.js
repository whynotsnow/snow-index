import { loadTopicDetail, loadTopics } from "./api.js";
import { wireReplyForm, wireTopicForm } from "./forms.js";
import { absoluteUrl, applyPageMeta, siteConfig } from "./meta.js";
import { getSelectedType, topicIdFromPath, wireFilters } from "./routing.js";
import { createStateCard, renderList, renderTopicDetail } from "./render.js";

export async function initList() {
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

export async function initDetail() {
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
