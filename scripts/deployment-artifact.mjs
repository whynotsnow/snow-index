import { createHash } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

const ARCHIVE_NAME = "pages-dist.tar.gz";
const PAYLOAD_ROOTS = ["public", "functions"];
const BLOCK_SIZE = 512;

function fail(message) {
  throw new Error(`canonical_artifact_${message}`);
}

function writeText(buffer, offset, length, value) {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length > length) fail(`field_too_long:${offset}`);
  encoded.copy(buffer, offset);
}

function writeOctal(buffer, offset, length, value) {
  const encoded = `${value.toString(8).padStart(length - 1, "0")}\0`;
  writeText(buffer, offset, length, encoded);
}

function readText(buffer, offset, length) {
  const field = buffer.subarray(offset, offset + length);
  const end = field.indexOf(0);
  return field.subarray(0, end < 0 ? field.length : end).toString("utf8");
}

function readOctal(buffer, offset, length, field) {
  const value = readText(buffer, offset, length).trim();
  if (!/^[0-7]+$/u.test(value)) fail(`invalid_${field}`);
  return Number.parseInt(value, 8);
}

function isZeroBlock(buffer) {
  return buffer.every((byte) => byte === 0);
}

function safeRelativePath(value) {
  if (!value || value.startsWith("/") || value.includes("\\")) fail("unsafe_path");
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail("unsafe_path");
  if (!PAYLOAD_ROOTS.some((root) => value === root || value.startsWith(`${root}/`))) {
    fail("unexpected_root");
  }
  return value;
}

function collectEntries(root) {
  const entries = [];
  const visit = (relative) => {
    const absolute = path.join(root, relative);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) fail(`symlink:${relative}`);
    if (stat.isFile()) {
      entries.push({ path: safeRelativePath(relative), content: readFileSync(absolute) });
      return;
    }
    if (!stat.isDirectory()) fail(`non_regular:${relative}`);
    const children = readdirSync(absolute).sort();
    if (children.length === 0) fail(`empty_directory:${relative}`);
    for (const child of children) visit(path.posix.join(relative, child));
  };

  for (const payloadRoot of PAYLOAD_ROOTS) {
    const absolute = path.join(root, payloadRoot);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      fail(`missing_root:${payloadRoot}`);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`invalid_root:${payloadRoot}`);
    visit(payloadRoot);
  }

  entries.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  if (entries.length === 0) fail("empty_payload");
  return entries;
}

function splitUstarPath(value) {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length <= 100) return { name: value, prefix: "" };
  const slash = value.lastIndexOf("/", 154);
  if (slash <= 0 || Buffer.byteLength(value.slice(0, slash)) > 155 || Buffer.byteLength(value.slice(slash + 1)) > 100) {
    fail(`path_too_long:${value}`);
  }
  return { name: value.slice(slash + 1), prefix: value.slice(0, slash) };
}

