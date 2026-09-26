import { describe, expect, it } from "vitest";
import {
  buildExtensionAuthRedirectUrl,
  EXTENSION_AUTH_URI,
  HANDOFF_ATTEMPTED_KEY,
  normalizeExtensionRedirectUri,
  resolveOAuthRedirectUri,
  resolveOAuthRedirectUriForHandoff,
} from "./auth";

describe("normalizeExtensionRedirectUri", () => {
  it("accepts cursor and vscode schemes for the extension auth path", () => {
    expect(normalizeExtensionRedirectUri(EXTENSION_AUTH_URI)).toBe(
      "cursor://marcelobarella.cursor-sync/auth"
    );
    expect(
      normalizeExtensionRedirectUri("vscode://MarceloBarella.cursor-sync/auth")
    ).toBe("vscode://marcelobarella.cursor-sync/auth");
    expect(
      normalizeExtensionRedirectUri("cursor://marcelobarella.cursor-sync/auth")
    ).toBe("cursor://marcelobarella.cursor-sync/auth");
    expect(
      normalizeExtensionRedirectUri("cursor://MarceloBarella.cursor-sync/auth/")
    ).toBe("cursor://marcelobarella.cursor-sync/auth");
  });

  it("rejects other schemes, hosts, and paths", () => {
    expect(normalizeExtensionRedirectUri("https://evil.example/auth")).toBeNull();
    expect(normalizeExtensionRedirectUri("cursor://other.cursor-sync/auth")).toBeNull();
    expect(
      normalizeExtensionRedirectUri("cursor://MarceloBarella.cursor-sync/other")
    ).toBeNull();
  });

  it("canonicalizes allowed URIs", () => {
    expect(
      normalizeExtensionRedirectUri("cursor://MarceloBarella.cursor-sync/auth/")
    ).toBe("cursor://marcelobarella.cursor-sync/auth");
  });
});

describe("resolveOAuthRedirectUriForHandoff", () => {
  it("falls back to the default extension URI when query and storage are empty", () => {
    expect(resolveOAuthRedirectUriForHandoff(null)).toBe(
      "cursor://marcelobarella.cursor-sync/auth"
    );
  });

  it("prefers a valid query redirect over the default", () => {
    const vscodeUri = "vscode://MarceloBarella.cursor-sync/auth";
    expect(resolveOAuthRedirectUri(vscodeUri)).toBe(
      "vscode://marcelobarella.cursor-sync/auth"
    );
  });
});

describe("buildExtensionAuthRedirectUrl", () => {
  it("appends encoded code and state query params", () => {
    const url = buildExtensionAuthRedirectUrl(
      EXTENSION_AUTH_URI,
      "code+special/value",
      "state with spaces"
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("code")).toBe("code+special/value");
    expect(parsed.searchParams.get("state")).toBe("state with spaces");
    expect(parsed.searchParams.has("token")).toBe(false);
  });

  it("passes state through unchanged", () => {
    const url = buildExtensionAuthRedirectUrl(EXTENSION_AUTH_URI, "abc123", "opaque-state");
    expect(url).toContain("state=opaque-state");
    expect(url).toContain("code=abc123");
  });

  it("never puts a session token in the redirect URL", () => {
    expect(() =>
      buildExtensionAuthRedirectUrl(
        `${EXTENSION_AUTH_URI}?token=leak`,
        "abc",
        null
      )
    ).toThrow(/token/);
  });

  it("rejects disallowed redirect URIs", () => {
    expect(() =>
      buildExtensionAuthRedirectUrl("https://evil.example/auth", "abc", null)
    ).toThrow(/Invalid redirect URI/);
  });
});

describe("handoff keys", () => {
  it("defines a session storage key for handoff tracking", () => {
    expect(HANDOFF_ATTEMPTED_KEY).toBe("cursor_sync_handoff_attempted");
  });
});
