import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { constants } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function locatePlanRoot() {
  const candidates = [];
  const explicitPath = process.env.SNOW_INDEX_SIDECAR_PATH?.trim();
  if (explicitPath) candidates.push(isAbsolute(explicitPath) ? explicitPath : resolve(repoRoot, explicitPath));
  candidates.push(resolve(repoRoot, "..", "snow-index.plan"));
  try {
    const commonDirValue = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (commonDirValue) {
      const commonDir = isAbsolute(commonDirValue) ? commonDirValue : resolve(repoRoot, commonDirValue);
      candidates.push(resolve(dirname(commonDir), "..", "snow-index.plan"));
    }
  } catch {
    // The sibling candidate is sufficient for a regular checkout.
  }
  return candidates
    .filter((candidate, index) => candidates.indexOf(candidate) === index)
    .find((candidate) => existsSync(resolve(candidate, "plan.config.json")));
}

const planRoot = locatePlanRoot() ?? resolve(repoRoot, "..", "snow-index.plan");
const planRootDisplay = relative(repoRoot, planRoot) || ".";
const planPackage = resolve(planRoot, "package.json");
const planServer = resolve(planRoot, "server.mjs");
const port = process.env.PORT || "4177";

async function assertFile(path, message) {
  try {
    await access(path, constants.R_OK);
  } catch {
    console.error(message);
    process.exit(1);
  }
}

await assertFile(
  planPackage,
  [
    `Missing sidecar planning repository at ${planRootDisplay}.`,
    "Restore or create the sidecar before running `pnpm plan`.",
  ].join("\n"),
);

await assertFile(
  planServer,
  [
    `Found ${planRootDisplay}, but it does not contain server.mjs.`,
    "Check that the sidecar planning board has been initialized.",
  ].join("\n"),
);

console.log(`Starting snow-index plan board on http://localhost:${port}`);
console.log("Use PORT=<port> pnpm plan to choose another port.");

const child = spawn(process.execPath, [planServer], {
  cwd: planRoot,
  env: { ...process.env, PORT: port },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start plan board: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
