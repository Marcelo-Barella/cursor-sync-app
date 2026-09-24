import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendCodeToRedirectUri,
  buildAuthCallbackRedirect,
  isAllowedRedirectUri,
} from "./redirect-uri.js";

describe("isAllowedRedirectUri", () => {
  it("accepts cursor and vscode extension auth URIs (case-insensitive authority)", () => {
    assert.equal(
      isAllowedRedirectUri("cursor://MarceloBarella.cursor-sync/auth"),
      true
    );
    assert.equal(
      isAllowedRedirectUri("vscode://marcelobarella.cursor-sync/auth"),
      true
    );
  });

  it("rejects invalid redirect URIs with 400-worthy inputs", () => {
    assert.equal(isAllowedRedirectUri("https://MarceloBarella.cursor-sync/auth"), false);
    assert.equal(isAllowedRedirectUri("cursor://evil.cursor-sync/auth"), false);
    assert.equal(isAllowedRedirectUri("cursor://MarceloBarella.cursor-sync/other"), false);
    assert.equal(isAllowedRedirectUri(""), false);
  });
});

describe("buildAuthCallbackRedirect", () => {
  it("encodes code and preserves state", () => {
    const uri = buildAuthCallbackRedirect(
      "cursor://MarceloBarella.cursor-sync/auth",
      "a+b/c",
      "opaque"
    );
    assert.match(uri, /code=a%2Bb%2Fc/);
    assert.match(uri, /state=opaque/);
  });

  it("matches appendCodeToRedirectUri behavior", () => {
    const code = "test-code";
    const base = "vscode://MarceloBarella.cursor-sync/auth";
    assert.equal(
      appendCodeToRedirectUri(base, code, "s1"),
      buildAuthCallbackRedirect(base, code, "s1")
    );
  });
});
