import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../../..");
const SKIP_DIR_NAMES = new Set(["node_modules", ".git", "dist", "coverage", ".turbo"]);
const LEGACY_HOST_SUBSTRING = ["berg", "amota"].join("");
const BANNED = new RegExp(LEGACY_HOST_SUBSTRING, "i");
const SELF_BASENAME = "no-legacy-host-source.test.ts";

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example" && entry.name !== ".cursor") {
      if (entry.isDirectory() && entry.name !== ".cursor") {
        continue;
      }
      if (!entry.isDirectory()) {
        continue;
      }
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      files.push(...(await collectFiles(full)));
      continue;
    }
    if (entry.name === SELF_BASENAME) {
      continue;
    }
    const info = await stat(full);
    if (!info.isFile() || info.size > 5_000_000) {
      continue;
    }
    files.push(full);
  }
  return files;
}

describe("shipped source must not reference retired host branding", () => {
  it("scans the repo for the legacy host substring", async () => {
    const files = await collectFiles(REPO_ROOT);
    const hits: string[] = [];
    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (BANNED.test(content)) {
        hits.push(relative(REPO_ROOT, file));
      }
    }
    assert.deepEqual(
      hits,
      [],
      hits.length > 0 ? `legacy host substring found in:\n${hits.join("\n")}` : undefined
    );
  });
});