import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const distAssets = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist/assets"
);

describe("production bundle security", () => {
  it("omits runtime API override persistence from production assets", () => {
    if (!existsSync(distAssets)) {
      return;
    }
    const sources = readdirSync(distAssets)
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(path.join(distAssets, name), "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/searchParams\.get\("api"\)/);
    expect(sources).not.toMatch(
      /setItem\(\s*["']cursor-sync-api-base-url["']/
    );
  });
});