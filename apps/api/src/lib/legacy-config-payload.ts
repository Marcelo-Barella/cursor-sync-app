import { isRelativePlaintextObjectKey } from "./plaintext-object-keys.js";

export const E2E_REQUIRED_MESSAGE =
  "End-to-end encryption is required for this account. Update the Cursor Sync extension to continue syncing.";

function legacyFileIndexFromPayload(
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  const files = payload.files;
  if (files && typeof files === "object" && !Array.isArray(files)) {
    return files as Record<string, unknown>;
  }
  const paths = payload.paths;
  if (paths && typeof paths === "object" && !Array.isArray(paths)) {
    return paths as Record<string, unknown>;
  }
  return null;
}

export function legacyObjectKeysFromPayload(
  payload: Record<string, unknown>
): string[] {
  const index = legacyFileIndexFromPayload(payload);
  if (!index) {
    return [];
  }
  return Object.keys(index)
    .filter((key) => isRelativePlaintextObjectKey(key))
    .sort();
}

export function isLegacyPlaintextPayloadWrite(
  payload: Record<string, unknown> | undefined
): boolean {
  if (payload === undefined) {
    return false;
  }
  if (Object.keys(payload).length === 0) {
    return false;
  }
  return true;
}
