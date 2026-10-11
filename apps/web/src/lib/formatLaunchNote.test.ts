import { describe, expect, it } from "vitest";
import { formatLaunchNote } from "./formatLaunchNote";

describe("formatLaunchNote", () => {
  it("keeps a note with no markers as text", () => {
    expect(formatLaunchNote("shared post-import probes")).toEqual([
      { kind: "text", text: "shared post-import probes" },
    ]);
  });

  it("marks text between asterisks as bold", () => {
    expect(formatLaunchNote("**Inline chat activation** via disk")).toEqual([
      { kind: "bold", children: [{ kind: "text", text: "Inline chat activation" }] },
      { kind: "text", text: " via disk" },
    ]);
    expect(formatLaunchNote("before *single* after")).toEqual([
      { kind: "text", text: "before " },
      { kind: "bold", children: [{ kind: "text", text: "single" }] },
      { kind: "text", text: " after" },
    ]);
  });

  it("marks text between backticks as code", () => {
    expect(formatLaunchNote("via `composer.createNew` when empty")).toEqual([
      { kind: "text", text: "via " },
      { kind: "code", text: "composer.createNew" },
      { kind: "text", text: " when empty" },
    ]);
  });

  it("keeps code inside bold as code", () => {
    expect(formatLaunchNote("**`repairComposerDataAfterActivation`** re-persists")).toEqual([
      { kind: "bold", children: [{ kind: "code", text: "repairComposerDataAfterActivation" }] },
      { kind: "text", text: " re-persists" },
    ]);
  });

  it("leaves unmatched markers as text", () => {
    expect(formatLaunchNote("see `partialState and *.ts")).toEqual([
      { kind: "text", text: "see `partialState and *.ts" },
    ]);
  });
});
