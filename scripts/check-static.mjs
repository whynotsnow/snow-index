import fs from "node:fs";
import path from "node:path";

const publicRoot = path.join(process.cwd(), "public");
const requiredFiles = [
	"index.html",
	"plaza/index.html",
	"styles.css",
	"app.js",
	"assets/portal-map.png",
	"data/portal-summary.fixture.json",
];

const failures = [];

for (const file of requiredFiles) {
	const target = path.join(publicRoot, file);
	if (!fs.existsSync(target)) {
		failures.push(`Missing ${file}`);
	}
}

const index = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
const plaza = fs.readFileSync(path.join(publicRoot, "plaza/index.html"), "utf8");
const app = fs.readFileSync(path.join(publicRoot, "app.js"), "utf8");
const summary = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/portal-summary.fixture.json"), "utf8"),
);

for (const label of ["Blog", "Plaza", "Projects", "RSS", "Admin"]) {
	if (!index.includes(label)) {
		failures.push(`Home page missing ${label}`);
	}
}

if (!index.includes("snow-base")) {
	failures.push("Home page missing backend boundary note");
}

if (!index.includes('src="/app.js"') || !index.includes("data-portal-activity")) {
	failures.push("Home page missing portal summary script hook");
}

if (!plaza.includes("公开 API") || !plaza.includes("Turnstile secret")) {
	failures.push("Plaza page missing public API fallback boundary");
}

if (
	!app.includes("https://api.whynotsnow.com") ||
	!app.includes("/api/v1/portal/summary")
) {
	failures.push("Portal script missing public summary endpoint");
}

if (!app.includes("localStorage") || !app.includes("portal-summary.fixture.json")) {
	failures.push("Portal script missing cache or fixture fallback");
}

const plazaSummary = summary?.data?.plaza;
if (
	summary?.ok !== true ||
	typeof summary.data.generatedAt !== "string" ||
	typeof summary.data.cacheTtlSeconds !== "number" ||
	!Array.isArray(plazaSummary?.pinnedNotices) ||
	!Array.isArray(plazaSummary?.recentTopics)
) {
	failures.push("Portal summary fixture has an invalid top-level shape");
}

const topics = [
	...(plazaSummary?.pinnedNotices ?? []),
	...(plazaSummary?.recentTopics ?? []),
];
for (const topic of topics) {
	for (const key of [
		"id",
		"type",
		"title",
		"excerpt",
		"url",
		"lastActivityAt",
		"createdAt",
	]) {
		if (typeof topic[key] !== "string") {
			failures.push(`Portal summary topic missing string ${key}`);
		}
	}
	for (const key of ["replyCount", "reactionCount"]) {
		if (typeof topic[key] !== "number") {
			failures.push(`Portal summary topic missing number ${key}`);
		}
	}
	for (const key of ["pinned", "locked"]) {
		if (typeof topic[key] !== "boolean") {
			failures.push(`Portal summary topic missing boolean ${key}`);
		}
	}
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}

console.log("Static portal check passed.");
