import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.join(process.cwd(), "scripts/deployment-artifact.mjs");

function run(args, expectedStatus = 0) {
  try {
    const output = execFileSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.equal(expectedStatus, 0);
    return output.trim();
  } catch (error) {
    assert.notEqual(expectedStatus, 0);
    return String(error.stderr ?? error.stdout ?? error.message);
  }
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "snow-index-pages-"));
  mkdirSync(path.join(root, "public", "assets"), { recursive: true });
  mkdirSync(path.join(root, "functions", "plaza", "t"), { recursive: true });
  writeFileSync(path.join(root, "public", "index.html"), "<!doctype html>\n");
  writeFileSync(path.join(root, "public", "assets", "app.js"), "console.log('ok');\n");
  writeFileSync(path.join(root, "functions", "plaza", "t", "[[topic]].js"), "export {}\n");
  return root;
}

test("creates a deterministic Pages archive and verifies the extracted payload", () => {
  const root = fixture();
  const archiveA = path.join(root, "a.tar.gz");
  const archiveB = path.join(root, "b.tar.gz");
  const digestA = run(["pack", "--root", root, "--archive", archiveA]);
  const digestB = run(["pack", "--root", root, "--archive", archiveB]);
  assert.match(digestA, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(digestA, digestB);
  assert.deepEqual(readFileSync(archiveA), readFileSync(archiveB));
  const extracted = path.join(root, "extracted");
  assert.equal(run(["verify", "--archive", archiveA, "--expected-digest", digestA, "--extract-to", extracted]), digestA);
  assert.equal(readFileSync(path.join(extracted, "public", "index.html"), "utf8"), "<!doctype html>\n");
  assert.equal(readFileSync(path.join(extracted, "functions", "plaza", "t", "[[topic]].js"), "utf8"), "export {}\n");
});

test("fails closed on digest mismatch, symlinks, and empty directories", () => {
  const root = fixture();
  const archive = path.join(root, "pages-dist.tar.gz");
  const digest = run(["pack", "--root", root, "--archive", archive]);
  const wrongDigest = `${digest.slice(0, -1)}${digest.endsWith("0") ? "1" : "0"}`;
  assert.match(run(["verify", "--archive", archive, "--expected-digest", wrongDigest], 1), /digest_mismatch/u);

  symlinkSync(path.join(root, "public", "index.html"), path.join(root, "public", "link.html"));
  assert.match(run(["pack", "--root", root, "--archive", path.join(root, "symlink.tar.gz")], 1), /symlink/u);

  const emptyRoot = fixture();
  mkdirSync(path.join(emptyRoot, "public", "empty"));
  assert.match(run(["pack", "--root", emptyRoot, "--archive", path.join(emptyRoot, "empty.tar.gz")], 1), /empty_directory/u);
});
