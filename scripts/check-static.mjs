import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const publicRoot = path.join(process.cwd(), "public");
const { siteConfig } = await import(pathToFileURL(path.join(publicRoot, "site-config.js")).href);
const requiredFiles = [
	"index.html",
	"plaza/index.html",
	"plaza/topic.html",
	"styles.css",
	"app.js",
	"site-config.js",
	"plaza.js",
	"_redirects",
	"_headers",
	"robots.txt",
	"sitemap.xml",
	"assets/portal-map.png",
	"data/portal-summary.fixture.json",
	"data/blog-summary.fixture.json",
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
const robots = fs.readFileSync(path.join(publicRoot, "robots.txt"), "utf8");
const sitemap = fs.readFileSync(path.join(publicRoot, "sitemap.xml"), "utf8");
const app = fs.readFileSync(path.join(publicRoot, "app.js"), "utf8");
const plazaApp = fs.readFileSync(path.join(publicRoot, "plaza.js"), "utf8");
const styles = fs.readFileSync(path.join(publicRoot, "styles.css"), "utf8");
const siteConfigSource = fs.readFileSync(path.join(publicRoot, "site-config.js"), "utf8");
const deploymentDoc = fs.readFileSync(
	path.join(process.cwd(), "docs/developers/deployment-routing.md"),
	"utf8",
);
const visualBoundaryDoc = fs.readFileSync(
	path.join(process.cwd(), "docs/developers/portal-visual-content-boundary.md"),
	"utf8",
);
const developerDocsIndex = fs.readFileSync(
	path.join(process.cwd(), "docs/developers/README.md"),
	"utf8",
);
const summary = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/portal-summary.fixture.json"), "utf8"),
);
const blogSummary = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/blog-summary.fixture.json"), "utf8"),
);
const plazaFixture = JSON.parse(
	fs.readFileSync(path.join(publicRoot, "data/plaza.fixture.json"), "utf8"),
);

for (const label of ["Blog", "Plaza", "Projects", "RSS", "Admin"]) {
	if (!index.includes(label)) {
		failures.push(`Home page missing ${label}`);
	}
}

