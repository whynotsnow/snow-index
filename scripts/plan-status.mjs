import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sidecarPath = path.resolve(root, "../snow-index.plan");
const indexPath = path.join(sidecarPath, "index.json");

const jsonMode = process.argv.includes("--json");

if (!fs.existsSync(indexPath)) {
	const message = {
		ok: false,
		error: "sidecar_index_missing",
		sidecar: "../snow-index.plan",
	};
	if (jsonMode) {
		console.log(JSON.stringify(message, null, 2));
	} else {
		console.error("Missing sidecar index at ../snow-index.plan/index.json");
	}
	process.exit(1);
}

const board = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const items = Array.isArray(board.items) ? board.items : [];
const executableStatuses = new Set(["ready", "running"]);
const executable = items.filter((item) => executableStatuses.has(item.status));

if (jsonMode) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				projectName: board.projectName,
				updatedAt: board.updatedAt,
				total: items.length,
				executable,
				items,
			},
			null,
			2,
		),
	);
} else {
	console.log(`${board.projectName ?? "snow-index"}: ${items.length} item(s)`);
	for (const item of items) {
		console.log(`- ${item.id} [${item.status}] ${item.title}`);
	}
}
