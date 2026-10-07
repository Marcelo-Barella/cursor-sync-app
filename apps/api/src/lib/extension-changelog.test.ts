import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseExtensionChangelog } from "./extension-changelog.js";

const GROUPED_CHANGELOG = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "- not shipped yet",
  "",
  "## v0.8.4-staging.5",
  "",
  "### Added",
  "- staging only",
  "",
  "## v0.8.4",
  "",
  "### Fixed",
  "- first fix",
  "### Added",
  "- first add",
  "  - nested add",
  "- wrapped add",
  "  continues here",
  "### Removed",
  "",
  "### Fixed",
  "- second fix",
  "",
  "## [0.7.6] - 2026-09-01",
  "",
  "### Changed",
  "- older change",
].join("\n");

const FLAT_CHANGELOG = [
  "## v0.4.9",
  "",
  "- feat: add vsix sync",
  "- fix: run sqlite through a temp file",
  "- docs: clarify token setup",
  "- Refactor: split the engine",
  "- add sidebar icons",
  "",
  "## v0.1.0",
  "",
  "Initial release.",
  "",
  "- Manual push and pull.",
].join("\n");

describe("parseExtensionChangelog", () => {
  it("keeps grouped notes in file order, one section per heading, empty sections omitted", () => {
    assert.deepEqual(parseExtensionChangelog(GROUPED_CHANGELOG), [
      {
        version: "0.8.4",
        sections: [
          { heading: "Fixed", items: ["first fix", "second fix"] },
          { heading: "Added", items: ["first add", "nested add", "wrapped add continues here"] },
        ],
      },
      { version: "0.7.6", sections: [{ heading: "Changed", items: ["older change"] }] },
    ]);
  });

  it("drops Unreleased and prerelease headings and keeps the stable version", () => {
    const versions = parseExtensionChangelog(GROUPED_CHANGELOG)?.map((release) => release.version);
    assert.deepEqual(versions, ["0.8.4", "0.7.6"]);
  });

  it("classifies flat bullets by prefix and puts a plain paragraph in Notes", () => {
    assert.deepEqual(parseExtensionChangelog(FLAT_CHANGELOG), [
      {
        version: "0.4.9",
        sections: [
          { heading: "Added", items: ["feat: add vsix sync"] },
          { heading: "Fixed", items: ["fix: run sqlite through a temp file"] },
          { heading: "Changed", items: ["docs: clarify token setup", "Refactor: split the engine"] },
          { heading: "Notes", items: ["add sidebar icons"] },
        ],
      },
      { version: "0.1.0", sections: [{ heading: "Notes", items: ["Initial release.", "Manual push and pull."] }] },
    ]);
  });

  it("accepts the three heading forms and drops build metadata and unknown headings", () => {
    const markdown = [
      "## 1.2.0",
      "- a",
      "## [1.1.0]",
      "- b",
      "## v1.0.0 (2026-01-01)",
      "- c",
      "## 1.0.0+build.7",
      "- d",
      "## [1.3.0-rc.1]",
      "- e",
      "## Release notes",
      "- f",
    ].join("\n");
    const versions = parseExtensionChangelog(markdown)?.map((release) => release.version);
    assert.deepEqual(versions, ["1.2.0", "1.1.0", "1.0.0"]);
  });

  it("orders releases newest first by number, not by text", () => {
    const versions = parseExtensionChangelog("## v0.9.0\n- a\n\n## v0.10.0\n- b\n")?.map(
      (release) => release.version
    );
    assert.deepEqual(versions, ["0.10.0", "0.9.0"]);
  });

  it("returns an empty list when the only heading is Unreleased", () => {
    assert.deepEqual(parseExtensionChangelog("# Changelog\n\n## [Unreleased]\n\n- soon\n"), []);
  });

  it("returns null when no line starts with ##", () => {
    assert.equal(parseExtensionChangelog("<!doctype html><p>rate limited</p>"), null);
  });
});
