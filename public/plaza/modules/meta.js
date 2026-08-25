import { siteConfig } from "../../site-config.js";

export function absoluteUrl(path) {
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

export function applyPageMeta(page, url = absoluteUrl(page.path)) {
	document.title = page.title;
	setMeta("meta[name='description']", page.description);
	setCanonical(url);
	setMeta("meta[property='og:title']", page.title);
	setMeta("meta[property='og:description']", page.description);
	setMeta("meta[property='og:url']", url);
	setMeta("meta[name='twitter:title']", page.title);
	setMeta("meta[name='twitter:description']", page.description);
}

export function applyTopicMeta(topic) {
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

export { siteConfig };
