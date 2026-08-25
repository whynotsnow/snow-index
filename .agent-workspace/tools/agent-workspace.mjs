import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, relative } from "node:path";
import { spawnSync } from "node:child_process";

const [command = "help"] = process.argv.slice(2);

function fail(message) {
	console.error(`[agent-workspace] ${message}`);
	process.exit(1);
}

function findWorkspaceRoot(start) {
	let current = start;
	while (true) {
		if (existsSync(join(current, ".agent-workspace", "manifest.json"))) {
			return current;
		}
		const parent = dirname(current);
		if (parent === current || current === parse(current).root) {
			return null;
		}
		current = parent;
	}
}

const root = findWorkspaceRoot(process.cwd());
if (!root) {
	fail("No .agent-workspace/manifest.json found in this directory tree.");
}
process.chdir(root);

function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		fail(`Cannot read ${path}: ${error.message}`);
	}
}

function assertPathExists(path, label) {
	if (!existsSync(join(root, path))) {
		fail(`Missing ${label}: ${path}`);
	}
}

function assertIgnoredPath(path) {
	const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
	if (!gitignore.includes(path)) {
		fail(`.gitignore must ignore ${path}`);
	}
}

function assertNoTrackedLocalState() {
	const result = spawnSync("git", ["ls-files", ".agent-workspace"], {
		cwd: root,
		encoding: "utf8",
	});
	if (result.error) {
		fail(`Unable to inspect tracked workspace files: ${result.error.message}`);
	}
	const privatePrefixes = [
		".agent-workspace/local/",
		".agent-workspace/raw/",
		".agent-workspace/quarantine/",
	];
	for (const file of result.stdout.split("\n").filter(Boolean)) {
		if (privatePrefixes.some((prefix) => file.startsWith(prefix))) {
			fail(`Private Agent Workspace state must not be tracked: ${file}`);
		}
	}
}

function assertAgentDocsContract() {
	for (const path of [
		"README.md",
		"AGENTS.md",
		"docs/README.md",
		"docs/agents/README.md",
		"docs/agents/workflow.md",
		"docs/agents/project-map.md",
		"docs/agents/runtime-requirements.md",
		"docs/agents/disclosure-policy.md",
		"docs/agents/runtime-playbook.md",
		"docs/agents/failure-index.md",
		"docs/agents/execution-log.md",
		"docs/agents/memory.json",
		"docs/developers/README.md",
	]) {
		assertPathExists(path, "Agent Docs contract file");
	}
}

function validate() {
	const manifest = readJson(join(root, ".agent-workspace", "manifest.json"));
	if (manifest.spec !== "agent-workspace") {
		fail("manifest.spec must be agent-workspace");
	}
	if (manifest.spec_version !== "0.1.0") {
		fail("manifest.spec_version must be 0.1.0");
	}
	if (!Array.isArray(manifest.conformance) || !manifest.conformance.includes("core")) {
		fail("manifest.conformance must include core");
	}
	for (const path of [
		manifest.public_instructions,
		manifest.public_knowledge,
		manifest.local_state,
		manifest.raw_state,
		manifest.quarantine_state,
		manifest.planning_sidecar,
		manifest.tooling?.entry,
	]) {
		if (typeof path !== "string" || path.trim() === "") {
			fail("manifest contains an empty required path");
		}
	}
	assertPathExists(manifest.public_instructions, "public instructions");
	assertPathExists(manifest.public_knowledge, "public knowledge");
	assertPathExists(manifest.planning_sidecar, "planning sidecar");
	assertPathExists(manifest.tooling.entry, "workspace local tooling");

	for (const ignored of [
		".agent-workspace/local/",
		".agent-workspace/raw/",
		".agent-workspace/quarantine/",
	]) {
		assertIgnoredPath(ignored);
	}

	assertAgentDocsContract();
	assertNoTrackedLocalState();
	console.log("[agent-workspace] validation passed");
}

function status() {
	const manifest = readJson(join(root, ".agent-workspace", "manifest.json"));
	console.log(JSON.stringify({
		ok: true,
		root: relative(process.cwd(), root) || ".",
		spec: manifest.spec,
		specVersion: manifest.spec_version,
		conformance: manifest.conformance,
		tooling: manifest.tooling,
	}, null, 2));
}

if (command === "help" || command === "--help" || command === "-h") {
	console.log(`Agent Workspace local tooling

Usage:
  pnpm agent:validate
  node .agent-workspace/tools/agent-workspace.mjs status
  node .agent-workspace/tools/agent-workspace.mjs validate
`);
} else if (command === "status") {
	status();
} else if (command === "validate") {
	validate();
} else {
	fail("Usage: status | validate");
}
