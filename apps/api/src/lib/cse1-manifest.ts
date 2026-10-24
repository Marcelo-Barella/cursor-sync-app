export const CSE1_MAGIC = Buffer.from("CSE1", "ascii");
export const MIN_CSE1_ENVELOPE_BYTES = 36;

export function isValidCse1Envelope(buf: Buffer): boolean {
  if (buf.length < MIN_CSE1_ENVELOPE_BYTES) {
    return false;
  }
  return buf.subarray(0, 4).equals(CSE1_MAGIC);
}

export function decodeManifestCiphertextBase64(encoded: string): Buffer {
  const buf = Buffer.from(encoded, "base64");
  if (!isValidCse1Envelope(buf)) {
    throw new Error("Invalid CSE1 manifest envelope");
  }
  return buf;
}

export function minimalCse1EnvelopeForTests(): Buffer {
  const buf = Buffer.alloc(MIN_CSE1_ENVELOPE_BYTES, 0);
  CSE1_MAGIC.copy(buf, 0);
  buf.writeUInt32BE(1, 4);
  return buf;
}
