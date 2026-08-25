import {
	API_BASE,
	FETCH_TIMEOUT_MS,
	FIXTURE_ENDPOINT,
	POST_TIMEOUT_MS,
} from "./constants.js";

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

export async function postJson(url, body) {
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
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

export async function loadTopics(type) {
	try {
		const payload = await fetchJson(`${API_BASE}/api/v1/plaza/topics?type=${encodeURIComponent(type)}&limit=20&offset=0`);
		return { topics: extractTopics(payload), source: "public-api" };
	} catch {
		const fixture = await loadFixture();
		return { topics: fixture.topics, source: "fixture" };
	}
}

export async function loadTopicDetail(id) {
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
