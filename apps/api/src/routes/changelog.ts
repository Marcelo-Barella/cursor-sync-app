import { Hono } from "hono";
import type { ExtensionChangelog } from "../lib/extension-changelog.js";
import { createExtensionChangelogCache } from "../lib/extension-changelog-cache.js";
import { fetchExtensionChangelogMarkdown } from "../lib/extension-changelog-source.js";

export function createChangelogRoutes(
  readChangelog: () => Promise<ExtensionChangelog | null>
): Hono {
  const routes = new Hono();
  routes.get("/", async (c) => {
    const changelog = await readChangelog();
    if (!changelog) {
      return c.json({ error: "changelog_unavailable" }, 503);
    }
    return c.json(changelog);
  });
  return routes;
}

export const changelogRoutes = createChangelogRoutes(
  createExtensionChangelogCache({
    fetchMarkdown: fetchExtensionChangelogMarkdown,
    now: Date.now,
  }).readChangelog
);
