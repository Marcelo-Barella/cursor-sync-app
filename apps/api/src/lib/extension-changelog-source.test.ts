import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  EXTENSION_CHANGELOG_URL,
  fetchExtensionChangelogMarkdown,
} from "./extension-changelog-source.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchExtensionChangelogMarkdown", () => {
  it("reads CHANGELOG.md from main with an abort signal", async () => {
    const requests: { url: string; signal: AbortSignal | null | undefined }[] = [];
    globalThis.fetch = async (input, init) => {
      requests.push({ url: String(input), signal: init?.signal });
      return new Response("## v0.8.4\n", { status: 200 });
    };

    assert.equal(await fetchExtensionChangelogMarkdown(), "## v0.8.4\n");
    assert.equal(requests[0]?.url, EXTENSION_CHANGELOG_URL);
    assert.equal(
      EXTENSION_CHANGELOG_URL,
      "https://raw.githubusercontent.com/Marcelo-Barella/cursor-sync/main/CHANGELOG.md"
    );
    assert.ok(requests[0]?.signal instanceof AbortSignal);
  });

  it("rejects a non-200 response", async () => {
    globalThis.fetch = async () => new Response("Not Found", { status: 404 });

    await assert.rejects(fetchExtensionChangelogMarkdown(), /changelog_http_404/);
  });
});
