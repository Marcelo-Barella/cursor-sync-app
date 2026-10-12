import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createExtensionChangelogCache } from "../lib/extension-changelog-cache.js";
import { createChangelogRoutes } from "./changelog.js";

const FETCHED_AT_MS = Date.parse("2026-10-07T16:00:00.000Z");

function routesServing(fetchMarkdown: () => Promise<string>) {
  const cache = createExtensionChangelogCache({ fetchMarkdown, now: () => FETCHED_AT_MS });
  return createChangelogRoutes(cache.readChangelog);
}

describe("GET /changelog", () => {
  it("returns stable releases newest first", async () => {
    const routes = routesServing(async () => "## v0.7.6\n- fix: older\n\n## v0.8.4\n### Added\n- newer\n");

    const response = await routes.request("/");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      fetchedAt: "2026-10-07T16:00:00.000Z",
      latest: "0.8.4",
      releases: [
        { version: "0.8.4", sections: [{ heading: "Added", items: ["newer"] }] },
        { version: "0.7.6", sections: [{ heading: "Fixed", items: ["fix: older"] }] },
      ],
    });
  });

  it("returns 503 when the first fetch fails", async () => {
    const routes = routesServing(async () => {
      throw new Error("changelog_http_502");
    });

    const response = await routes.request("/");

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "changelog_unavailable" });
  });

  it("returns 200 with no releases when the only heading is Unreleased", async () => {
    const routes = routesServing(async () => "# Changelog\n\n## [Unreleased]\n\n- soon\n");

    const response = await routes.request("/");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      fetchedAt: "2026-10-07T16:00:00.000Z",
      latest: null,
      releases: [],
    });
  });
});
