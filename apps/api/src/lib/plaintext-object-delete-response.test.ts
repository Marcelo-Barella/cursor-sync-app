import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plaintextDeleteHttpStatus } from "./plaintext-object-delete-response.js";

describe("plaintextDeleteHttpStatus", () => {
  it("returns 200 when no failures", () => {
    assert.equal(
      plaintextDeleteHttpStatus([
        { key: "a.json", status: "deleted" },
        { key: "b.json", status: "not_found" },
      ]),
      200
    );
  });

  it("returns 502 when any key failed", () => {
    assert.equal(
      plaintextDeleteHttpStatus([
        { key: "a.json", status: "deleted" },
        { key: "b.json", status: "failed", reason: "AccessDenied" },
      ]),
      502
    );
  });
});
