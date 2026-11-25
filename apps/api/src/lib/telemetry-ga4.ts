import type { TelemetryEvent } from "./telemetry-validate.js";

export type Ga4TelemetryPayload = {
  client_id: string;
  user_id?: string;
  events: TelemetryEvent[];
};

export type Ga4Config = {
  measurementId?: string;
  apiSecret?: string;
};

let loggedMissingGa4 = false;

export function readGa4Config(): Ga4Config {
  return {
    measurementId: process.env.GA4_MEASUREMENT_ID?.trim(),
    apiSecret: process.env.GA4_API_SECRET?.trim(),
  };
}

export function isGa4Configured(config: Ga4Config = readGa4Config()): boolean {
  return Boolean(config.measurementId && config.apiSecret);
}

export function logGa4MissingOnce(): void {
  if (loggedMissingGa4) {
    return;
  }
  loggedMissingGa4 = true;
  console.info(
    JSON.stringify({
      event: "telemetry_ga4_unconfigured",
      message: "GA4_MEASUREMENT_ID and GA4_API_SECRET unset; telemetry dropped",
      ts: new Date().toISOString(),
    })
  );
}

export function resetGa4TelemetryState(): void {
  loggedMissingGa4 = false;
}

export async function forwardTelemetryToGa4(
  payload: Ga4TelemetryPayload,
  config: Ga4Config = readGa4Config(),
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  if (!isGa4Configured(config)) {
    logGa4MissingOnce();
    return;
  }
  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", config.measurementId!);
  url.searchParams.set("api_secret", config.apiSecret!);

  await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: payload.client_id,
      ...(payload.user_id ? { user_id: payload.user_id } : {}),
      events: payload.events.map((event) => ({
        name: event.name,
        params: event.params,
      })),
    }),
  });
}