import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sidecarPath = path.resolve(process.cwd(), "../snow-index.plan");
const serverPath = path.join(sidecarPath, "server.mjs");

if (!fs.existsSync(serverPath)) {
	console.error("Missing sidecar preview server at ../snow-index.plan/server.mjs");
	process.exit(1);
}

const child = spawn(process.execPath, [serverPath], {
	cwd: sidecarPath,
	stdio: "inherit",
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
