import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearEmailVerificationNotice,
  readEmailVerificationNotice,
  saveEmailVerificationNotice,
} from "./emailVerificationNotice";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("emailVerificationNotice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips notice in sessionStorage", () => {
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    saveEmailVerificationNotice({ sent: true });
    expect(readEmailVerificationNotice()).toEqual({ sent: true });
    clearEmailVerificationNotice();
    expect(readEmailVerificationNotice()).toBeNull();
  });

  it("stores warning when send failed", () => {
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    saveEmailVerificationNotice({
      sent: false,
      warning: "Verification email is not configured on the server.",
    });
    expect(readEmailVerificationNotice()?.warning).toContain("not configured");
  });
});
