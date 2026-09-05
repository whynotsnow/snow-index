import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const jsonMode = process.argv.includes("--json");

function errorPayload(code, message, details = []) {
	return {
		ok: false,
		schemaVersion: 2,
		error: { code, message, details },
	};
}

function gitCommonSidecar() {
	try {
		const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const resolvedCommonDir = path.resolve(root, commonDir);
		if (path.basename(resolvedCommonDir) === ".git") {
			return path.resolve(path.dirname(resolvedCommonDir), "../snow-index.plan");
		}
	} catch {
		// The explicit sibling path remains the normal non-Git fallback.
	}
	return null;
}

const sidecarCandidates = [
	process.env.SNOW_INDEX_SIDECAR_PATH ? path.resolve(process.env.SNOW_INDEX_SIDECAR_PATH) : null,
	path.resolve(root, "../snow-index.plan"),
	gitCommonSidecar(),
].filter(Boolean);
const sidecarPath = sidecarCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.json")));
const indexPath = sidecarPath ? path.join(sidecarPath, "index.json") : null;

if (!indexPath) {
	const message = errorPayload("SIDECAR_NOT_FOUND", "snow-index sidecar index was not found.", [
		{ path: "../snow-index.plan/index.json" },
	]);
	if (jsonMode) {
		console.log(JSON.stringify(message, null, 2));
	} else {
		console.error("Missing sidecar index at ../snow-index.plan/index.json");
	}
	process.exit(1);
}

let board;
try {
	board = JSON.parse(fs.readFileSync(indexPath, "utf8"));
} catch (error) {
	const message = errorPayload("SIDECAR_CONFIG_OR_INDEX_INVALID", "Sidecar index is not valid JSON.", [
		{ path: "index.json", reason: error instanceof Error ? error.message : "parse failed" },
	]);
	if (jsonMode) {
		console.log(JSON.stringify(message, null, 2));
	} else {
		console.error("Invalid sidecar index at ../snow-index.plan/index.json");
	}
	process.exit(1);
}

if (board.schemaVersion !== 2 || !Array.isArray(board.items)) {
	const message = errorPayload("SIDECAR_SCHEMA_UNSUPPORTED", "Sidecar must use schemaVersion 2.");
	if (jsonMode) {
		console.log(JSON.stringify(message, null, 2));
	} else {
		console.error("Sidecar must use schemaVersion 2.");
	}
	process.exit(1);
}

const items = Array.isArray(board.items) ? board.items : [];
const statuses = {
	demand: new Set(["discussing", "needs-decision", "decided", "deferred"]),
	execution: new Set(["ready", "running", "blocked", "done"]),
	archive: new Set(["archived"]),
};
const counts = Object.fromEntries(
	Object.entries(statuses).map(([phase, phaseStatuses]) => [
		phase,
		Object.fromEntries([...phaseStatuses].sort().map((status) => [status, 0])),
	]),
);
const summaries = [];

for (const [position, item] of items.entries()) {
	if (!item || typeof item !== "object" || typeof item.id !== "string" || !statuses[item.phase]?.has(item.status)) {
		const message = errorPayload("SIDECAR_STATUS_INVALID", "index.json contains an invalid item lifecycle.", [
			{ field: `items[${position}]`, itemId: item?.id ?? null, reason: "invalid phase/status/id" },
		]);
		if (jsonMode) {
			console.log(JSON.stringify(message, null, 2));
		} else {
			console.error("Sidecar index contains an invalid item lifecycle.");
		}
		process.exit(1);
	}
	counts[item.phase][item.status] += 1;
	summaries.push({
		id: item.id,
		title: item.title ?? "",
		type: item.type ?? "requirement",
		priority: item.priority ?? null,
		phase: item.phase,
		status: item.status,
		archiveReason: item.archiveReason ?? null,
		itemPath: `items/${item.id}.md`,
		updatedAt: item.updatedAt ?? null,
		relations: item.relations ?? [],
	});
}

summaries.sort((a, b) => a.id.localeCompare(b.id));
summaries.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
const byId = new Map(summaries.map((item) => [item.id, item]));

if (jsonMode) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				schemaVersion: 2,
				projectName: board.projectName,
				projectKey: board.projectKey,
				sidecarPath: "../snow-index.plan",
				source: { indexPath: "index.json", updatedAt: board.updatedAt ?? null },
				generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
				counts,
				items: summaries,
				executable: [...byId.values()]
					.filter((item) => item.phase === "execution" && ["ready", "running"].includes(item.status))
					.map((item) => item.id)
					.sort(),
				blocked: [...byId.values()]
					.filter((item) => item.phase === "execution" && item.status === "blocked")
					.map((item) => item.id)
					.sort(),
				needsDecision: [...byId.values()]
					.filter((item) => item.phase === "demand" && item.status === "needs-decision")
					.map((item) => item.id)
					.sort(),
			},
			null,
		2,
		),
	);
} else {
	console.log(`${board.projectName ?? "snow-index"}: ${items.length} item(s)`);
	for (const item of summaries) {
		console.log(`- ${item.id} [${item.phase}/${item.status}] ${item.title}`);
	}
}
