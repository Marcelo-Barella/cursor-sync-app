import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createExtensionChangelogCache } from "./extension-changelog-cache.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const START_MS = Date.parse("2026-10-07T16:00:00.000Z");
const GOOD_MARKDOWN = "## v0.8.4\n\n### Added\n- sync chats\n";
const NEWER_MARKDOWN = "## v0.9.0\n\n### Fixed\n- faster pull\n";

function scriptedGitHub(responses: Array<string | Error>) {
  let fetchCount = 0;
  const fetchMarkdown = async (): Promise<string> => {
    const response = responses[Math.min(fetchCount, responses.length - 1)];
    fetchCount += 1;
    if (response instanceof Error) throw response;
    return response;
  };
  return { fetchMarkdown, fetchCount: () => fetchCount };
}

function testClock() {
  let clockMs = START_MS;
  return { now: () => clockMs, advance: (ms: number) => { clockMs += ms; } };
}

describe("createExtensionChangelogCache", () => {
  it("serves the copy within ten minutes without calling GitHub again", async () => {
    const gitHub = scriptedGitHub([GOOD_MARKDOWN, NEWER_MARKDOWN]);
    const clock = testClock();
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: clock.now });

    const first = await cache.readChangelog();
    clock.advance(TEN_MINUTES_MS - 1);
    const second = await cache.readChangelog();

    assert.equal(gitHub.fetchCount(), 1);
    assert.equal(second, first);
    assert.deepEqual(first, {
      fetchedAt: "2026-10-07T16:00:00.000Z",
      latest: "0.8.4",
      releases: [{ version: "0.8.4", sections: [{ heading: "Added", items: ["sync chats"] }] }],
    });
  });

  it("fetches again after ten minutes", async () => {
    const gitHub = scriptedGitHub([GOOD_MARKDOWN, NEWER_MARKDOWN]);
    const clock = testClock();
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: clock.now });

    await cache.readChangelog();
    clock.advance(TEN_MINUTES_MS);
    const refreshed = await cache.readChangelog();

    assert.equal(gitHub.fetchCount(), 2);
    assert.equal(refreshed?.latest, "0.9.0");
    assert.equal(refreshed?.fetchedAt, "2026-10-07T16:10:00.000Z");
  });

  it("runs one GitHub fetch for concurrent requests", async () => {
    let fetchCount = 0;
    let resolveFetch: (markdown: string) => void = () => {};
    const cache = createExtensionChangelogCache({
      fetchMarkdown: () => {
        fetchCount += 1;
        return new Promise<string>((resolve) => {
          resolveFetch = resolve;
        });
      },
      now: testClock().now,
    });

    const reads = Promise.all([cache.readChangelog(), cache.readChangelog(), cache.readChangelog()]);
    resolveFetch(GOOD_MARKDOWN);
    const [first, second, third] = await reads;

    assert.equal(fetchCount, 1);
    assert.equal(first?.latest, "0.8.4");
    assert.equal(second, first);
    assert.equal(third, first);
  });

  it("regression: a failed refresh keeps the previous body", async () => {
    const gitHub = scriptedGitHub([GOOD_MARKDOWN, new Error("changelog_http_500")]);
    const clock = testClock();
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: clock.now });

    const first = await cache.readChangelog();
    clock.advance(TEN_MINUTES_MS);
    const afterFailure = await cache.readChangelog();

    assert.equal(gitHub.fetchCount(), 2);
    assert.equal(afterFailure, first);
    assert.equal(afterFailure?.fetchedAt, "2026-10-07T16:00:00.000Z");
  });

  it("returns null when the first fetch fails", async () => {
    const gitHub = scriptedGitHub([new Error("The operation was aborted due to timeout")]);
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: testClock().now });

    assert.equal(await cache.readChangelog(), null);
  });

  it("does not replace a good copy with a body that has no ## heading", async () => {
    const gitHub = scriptedGitHub([GOOD_MARKDOWN, "<!doctype html><p>rate limited</p>"]);
    const clock = testClock();
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: clock.now });

    await cache.readChangelog();
    clock.advance(TEN_MINUTES_MS);
    const afterBadBody = await cache.readChangelog();

    assert.equal(gitHub.fetchCount(), 2);
    assert.equal(afterBadBody?.latest, "0.8.4");
  });

  it("stores a file whose only heading is Unreleased as a success", async () => {
    const gitHub = scriptedGitHub(["# Changelog\n\n## [Unreleased]\n\n- soon\n"]);
    const clock = testClock();
    const cache = createExtensionChangelogCache({ fetchMarkdown: gitHub.fetchMarkdown, now: clock.now });

    const changelog = await cache.readChangelog();
    clock.advance(TEN_MINUTES_MS - 1);
    await cache.readChangelog();

    assert.deepEqual(changelog, { fetchedAt: "2026-10-07T16:00:00.000Z", latest: null, releases: [] });
    assert.equal(gitHub.fetchCount(), 1);
  });
});
