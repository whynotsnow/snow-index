import { API_BASE, submitErrorCopy, TURNSTILE_READY_TIMEOUT_MS } from "./constants.js";
import { postJson } from "./api.js";
import { siteConfig } from "./meta.js";
import { topicIdFromPath } from "./routing.js";

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

export async function wireTopicForm() {
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
		const turnstile = await turnstileReady;
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

export async function wireReplyForm() {
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
		const turnstile = await turnstileReady;
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
