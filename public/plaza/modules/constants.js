export const API_BASE = "https://api.whynotsnow.com";
export const FIXTURE_ENDPOINT = "/data/plaza.fixture.json";
export const FETCH_TIMEOUT_MS = 3200;
export const POST_TIMEOUT_MS = 12000;
export const TURNSTILE_READY_TIMEOUT_MS = 10000;

export const typeLabels = {
	all: "全部",
	notice: "公告",
	status: "动态",
	discussion: "讨论",
	question: "问答",
	feedback: "反馈",
	guestbook: "留言",
};

export const validTypes = new Set(Object.keys(typeLabels));

export const submitErrorCopy = {
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
