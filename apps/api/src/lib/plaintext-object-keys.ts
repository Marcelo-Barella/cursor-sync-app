const HMAC_HEX_KEY = /^[0-9a-f]{64}$/;

/** Object keys for CSE1 ciphertext blobs in R2 (content-addressed). */
export function isCse1ObjectStorageKey(key: string): boolean {
  return HMAC_HEX_KEY.test(key);
}

export function isRelativePlaintextObjectKey(key: string): boolean {
  if (!key || key.length > 512) {
    return false;
  }
  if (key.startsWith("/") || key.includes("..") || key.includes("\\")) {
    return false;
  }
  if (isCse1ObjectStorageKey(key)) {
    return false;
  }
  return /^[\w./-]+$/.test(key);
}

export function filterPlaintextObjectKeys(keys: string[]): string[] | null {
  const unique = [...new Set(keys)];
  for (const key of unique) {
    if (!isRelativePlaintextObjectKey(key)) {
      return null;
    }
  }
  return unique;
}
