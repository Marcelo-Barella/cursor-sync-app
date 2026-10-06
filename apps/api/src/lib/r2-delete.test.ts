import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapDeleteObjectResults } from "./r2.js";

describe("mapDeleteObjectResults", () => {
  const relative = ["a.json", "missing.json", "bad.json"];
  const full = relative.map((key) => `users/u1/${key}`);

  it("maps deleted, not_found, and failed entries", () => {
    const results = mapDeleteObjectResults(relative, full, {
      Deleted: [{ Key: full[0] }],
      Errors: [
        { Key: full[1], Code: "NoSuchKey" },
        { Key: full[2], Code: "AccessDenied", Message: "denied" },
      ],
    });
    assert.deepEqual(results, [
      { key: "a.json", status: "deleted" },
      { key: "missing.json", status: "not_found" },
      { key: "bad.json", status: "failed", reason: "AccessDenied" },
    ]);
  });
});
