import { resolveTelemetryEventAllowlist } from "./telemetry-allowlist.js";

export const TELEMETRY_MAX_BODY_BYTES = 8192;
export const TELEMETRY_MAX_EVENTS = 20;
export const TELEMETRY_PARAM_STRING_MAX = 100;
export const TELEMETRY_EVENT_NAME_MAX = 40;

const CLIENT_ID_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const EVENT_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;

export type TelemetryEvent = {
  name: string;
  params: Record<string, string | number | boolean>;
};

export type ParsedTelemetryBody = {
  client_id: string;
  events: TelemetryEvent[];
};

export type TelemetryValidationResult =
  | { ok: true; value: ParsedTelemetryBody }
  | { ok: false; error: string };

function isPrimitiveParam(value: unknown): value is string | number | boolean {
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

function normalizeParams(
  raw: unknown
): Record<string, string | number | boolean> | null {
  if (raw === undefined) {
    return {};
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!EVENT_NAME_RE.test(key)) {
      return null;
    }
    if (!isPrimitiveParam(value)) {
      return null;
    }
    if (typeof value === "string" && value.length > TELEMETRY_PARAM_STRING_MAX) {
      return null;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return null;
    }
    out[key] = value;
  }
  return out;
}

function parseEvent(raw: unknown): TelemetryEvent | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.name !== "string" || !EVENT_NAME_RE.test(record.name)) {
    return null;
  }
  if (record.name.length > TELEMETRY_EVENT_NAME_MAX) {
    return null;
  }
  const params = normalizeParams(record.params);
  if (params === null) {
    return null;
  }
  return { name: record.name, params };
}

export function validateTelemetryBody(rawText: string): TelemetryValidationResult {
  if (Buffer.byteLength(rawText, "utf8") > TELEMETRY_MAX_BODY_BYTES) {
    return { ok: false, error: "body_too_large" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "invalid_body" };
  }
  const body = parsed as Record<string, unknown>;
  if (typeof body.client_id !== "string" || !CLIENT_ID_RE.test(body.client_id)) {
    return { ok: false, error: "invalid_client_id" };
  }
  if (!Array.isArray(body.events)) {
    return { ok: false, error: "invalid_events" };
  }
  if (body.events.length === 0 || body.events.length > TELEMETRY_MAX_EVENTS) {
    return { ok: false, error: "invalid_events" };
  }
  const events: TelemetryEvent[] = [];
  for (const entry of body.events) {
    const event = parseEvent(entry);
    if (!event) {
      return { ok: false, error: "invalid_event" };
    }
    events.push(event);
  }
  return { ok: true, value: { client_id: body.client_id, events } };
}

export function filterAllowlistedEvents(
  events: TelemetryEvent[],
  allowlist = resolveTelemetryEventAllowlist()
): TelemetryEvent[] {
  return events.filter((event) => allowlist.has(event.name));
}