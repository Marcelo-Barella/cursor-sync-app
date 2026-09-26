import { describe, expect, it } from "vitest";
import { AuthApiError, mapAuthApiError, messageForAuthErrorCategory } from "./authErrors";

describe("messageForAuthErrorCategory", () => {
  it("returns distinct copy per category", () => {
    const network = messageForAuthErrorCategory("network");
    const misconfigured = messageForAuthErrorCategory("misconfigured");
    const invalid = messageForAuthErrorCategory("invalid_credentials");
    const taken = messageForAuthErrorCategory("email_taken");

    expect(network).not.toBe(invalid);
    expect(misconfigured).not.toBe(taken);
    expect(network).toMatch(/network/i);
  });
});

describe("mapAuthApiError", () => {
  it("maps AuthApiError to field hints", () => {
    const err = new AuthApiError(
      "invalid_credentials",
      messageForAuthErrorCategory("invalid_credentials"),
      401
    );
    expect(mapAuthApiError(err, "sign-in")).toEqual({
      message: messageForAuthErrorCategory("invalid_credentials"),
      field: "password",
    });
  });

  it("maps misconfigured errors without a field", () => {
    const err = new AuthApiError(
      "misconfigured",
      messageForAuthErrorCategory("misconfigured")
    );
    expect(mapAuthApiError(err, "sign-up").field).toBeNull();
  });
});
