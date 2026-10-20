import { parseExtensionChangelog, type ExtensionChangelog } from "./extension-changelog.js";

const FRESH_FOR_MS = 10 * 60 * 1000;

export type ExtensionChangelogCacheOptions = {
  fetchMarkdown: () => Promise<string>;
  now: () => number;
};

export type ExtensionChangelogCache = {
  readChangelog: () => Promise<ExtensionChangelog | null>;
};

function logRefreshFailure(reason: string): void {
  console.warn(
    JSON.stringify({
      event: "extension_changelog_refresh_failed",
      reason,
      ts: new Date().toISOString(),
    })
  );
}

export function createExtensionChangelogCache({
  fetchMarkdown,
  now,
}: ExtensionChangelogCacheOptions): ExtensionChangelogCache {
  let cachedChangelog: ExtensionChangelog | null = null;
  let pendingRefresh: Promise<void> | null = null;

  const isFresh = (changelog: ExtensionChangelog): boolean =>
    now() - Date.parse(changelog.fetchedAt) < FRESH_FOR_MS;

  const refresh = async (): Promise<void> => {
    try {
      const releases = parseExtensionChangelog(await fetchMarkdown());
      if (!releases) {
        logRefreshFailure("no_release_heading");
        return;
      }
      cachedChangelog = {
        fetchedAt: new Date(now()).toISOString(),
        latest: releases[0]?.version ?? null,
        releases,
      };
    } catch (error) {
      logRefreshFailure(error instanceof Error ? error.message : "unknown_error");
    }
  };

  return {
    readChangelog: async () => {
      if (cachedChangelog && isFresh(cachedChangelog)) return cachedChangelog;
      pendingRefresh ??= refresh().finally(() => {
        pendingRefresh = null;
      });
      await pendingRefresh;
      return cachedChangelog;
    },
  };
}
