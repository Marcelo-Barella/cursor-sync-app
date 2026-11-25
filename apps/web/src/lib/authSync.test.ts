import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_STORAGE_KEY } from "./auth";
import {
  AUTH_LOGOUT_BROADCAST_KEY,
  applyRemoteLogout,
  clearClientAuthState,
} from "./logout";
import {
  broadcastAuthLogout,
  redirectAfterRemoteLogout,
  registerAuthCrossTabNavigate,
  resetAuthSyncDedupeForTests,
  subscribeToAuthSync,
} from "./authSync";

vi.mock("./apiBase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apiBase")>();
  return {
    ...actual,
    getApiBaseUrlForAuth: () => "https://api.example.com",
    isAuthApiBaseMissing: () => false,
  };
});

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

function dispatchRemoteStorageLogout(nonce: string): void {
  const event = new Event("storage") as StorageEvent;
  Object.defineProperties(event, {
    key: { value: AUTH_LOGOUT_BROADCAST_KEY },
    newValue: { value: JSON.stringify({ type: "logout", nonce }) },
    storageArea: { value: localStorage },
  });
  window.dispatchEvent(event);
}

describe("authSync cross-tab", () => {
  beforeEach(() => {
    resetAuthSyncDedupeForTests();
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("indexedDB", {
      deleteDatabase: () => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onblocked: null as (() => void) | null,
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("receiving tab clears session storage and transitions to signed-out", () => {
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

    sessionStorage.setItem(TOKEN_STORAGE_KEY, "remote-tab-token");
    let handled = false;
    const remote = subscribeToAuthSync((message) => {
      if (message.type !== "logout") {
        return;
      }
      handled = true;
      applyRemoteLogout();
    });

    dispatchRemoteStorageLogout(`${Date.now()}:remote`);

    expect(handled).toBe(true);
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    remote();
  });

  it("sender does not handle its own logout broadcast", () => {
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

    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    let remoteHandling = 0;
    const unsubscribe = subscribeToAuthSync((message) => {
      if (message.type === "logout") {
        remoteHandling += 1;
        applyRemoteLogout();
      }
    });

    clearClientAuthState();

    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_LOGOUT_BROADCAST_KEY)).toBeNull();
    expect(remoteHandling).toBe(0);
    unsubscribe();
  });

  it("applyRemoteLogout does not re-broadcast", () => {
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
      dispatchEvent() {
        return true;
      },
    });

    sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
    let events = 0;
    const unsubscribe = subscribeToAuthSync(() => {
      events += 1;
    });

    applyRemoteLogout();
    broadcastAuthLogout(localStorage);

    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(events).toBe(0);
    unsubscribe();
  });

  it("dedupes repeated logout notifications with the same nonce", () => {
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

    let handled = 0;
    const unsubscribe = subscribeToAuthSync((message) => {
      if (message.type === "logout") {
        handled += 1;
      }
    });

    const nonce = `${Date.now()}:dup`;
    dispatchRemoteStorageLogout(nonce);
    dispatchRemoteStorageLogout(nonce);

    expect(handled).toBe(1);
    unsubscribe();
  });

  it("redirectAfterRemoteLogout uses registered navigate", () => {
    const navigate = vi.fn();
    registerAuthCrossTabNavigate(navigate);
    redirectAfterRemoteLogout();
    expect(navigate).toHaveBeenCalledWith("/sign-in", { replace: true });
    registerAuthCrossTabNavigate(null);
  });
});