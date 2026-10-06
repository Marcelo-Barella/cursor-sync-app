import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteUserObjectsWithPrecheck,
  mapDeleteObjectResults,
} from "./r2.js";

describe("deleteUserObjectsWithPrecheck", () => {
  const prefix = "users/u1/";

  it("returns not_found when object is missing before delete", async () => {
    const results = await deleteUserObjectsWithPrecheck(
      ["gone.json", "keep.json"],
      prefix,
      {
        headObject: async (fullKey) =>
          fullKey.endsWith("gone.json") ? "missing" : "exists",
        deleteObjects: async (fullKeys) => ({
          Deleted: fullKeys.map((Key) => ({ Key })),
        }),
      }
    );
    assert.deepEqual(results, [
      { key: "gone.json", status: "not_found" },
      { key: "keep.json", status: "deleted" },
    ]);
  });

  it("returns 502-worthy failed when head fails", async () => {
    const results = await deleteUserObjectsWithPrecheck(["a.json"], prefix, {
      headObject: async () => "error",
      deleteObjects: async () => ({ Deleted: [] }),
    });
    assert.deepEqual(results, [
      { key: "a.json", status: "failed", reason: "head_failed" },
    ]);
  });

  it("maps delete failures after existence check", async () => {
    const full = `${prefix}bad.json`;
    const results = await deleteUserObjectsWithPrecheck(["bad.json"], prefix, {
      headObject: async () => "exists",
      deleteObjects: async () => ({
        Errors: [{ Key: full, Code: "AccessDenied" }],
      }),
    });
    assert.deepEqual(results, [
      { key: "bad.json", status: "failed", reason: "AccessDenied" },
    ]);
  });
});

describe("mapDeleteObjectResults R2 quiet-success quirk", () => {
  it("would mark missing keys deleted without precheck", () => {
    const relative = ["missing.json"];
    const full = ["users/u1/missing.json"];
    const results = mapDeleteObjectResults(relative, full, {
      Deleted: [{ Key: full[0] }],
    });
    assert.deepEqual(results, [{ key: "missing.json", status: "deleted" }]);
  });
});
