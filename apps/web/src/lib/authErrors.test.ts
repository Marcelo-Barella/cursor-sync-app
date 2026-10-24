import { describe, expect, it } from "vitest";
import {
  AuthApiError,
  mapAuthApiError,
  messageForAuthErrorCategory,
  mutedHelperForAuthErrorCategory,
  primaryActionForAuthErrorCategory,
} from "./authErrors";

describe("messageForAuthErrorCategory", () => {
  it("uses locked Sync UI Designer copy", () => {
    expect(messageForAuthErrorCategory("network")).toBe(
      "Can’t reach Cursor Sync. Check your connection and try again."
    );
    expect(messageForAuthErrorCategory("invalid_credentials")).toBe(
      "Email or password is wrong."
    );
    expect(messageForAuthErrorCategory("email_taken")).toBe(
      "That email is already in use."
    );
    expect(messageForAuthErrorCategory("empty_api_base")).toBe(
      "Sign-in isn’t set up in this build. Open Cursor Sync from the extension."
    );
  });

  it("never reuses credential copy for infrastructure failures", () => {
    const network = messageForAuthErrorCategory("network");
    const credentials = messageForAuthErrorCategory("invalid_credentials");
    const taken = messageForAuthErrorCategory("email_taken");
    expect(network).not.toBe(credentials);
    expect(messageForAuthErrorCategory("unavailable")).not.toBe(taken);
    expect(messageForAuthErrorCategory("server")).not.toBe(credentials);
  });
});

describe("mapAuthApiError", () => {
  it("maps credential errors to field hints and Continue action", () => {
    const err = new AuthApiError(
      "invalid_credentials",
      messageForAuthErrorCategory("invalid_credentials"),
      401
    );
    expect(mapAuthApiError(err)).toEqual({
      message: messageForAuthErrorCategory("invalid_credentials"),
      field: "password",
      category: "invalid_credentials",
      primaryAction: "continue",
      mutedHelper: null,
    });
  });

  it("maps empty API base to Return to Cursor", () => {
    const mapped = mapAuthApiError(
      new AuthApiError(
        "empty_api_base",
        messageForAuthErrorCategory("empty_api_base")
      )
    );
    expect(mapped.primaryAction).toBe("return_to_cursor");
    expect(mapped.field).toBeNull();
  });

  it("maps network errors to Try again with muted helper", () => {
    const mapped = mapAuthApiError(
      new AuthApiError("network", messageForAuthErrorCategory("network"))
    );
    expect(mapped.primaryAction).toBe("try_again");
    expect(mutedHelperForAuthErrorCategory("network")).toBe(
      "Your details weren’t sent."
    );
  });

  it("uses Try again for server failures", () => {
    expect(
      primaryActionForAuthErrorCategory("server")
    ).toBe("try_again");
  });
});
