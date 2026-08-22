import fs from "node:fs";
import path from "node:path";

const publicRoot = path.join(process.cwd(), "public");
const requiredFiles = [
	"index.html",
	"plaza/index.html",
	"plaza/topic.html",
	"styles.css",
	"app.js",
	"plaza.js",
	"_redirects",
	"_headers",
	"assets/portal-map.png",
	"data/portal-summary.fixture.json",
	"data/plaza.fixture.json",
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
const plazaTopic = fs.readFileSync(path.join(publicRoot, "plaza/topic.html"), "utf8");
const redirects = fs.readFileSync(path.join(publicRoot, "_redirects"), "utf8");
const headers = fs.readFileSync(path.join(publicRoot, "_headers"), "utf8");
const app = fs.readFileSync(path.join(publicRoot, "app.js"), "utf8");
const plazaApp = fs.readFileSync(path.join(publicRoot, "plaza.js"), "utf8");
const deploymentDoc = fs.readFileSync(
	path.join(process.cwd(), "docs/developers/deployment-routing.md"),
	"utf8",
);
const summary = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/portal-summary.fixture.json"), "utf8"),
);
const plazaFixture = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/plaza.fixture.json"), "utf8"),
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

if (!plaza.includes('src="/plaza.js"') || !plaza.includes("data-plaza-feed")) {
	failures.push("Plaza page missing list script hook");
}

if (!plazaTopic.includes('src="/plaza.js"') || !plazaTopic.includes("data-topic-detail")) {
	failures.push("Plaza topic page missing detail script hook");
}

if (!redirects.includes("/plaza /plaza/ 301")) {
	failures.push("Redirects missing /plaza normalization");
}

if (!redirects.includes("/plaza/t/* /plaza/topic.html 200")) {
	failures.push("Redirects missing Plaza topic shell fallback");
}

if (redirects.includes("/api") || redirects.includes("/admin")) {
	failures.push("Redirects must not claim API or Admin routes");
}

for (const header of [
	"Content-Security-Policy",
	"https://api.whynotsnow.com",
	"https://challenges.cloudflare.com",
	"X-Content-Type-Options: nosniff",
	"/assets/*",
	"/data/*",
]) {
	if (!headers.includes(header)) {
		failures.push(`Headers missing ${header}`);
	}
}

for (const phrase of [
	"Publish directory: `public`",
	"`www.whynotsnow.com`",
	"`/plaza/t/:id`",
	"`api.whynotsnow.com`",
	"No `snow-index` environment variable contains secrets",
]) {
	if (!deploymentDoc.includes(phrase)) {
		failures.push(`Deployment doc missing ${phrase}`);
	}
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

for (const endpoint of [
	"/api/v1/plaza/topics",
	"/api/v1/plaza/topics/",
	"/replies?limit=50&offset=0",
]) {
	if (!plazaApp.includes(endpoint)) {
		failures.push(`Plaza script missing ${endpoint}`);
	}
}

if (!plazaApp.includes("plaza.fixture.json")) {
	failures.push("Plaza script missing fixture fallback");
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

const plazaTopics = plazaFixture?.data?.topics ?? [];
if (!Array.isArray(plazaTopics) || plazaTopics.length === 0) {
	failures.push("Plaza fixture missing topics");
}

for (const topic of plazaTopics) {
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
			failures.push(`Plaza fixture topic missing string ${key}`);
		}
	}
	for (const key of ["replyCount", "reactionCount", "attachmentCount"]) {
		if (typeof topic[key] !== "number") {
			failures.push(`Plaza fixture topic missing number ${key}`);
		}
	}
	for (const key of ["pinned", "locked"]) {
		if (typeof topic[key] !== "boolean") {
			failures.push(`Plaza fixture topic missing boolean ${key}`);
		}
	}
	const detail = plazaFixture?.data?.topicDetails?.[topic.id];
	if (!detail || typeof detail.body !== "string" || !Array.isArray(detail.attachments)) {
		failures.push(`Plaza fixture missing detail for ${topic.id}`);
	}
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}

console.log("Static portal check passed.");
