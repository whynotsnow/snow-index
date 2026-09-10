import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { constants } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function locateSidecarRoot() {
  const candidates = [];
  const explicitPath = process.env.SNOW_INDEX_SIDECAR_PATH?.trim();
  if (explicitPath) candidates.push(isAbsolute(explicitPath) ? explicitPath : resolve(repoRoot, explicitPath));
  candidates.push(resolve(repoRoot, "..", "snow-index.sidecar"));
  try {
    const commonDirValue = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (commonDirValue) {
      const commonDir = isAbsolute(commonDirValue) ? commonDirValue : resolve(repoRoot, commonDirValue);
      candidates.push(resolve(dirname(commonDir), "..", "snow-index.sidecar"));
    }
  } catch {
    // The sibling candidate is sufficient for a regular checkout.
  }
  return candidates
    .filter((candidate, index) => candidates.indexOf(candidate) === index)
    .find((candidate) => existsSync(resolve(candidate, "sidecar.config.json")));
}

const sidecarRoot = locateSidecarRoot() ?? resolve(repoRoot, "..", "snow-index.sidecar");
const sidecarRootDisplay = relative(repoRoot, sidecarRoot) || ".";
const sidecarPackage = resolve(sidecarRoot, "package.json");
const sidecarServer = resolve(sidecarRoot, "server.mjs");
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
  sidecarPackage,
  [
    `Missing sidecar repository at ${sidecarRootDisplay}.`,
    "Restore or create the sidecar before running `pnpm sidecar`.",
  ].join("\n"),
);

await assertFile(
  sidecarServer,
  [
    `Found ${sidecarRootDisplay}, but it does not contain server.mjs.`,
    "Check that the sidecar preview board has been initialized.",
  ].join("\n"),
);

console.log(`Starting snow-index sidecar preview on http://localhost:${port}`);
console.log("Use PORT=<port> pnpm sidecar to choose another port.");

const child = spawn(process.execPath, [sidecarServer], {
  cwd: sidecarRoot,
  env: { ...process.env, PORT: port },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Failed to start sidecar preview: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
