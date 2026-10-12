import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(here, "../../package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function getBuildInfo(): { version: string; gitSha: string } {
  const version =
    process.env.APP_VERSION?.trim() || packageVersion();
  const gitSha = process.env.GIT_SHA?.trim() || "unknown";
  return { version, gitSha };
}
