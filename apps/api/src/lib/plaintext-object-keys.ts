const HMAC_HEX_KEY = /^[0-9a-f]{64}$/;

export function isRelativePlaintextObjectKey(key: string): boolean {
  if (!key || key.length > 512) {
    return false;
  }
  if (key.startsWith("/") || key.includes("..") || key.includes("\\")) {
    return false;
  }
  if (HMAC_HEX_KEY.test(key)) {
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
