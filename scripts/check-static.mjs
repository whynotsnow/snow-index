import fs from "node:fs";
import path from "node:path";

const publicRoot = path.join(process.cwd(), "public");
const requiredFiles = [
	"index.html",
	"plaza/index.html",
	"styles.css",
	"assets/portal-map.png",
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

for (const label of ["Blog", "Plaza", "Projects", "RSS", "Admin"]) {
	if (!index.includes(label)) {
		failures.push(`Home page missing ${label}`);
	}
}

if (!index.includes("snow-base")) {
	failures.push("Home page missing backend boundary note");
}

if (!plaza.includes("公开 API") || !plaza.includes("Turnstile secret")) {
	failures.push("Plaza page missing public API fallback boundary");
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}

console.log("Static portal check passed.");