function createTar(entries) {
  const chunks = [];
  for (const entry of entries) {
    const header = Buffer.alloc(BLOCK_SIZE);
    const { name, prefix } = splitUstarPath(entry.path);
    writeText(header, 0, 100, name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, entry.content.byteLength);
    writeOctal(header, 136, 12, 0);
    header[156] = 0x30;
    writeText(header, 257, 6, "ustar\0");
    writeText(header, 263, 2, "00");
    writeText(header, 345, 155, prefix);
    header.fill(0x20, 148, 156);
    const checksum = header.reduce((total, byte) => total + byte, 0);
    writeOctal(header, 148, 8, checksum);
    chunks.push(header, entry.content);
    const padding = (BLOCK_SIZE - (entry.content.byteLength % BLOCK_SIZE)) % BLOCK_SIZE;
    if (padding) chunks.push(Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return Buffer.concat(chunks);
}

function validateTar(tar) {
  if (tar.byteLength < BLOCK_SIZE * 3 || tar.byteLength % BLOCK_SIZE !== 0) fail("tar_size");
  let offset = 0;
  let zeroBlocks = 0;
  const paths = [];
  while (offset < tar.byteLength) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    if (isZeroBlock(header)) {
      zeroBlocks += 1;
      offset += BLOCK_SIZE;
      if (zeroBlocks === 2) break;
      continue;
    }
    if (zeroBlocks > 0) fail("tar_after_trailer");
    const storedChecksum = readOctal(header, 148, 8, "checksum");
    let checksum = 0;
    for (let index = 0; index < header.length; index += 1) {
      checksum += index >= 148 && index < 156 ? 0x20 : header[index];
    }
    if (checksum !== storedChecksum) fail("tar_checksum");
    if (readText(header, 257, 6) !== "ustar") fail("tar_format");
    const name = readText(header, 0, 100);
    const prefix = readText(header, 345, 155);
    const entryPath = safeRelativePath(prefix ? `${prefix}/${name}` : name);
    if (readOctal(header, 100, 8, "mode") !== 0o644) fail("tar_mode");
    if (readOctal(header, 108, 8, "uid") !== 0 || readOctal(header, 116, 8, "gid") !== 0) fail("tar_owner");
    if (readOctal(header, 136, 12, "mtime") !== 0) fail("tar_mtime");
    if (header[156] !== 0x30) fail("tar_entry_type");
    const size = readOctal(header, 124, 12, "size");
    const end = offset + BLOCK_SIZE + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
    if (end > tar.byteLength) fail("tar_bounds");
    if (paths.at(-1) && Buffer.from(paths.at(-1)).compare(Buffer.from(entryPath)) >= 0) fail("tar_order");
    paths.push(entryPath);
    offset = end;
  }
  if (zeroBlocks !== 2 || offset !== tar.byteLength || paths.length === 0) fail("tar_trailer");
  return paths;
}

function digestTar(tar) {
  return `sha256:${createHash("sha256").update(tar).digest("hex")}`;
}

function unpackTar(tar, destination) {
  validateTar(tar);
  mkdirSync(destination, { recursive: true });
  if (readdirSync(destination).length > 0) fail("extract_destination_not_empty");
  let offset = 0;
  while (offset < tar.byteLength) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    if (isZeroBlock(header)) break;
    const name = readText(header, 0, 100);
    const prefix = readText(header, 345, 155);
    const entryPath = safeRelativePath(prefix ? `${prefix}/${name}` : name);
    const size = readOctal(header, 124, 12, "size");
    const output = path.join(destination, ...entryPath.split("/"));
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, tar.subarray(offset + BLOCK_SIZE, offset + BLOCK_SIZE + size), { mode: 0o644 });
    chmodSync(output, 0o644);
    offset += BLOCK_SIZE + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
  }
}

function archiveDigest(archivePath, expectedDigest, extractTo) {
  const archive = readFileSync(archivePath);
  const tar = gunzipSync(archive);
  const digest = digestTar(tar);
  validateTar(tar);
  if (expectedDigest && digest !== expectedDigest) fail("digest_mismatch");
  if (extractTo) unpackTar(tar, extractTo);
  return digest;
}

function pack(root, archivePath) {
  const tar = createTar(collectEntries(root));
  validateTar(tar);
  writeFileSync(archivePath, gzipSync(tar, { level: 9, mtime: 0 }));
  return digestTar(tar);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

try {
  const command = process.argv[2];
  if (command === "pack") {
    const digest = pack(path.resolve(valueAfter("--root") ?? "."), path.resolve(valueAfter("--archive") ?? ARCHIVE_NAME));
    console.log(digest);
  } else if (command === "verify") {
    const digest = archiveDigest(
      path.resolve(valueAfter("--archive") ?? ARCHIVE_NAME),
      valueAfter("--expected-digest"),
      valueAfter("--extract-to") ? path.resolve(valueAfter("--extract-to")) : undefined,
    );
    console.log(digest);
  } else {
    fail("usage");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
