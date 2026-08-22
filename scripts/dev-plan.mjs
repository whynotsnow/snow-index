import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const planRoot = resolve(repoRoot, "..", "snow-index.plan");
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
    "Missing sidecar planning repository at ../snow-index.plan.",
    "Restore or create the sidecar before running `pnpm plan`.",
  ].join("\n"),
);

await assertFile(
  planServer,
  [
    "Found ../snow-index.plan, but it does not contain server.mjs.",
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
