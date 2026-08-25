import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cueBin = process.env.CODEX_CUE_BIN ?? resolve(homedir(), ".codex/bin/codex-cue");
const configPath = resolve(rootDir, ".codex/codex-cues.json");
const knownPresets = new Set([
	"ping",
	"pop",
	"glass",
	"hero",
	"tink",
	"submarine",
	"voice",
	"both",
	"silent",
]);
const knownModes = new Set(["sound", "voice", "tts", "both"]);
const knownEvents = new Set([
	"done",
	"attention",
	"validation-start",
	"tests-pass",
	"tests-fail",
	"deploy-start",
	"deploy-approval",
	"deploy-pass",
	"deploy-fail",
]);

function usage() {
	console.log(`Codex cue helper

Usage:
  pnpm cue:list
  pnpm cue:preview [-- --volume 3]
  pnpm cue:show [-- done]
  pnpm cue:done
  pnpm cue:attention
  pnpm cue:validation-start
  pnpm cue:deploy-start
  pnpm cue:deploy-approval
  pnpm cue:deploy-pass
  pnpm cue:deploy-fail
  pnpm cue:tests-pass
  pnpm cue:tests-fail
  pnpm cue play <event> [--preset hero] [--volume 3] [--mode both] [--text "..."]
  pnpm cue set <event> [--preset hero] [--volume 3] [--mode both] [--text "..."]

Events:
  done, attention, validation-start, tests-pass, tests-fail,
  deploy-start, deploy-approval, deploy-pass, deploy-fail

Presets:
  ping, pop, glass, hero, tink, submarine, voice, both, silent
`);
}

function fail(message) {
	console.error(`codex-cue: ${message}`);
	process.exit(1);
}

function runCue(args) {
	const result = spawnSync(cueBin, args, {
		cwd: rootDir,
		stdio: "inherit",
	});

	if (result.error) {
		fail(`unable to run Codex cue binary: ${result.error.message}`);
	}

	process.exitCode = result.status ?? 1;
}

function readConfig() {
	if (!existsSync(configPath)) {
		return {};
	}

	return JSON.parse(readFileSync(configPath, "utf8"));
}

function writeConfig(config) {
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function parseOptions(args) {
	const options = {};

	for (let index = 0; index < args.length; index += 1) {
		const item = args[index];

		if (!item.startsWith("--")) {
			fail(`unexpected argument: ${item}`);
		}

		const key = item.slice(2);
		const value = args[index + 1];

		if (!value || value.startsWith("--")) {
			fail(`missing value for --${key}`);
		}

		index += 1;

		if (key === "preset") {
			if (!knownPresets.has(value)) {
				fail(`unknown preset: ${value}`);
			}
			options.preset = value;
		} else if (key === "mode") {
			if (!knownModes.has(value)) {
				fail(`unknown mode: ${value}`);
			}
			options.mode = value;
		} else if (key === "volume") {
			const volume = Number(value);
			if (!Number.isFinite(volume) || volume <= 0) {
				fail(`volume must be a positive number, got: ${value}`);
			}
			options.volume = volume;
		} else if (key === "text") {
			options.text = value;
		} else if (key === "sound") {
			options.sound = value;
		} else {
			fail(`unknown option: --${key}`);
		}
	}

	return options;
}

function assertEventName(event) {
	if (!/^[a-z][a-z0-9-]{0,63}$/u.test(event)) {
		fail(`invalid event name: ${event}`);
	}
}

function toCueArgs(options) {
	const args = [];

	for (const [key, value] of Object.entries(options)) {
		args.push(`--${key.replaceAll("_", "-")}`, String(value));
	}

	return args;
}

function setEvent(event, optionArgs) {
	assertEventName(event);
	const options = parseOptions(optionArgs);

	if (Object.keys(options).length === 0) {
		fail("set requires at least one option, such as --preset hero or --volume 3");
	}

	const config = readConfig();
	const events = typeof config.events === "object" && config.events ? config.events : {};
	const current = typeof events[event] === "object" && events[event] ? events[event] : {};

	events[event] = {
		...current,
		...options,
	};
	config.events = events;

	writeConfig(config);
	console.log(`Updated ${configPath}`);
	runCue([event, "--show"]);
}

function ensureCueBin() {
	try {
		execFileSync("test", ["-x", cueBin], { stdio: "ignore" });
	} catch {
		fail("Codex cue binary is missing or not executable");
	}
}

ensureCueBin();

const [command = "help", ...rawRest] = process.argv.slice(2);
const rest = rawRest[0] === "--" ? rawRest.slice(1) : rawRest;

if (command === "help" || command === "--help" || command === "-h") {
	usage();
} else if (command === "list") {
	runCue(["--list"]);
} else if (command === "preview") {
	runCue(["--preview-presets", ...rest]);
} else if (command === "show") {
	runCue([rest[0] ?? "done", "--show"]);
} else if (command === "play") {
	const [event, ...optionArgs] = rest;
	if (!event) {
		fail("play requires an event name");
	}
	assertEventName(event);
	runCue([event, ...toCueArgs(parseOptions(optionArgs)), "--test"]);
} else if (command === "set") {
	const [event, ...optionArgs] = rest;
	if (!event) {
		fail("set requires an event name");
	}
	setEvent(event, optionArgs);
} else if (knownEvents.has(command)) {
	runCue([command, "--test"]);
} else {
	fail(`unknown command: ${command}`);
}
