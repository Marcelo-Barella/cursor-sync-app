import { isRelativePlaintextObjectKey } from "./plaintext-object-keys.js";

export const E2E_REQUIRED_MESSAGE =
  "End-to-end encryption is required for this account. Update the Cursor Sync extension to continue syncing.";

export function legacyObjectKeysFromPayload(
  payload: Record<string, unknown>
): string[] {
  const paths = payload.paths;
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    return [];
  }
  return Object.keys(paths as Record<string, unknown>).filter((key) =>
    isRelativePlaintextObjectKey(key)
  );
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
