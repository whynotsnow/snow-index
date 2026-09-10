import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const jsonMode = process.argv.includes("--json");
const schemaVersion = 3;
const phases = {
  demand: ["discussing", "needs-decision", "decided", "deferred"],
  execution: ["ready", "running", "blocked", "done"],
  archive: ["archived"],
};

function errorPayload(code, message, details = []) { return { ok: false, schemaVersion, error: { code, message, details } }; }
function fail(code, message, details = [], exitCode = 1) {
  const payload = errorPayload(code, message, details);
  if (jsonMode) console.log(JSON.stringify(payload, null, 2)); else console.error(`${code}: ${message}`);
  process.exit(exitCode);
}
function locateSidecar() {
  const candidates = [process.env.SNOW_INDEX_SIDECAR_PATH ? path.resolve(process.env.SNOW_INDEX_SIDECAR_PATH) : null, path.resolve(root, "../snow-index.sidecar")];
  try {
    const common = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (common) candidates.push(path.resolve(path.dirname(path.resolve(root, common)), "../snow-index.sidecar"));
  } catch { /* sibling fallback */ }
  return candidates.filter(Boolean).find((candidate) => fs.existsSync(path.join(candidate, "sidecar.config.json")));
}
function readJson(file, missingCode) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(error.code === "ENOENT" ? "SIDECAR_NOT_FOUND" : "SIDECAR_CONFIG_OR_INDEX_INVALID", missingCode, [{ path: path.relative(root, file), reason: error.message }]); }
}

const sidecar = locateSidecar();
if (!sidecar) fail("SIDECAR_NOT_FOUND", "snow-index v3 sidecar was not found.");
const config = readJson(path.join(sidecar, "sidecar.config.json"), "snow-index sidecar config is unavailable.");
const index = readJson(path.join(sidecar, "index.json"), "snow-index sidecar index is unavailable.");
if (config.schemaVersion !== schemaVersion || index.schemaVersion !== schemaVersion) fail("SIDECAR_SCHEMA_UNSUPPORTED", "Sidecar must use schemaVersion 3.");
if (!Array.isArray(index.rms) || !Array.isArray(index.tasks)) fail("SIDECAR_INDEX_INVALID", "index.json must contain rms and tasks arrays.");
const counts = Object.fromEntries(Object.entries(phases).map(([phase, statuses]) => [phase, Object.fromEntries(statuses.map((status) => [status, 0]))]));
function summarize(item, type) {
  if (!item || typeof item.id !== "string" || !phases[item.phase]?.includes(item.status)) fail("SIDECAR_STATUS_INVALID", "index.json contains an invalid RM/task lifecycle.", [{ itemId: item?.id ?? null }]);
  counts[item.phase][item.status] += 1;
  return { ...item, type, itemPath: item.itemPath ?? `${type === "rm" ? "rms" : "tasks"}/${item.id}.md` };
}
const rms = index.rms.map((item) => summarize(item, "rm"));
const tasks = index.tasks.map((item) => summarize(item, "task"));
const items = [...rms, ...tasks].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) || a.id.localeCompare(b.id));
const payload = {
  ok: true, schemaVersion, projectName: config.projectName, projectKey: config.projectKey,
  sidecarPath: path.relative(root, sidecar) || ".", source: { indexPath: `${path.relative(root, sidecar)}/index.json`, updatedAt: index.updatedAt },
  counts, rms, tasks, boards: { rm: { items: rms }, task: { items: tasks } },
  items, executable: tasks.filter((item) => item.phase === "execution" && ["ready", "running"].includes(item.status)).map((item) => item.id).sort(),
  blocked: tasks.filter((item) => item.phase === "execution" && item.status === "blocked").map((item) => item.id).sort(),
  needsDecision: rms.filter((item) => item.phase === "demand" && item.status === "needs-decision").map((item) => item.id).sort(),
};
if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else {
  console.log(`${payload.projectName} sidecar v3 status`);
  console.log(`sidecar root: ${payload.sidecarPath}`);
  console.log(`RM: ${rms.length}; task: ${tasks.length}`);
  console.log(`executable tasks: ${payload.executable.join(", ") || "none"}`);
}
