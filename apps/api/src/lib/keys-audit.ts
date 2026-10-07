export type KeyMaterialAuditOperation = "keys_put" | "keys_rewrap" | "keys_recovery";

/**
 * Structured audit log for key-material mutations (no key bytes).
 * DB persistence requires DBA-owned schema extension; see PR / migration request.
 */
export function auditLogKeyMaterialMutation(
  operation: KeyMaterialAuditOperation,
  userId: string,
  ip: string | null,
  status: number
): void {
  console.info(
    JSON.stringify({
      event: "key_material_mutation",
      operation,
      userId,
      ip,
      status,
      ts: new Date().toISOString(),
    })
  );
}
