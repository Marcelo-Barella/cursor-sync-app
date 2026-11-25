import { createHash } from "node:crypto";
import { Hono } from "hono";
import { clientIpFromForwarded } from "../lib/client-ip.js";
import { remoteAddressFromHonoContext } from "../lib/hono-remote-address.js";
import { verifySessionToken } from "../lib/session.js";
import { forwardTelemetryToGa4, isGa4Configured } from "../lib/telemetry-ga4.js";
import { checkTelemetryRateLimit } from "../lib/telemetry-rate-limit.js";
import {
  filterAllowlistedEvents,
  validateTelemetryBody,
} from "../lib/telemetry-validate.js";

export type TelemetryRouteDeps = {
  forwardTelemetry?: typeof forwardTelemetryToGa4;
};

function optionalUserIdHash(authorization: string | undefined): string | undefined {
  const header = authorization?.trim();
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifySessionToken(token);
    return createHash("sha256").update(payload.sub).digest("hex");
  } catch {
    return undefined;
  }
}

export function createTelemetryRoutes(deps: TelemetryRouteDeps = {}): Hono {
  const routes = new Hono();
  const sendToGa4 = deps.forwardTelemetry ?? forwardTelemetryToGa4;

  routes.post("/", async (c) => {
    const raw = await c.req.text();
    const parsed = validateTelemetryBody(raw);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const clientIp = clientIpFromForwarded(
      c.req.header("x-forwarded-for"),
      remoteAddressFromHonoContext(c)
    );
    const rate = checkTelemetryRateLimit(clientIp, parsed.value.client_id);
    if (!rate.allowed) {
      return c.json({ error: "rate_limited" }, 429, {
        "Retry-After": String(rate.retryAfterSeconds),
      });
    }

    const events = filterAllowlistedEvents(parsed.value.events);
    if (!isGa4Configured()) {
      await sendToGa4({ client_id: parsed.value.client_id, events: [] });
      return c.body(null, 204);
    }

    if (events.length === 0) {
      return c.body(null, 204);
    }

    const userIdHash = optionalUserIdHash(c.req.header("Authorization"));
    try {
      await sendToGa4({
        client_id: parsed.value.client_id,
        user_id: userIdHash,
        events,
      });
    } catch {
      /* never surface forwarding errors */
    }

    return c.body(null, 204);
  });

  return routes;
}

export const telemetryRoutes = createTelemetryRoutes();