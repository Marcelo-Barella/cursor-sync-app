import type { PlaintextObjectDeleteResult } from "./r2.js";

export function plaintextDeleteHttpStatus(
  results: PlaintextObjectDeleteResult[]
): 200 | 502 {
  return results.some((entry) => entry.status === "failed") ? 502 : 200;
}
