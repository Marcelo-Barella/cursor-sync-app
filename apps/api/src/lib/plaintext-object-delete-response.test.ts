import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plaintextDeleteHttpStatus } from "./plaintext-object-delete-response.js";

describe("plaintextDeleteHttpStatus", () => {
  it("returns 200 when all keys deleted or not_found", () => {
    assert.equal(
      plaintextDeleteHttpStatus([
        { key: "a", status: "deleted" },
        { key: "b", status: "not_found" },
      ]),
      200
    );
  });

  it("returns 502 when any key failed", () => {
    assert.equal(
      plaintextDeleteHttpStatus([
        { key: "a", status: "deleted" },
        { key: "b", status: "failed", reason: "AccessDenied" },
      ]),
      502
    );
  });
});
