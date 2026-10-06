export const E2E_IDB_NAME = "cursor-sync-e2e";
export const E2E_IDB_STORE = "derived-keys";

type DerivedKeyEntry = {
  dekVerifier: string;
  keyBytes: ArrayBuffer;
};

let unlockedKeysMemory: Map<string, DerivedKeyEntry> | null = null;

export function rememberUnlockedKey(
  dekVerifier: string,
  keyBytes: ArrayBuffer
): void {
  if (!unlockedKeysMemory) {
    unlockedKeysMemory = new Map();
  }
  unlockedKeysMemory.set(dekVerifier, { dekVerifier, keyBytes });
}

export function readUnlockedKeysMemory(): Map<string, DerivedKeyEntry> | null {
  return unlockedKeysMemory;
}

export function clearUnlockedKeysMemory(): void {
  unlockedKeysMemory = null;
}

export async function persistUnlockedKey(
  dekVerifier: string,
  keyBytes: ArrayBuffer
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    rememberUnlockedKey(dekVerifier, keyBytes);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(E2E_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(E2E_IDB_STORE)) {
        db.createObjectStore(E2E_IDB_STORE, { keyPath: "dekVerifier" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("idb open failed"));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(E2E_IDB_STORE, "readwrite");
      tx.objectStore(E2E_IDB_STORE).put({ dekVerifier, keyBytes });
      tx.oncomplete = () => {
        db.close();
        rememberUnlockedKey(dekVerifier, keyBytes);
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error("idb write failed"));
      };
    };
  });
}

export async function clearE2eKeyCache(): Promise<void> {
  clearUnlockedKeysMemory();
  if (typeof indexedDB === "undefined") {
    return;
  }
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(E2E_IDB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