function isPublicHref(value) {
	if (typeof value !== "string" || value.trim() === "") {
		return false;
	}
	if (value.startsWith("#") || value.startsWith("/")) {
		return true;
	}
	try {
		const parsed = new URL(value);
		return parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function requireString(value, label) {
	if (typeof value !== "string" || value.trim() === "") {
		failures.push(`Site config missing ${label}`);
	}
}

function validateLinkCollection(items, label) {
	if (!Array.isArray(items) || items.length === 0) {
		failures.push(`Site config ${label} must be a non-empty array`);
		return;
	}
	const ids = new Set();
	for (const item of items) {
		requireString(item.id, `${label} id`);
		requireString(item.href, `${label} href for ${item.id ?? "unknown"}`);
		if (ids.has(item.id)) {
			failures.push(`Site config ${label} has duplicate id ${item.id}`);
		}
		ids.add(item.id);
		if (!isPublicHref(item.href)) {
			failures.push(`Site config ${label} has invalid public href ${item.href}`);
		}
		if (item.rel && typeof item.rel !== "string") {
			failures.push(`Site config ${label} rel must be a string for ${item.id}`);
		}
	}
}

requireString(siteConfig?.site?.name, "site.name");
requireString(siteConfig?.site?.description, "site.description");
requireString(siteConfig?.seo?.baseUrl, "seo.baseUrl");
requireString(siteConfig?.seo?.defaultTitle, "seo.defaultTitle");
requireString(siteConfig?.seo?.defaultDescription, "seo.defaultDescription");
requireString(siteConfig?.seo?.image, "seo.image");
requireString(siteConfig?.hero?.title, "hero.title");
requireString(siteConfig?.hero?.copy, "hero.copy");
requireString(siteConfig?.status?.label, "status.label");
requireString(siteConfig?.status?.copy, "status.copy");
requireString(siteConfig?.sections?.boundary?.copy, "sections.boundary.copy");
validateLinkCollection(siteConfig?.navigation, "navigation");
validateLinkCollection(siteConfig?.hero?.actions, "hero.actions");
validateLinkCollection(siteConfig?.entries, "entries");
validateLinkCollection(siteConfig?.sections?.projects?.items, "projects.items");

if (!isPublicHref(siteConfig?.seo?.baseUrl)) {
	failures.push("Site config seo.baseUrl must be an https URL");
}

if (!isPublicHref(siteConfig?.seo?.image)) {
	failures.push("Site config seo.image must be a public path or https URL");
}

for (const [key, page] of Object.entries(siteConfig?.seo?.pages ?? {})) {
	requireString(page.title, `seo.pages.${key}.title`);
	requireString(page.description, `seo.pages.${key}.description`);
	requireString(page.path, `seo.pages.${key}.path`);
	if (!isPublicHref(page.path)) {
		failures.push(`Site config seo.pages.${key}.path must be public`);
	}
}

for (const phrase of ["navigation", "entries", "sections", "hero"]) {
	if (!siteConfigSource.includes(phrase)) {
		failures.push(`Site config source missing ${phrase}`);
	}
}

if (!index.includes("snow-base")) {
	failures.push("Home page missing backend boundary note");
}

if (!index.includes("Blog 与 Plaza 摘要已接入公开契约")) {
	failures.push("Home page status copy is stale");
}

if (!index.includes('src="/app.js"') || !index.includes("data-portal-activity")) {
	failures.push("Home page missing portal summary script hook");
}

if (!index.includes("data-blog-posts") || !index.includes("最近文章")) {
	failures.push("Home page missing Blog summary section");
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

for (const [label, html] of [
	["Home", index],
	["Plaza", plaza],
	["Plaza topic", plazaTopic],
]) {
	for (const phrase of [
		'rel="canonical"',
		'property="og:title"',
		'property="og:description"',
		'property="og:url"',
		'property="og:image"',
		'name="twitter:card"',
		'name="twitter:title"',
		'name="twitter:description"',
		'name="twitter:image"',
	]) {
		if (!html.includes(phrase)) {
			failures.push(`${label} page missing SEO metadata ${phrase}`);
		}
	}
}

if (!index.includes('href="https://whynotsnow.com/"')) {
	failures.push("Home page missing production canonical URL");
}

if (!plaza.includes('href="https://whynotsnow.com/plaza/"')) {
	failures.push("Plaza page missing production canonical URL");
}

if (!plazaTopic.includes("data-canonical")) {
	failures.push("Plaza topic page missing dynamic canonical hook");
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

for (const phrase of [
	"Sky/cyan/navy/light cloud palette",
	"Blog remains the long-form reading system",
	"Plaza is the public community/activity layer",
	"Do not use the Blog reference image directly",
	"Future additions should land in this order",
]) {
	if (!visualBoundaryDoc.includes(phrase)) {
		failures.push(`Visual boundary doc missing ${phrase}`);
	}
}

if (!developerDocsIndex.includes("portal-visual-content-boundary.md")) {
	failures.push("Developer docs index missing Portal visual boundary link");
}

if (
	!app.includes("https://api.whynotsnow.com") ||
	!app.includes("/api/v1/portal/summary")
) {
	failures.push("Portal script missing public summary endpoint");
}

if (!app.includes('import { siteConfig } from "./site-config.js"')) {
	failures.push("Portal script missing site config import");
}

for (const hook of [
	"data-site-nav",
	"data-entry-grid",
	"data-project-list",
	"data-status-copy",
	"data-boundary-copy",
]) {
	if (!index.includes(hook)) {
		failures.push(`Home page missing configurable content hook ${hook}`);
	}
}

if (!app.includes("localStorage") || !app.includes("portal-summary.fixture.json")) {
	failures.push("Portal script missing cache or fixture fallback");
}

for (const phrase of [
	"https://blog.whynotsnow.com/rss.xml",
	"blog-summary.fixture.json",
	"DOMParser",
	"data-blog-posts",
]) {
	if (!app.includes(phrase)) {
		failures.push(`Portal script missing Blog summary behavior: ${phrase}`);
	}
}

if (!headers.includes("https://blog.whynotsnow.com")) {
	failures.push("Headers missing Blog feed connect-src");
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

for (const phrase of [
	'import { siteConfig } from "./site-config.js"',
	"applyTopicMeta",
	"link[rel='canonical']",
	"twitter:description",
	"公开 API 暂不可用，已显示本地降级",
	"fallback-unavailable",
	"返回 Plaza",
]) {
	if (!plazaApp.includes(phrase)) {
		failures.push(`Plaza script missing expected behavior: ${phrase}`);
	}
}

if (!styles.includes(".state-actions")) {
	failures.push("Styles missing Plaza state action controls");
}

for (const phrase of [
	"User-agent: *",
	"Allow: /",
	"Disallow: /data/",
	"Sitemap: https://whynotsnow.com/sitemap.xml",
]) {
	if (!robots.includes(phrase)) {
		failures.push(`robots.txt missing ${phrase}`);
	}
}

for (const phrase of [
	"<urlset",
	"<loc>https://whynotsnow.com/</loc>",
	"<loc>https://whynotsnow.com/plaza/</loc>",
	"<lastmod>2026-08-23</lastmod>",
]) {
	if (!sitemap.includes(phrase)) {
		failures.push(`sitemap.xml missing ${phrase}`);
	}
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

const blogPosts = blogSummary?.data?.posts ?? [];
if (
	blogSummary?.ok !== true ||
	typeof blogSummary?.data?.generatedAt !== "string" ||
	typeof blogSummary?.data?.cacheTtlSeconds !== "number" ||
	!Array.isArray(blogPosts) ||
	blogPosts.length === 0
) {
	failures.push("Blog summary fixture has an invalid top-level shape");
}

for (const post of blogPosts) {
	for (const key of ["title", "excerpt", "url", "publishedAt"]) {
		if (typeof post[key] !== "string") {
			failures.push(`Blog summary post missing string ${key}`);
		}
	}
	if (!Array.isArray(post.categories)) {
		failures.push("Blog summary post missing categories");
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
