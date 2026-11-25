import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_STATE_CHANGED_EVENT,
  clearMemorySession,
  setMemorySession,
  syncMemorySessionFromStorage,
} from "./sessionAuth";
import { TOKEN_STORAGE_KEY } from "./auth";

function countAuthStateEvents(onEach: () => void): () => number {
  let count = 0;
  const handler = () => {
    count += 1;
    onEach();
  };
  window.addEventListener(AUTH_STATE_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handler);
    return count;
  };
}

function stubWindow(): void {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  vi.stubGlobal("window", {
    addEventListener(type: string, handler: (event: Event) => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: Event) {
      for (const handler of listeners.get(event.type) ?? []) {
        handler(event);
      }
      return true;
    },
  });
}

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

describe("sessionAuth", () => {
  beforeEach(() => {
    stubWindow();
    vi.stubGlobal("sessionStorage", createMemoryStorage());
  });

  afterEach(() => {
    clearMemorySession();
    vi.unstubAllGlobals();
  });

  it("clearMemorySession dispatches at most once when already cleared", () => {
    clearMemorySession();
    const finish = countAuthStateEvents(() => {});
    clearMemorySession();
    clearMemorySession();
    const dispatches = finish();
    expect(dispatches).toBe(0);
  });

  it("survives auth refresh after logout without recursive dispatches", () => {
    setMemorySession("tok", "user@example.com");
    let depth = 0;
    const finish = countAuthStateEvents(() => {
      depth += 1;
      if (depth > 32) {
        throw new Error("stack overflow");
      }
      syncMemorySessionFromStorage();
    });

    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    clearMemorySession();

    expect(finish()).toBe(1);
  });
});