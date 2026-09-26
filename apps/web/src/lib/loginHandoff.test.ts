import { describe, expect, it, vi } from "vitest";
import {
  PENDING_LOGIN_CODE_KEY,
  readPendingLoginCode,
  savePendingLoginCode,
} from "./loginHandoff";

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

describe("loginHandoff storage", () => {
  it("round-trips a pending login code in session storage", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("sessionStorage", storage);

    savePendingLoginCode("abc123-code");
    expect(storage.getItem(PENDING_LOGIN_CODE_KEY)).toBe("abc123-code");
    expect(readPendingLoginCode()).toBe("abc123-code");
  });
});
