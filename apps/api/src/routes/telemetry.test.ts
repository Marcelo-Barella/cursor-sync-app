import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSessionToken } from "../lib/session.js";
import {
  forwardTelemetryToGa4,
  readGa4Config,
  resetGa4TelemetryState,
} from "../lib/telemetry-ga4.js";
import { resetTelemetryRateLimits } from "../lib/telemetry-rate-limit.js";
import { TELEMETRY_MAX_BODY_BYTES } from "../lib/telemetry-validate.js";
import { createTelemetryRoutes } from "./telemetry.js";

const TEST_SECRET = "telemetry-test-jwt-secret-with-enough-entropy";
const TEST_GA4_SECRET = "test-ga4-api-secret-value";

function telemetryApp(forwardTelemetry = forwardTelemetryToGa4) {
  return createTelemetryRoutes({ forwardTelemetry });
}

function postTelemetry(
  app: ReturnType<typeof createTelemetryRoutes>,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /v1/telemetry", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.GA4_MEASUREMENT_ID;
    delete process.env.GA4_API_SECRET;
    delete process.env.TELEMETRY_EVENT_ALLOWLIST;
    resetTelemetryRateLimits();
    resetGa4TelemetryState();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.GA4_MEASUREMENT_ID;
    delete process.env.GA4_API_SECRET;
    delete process.env.TELEMETRY_EVENT_ALLOWLIST;
    resetTelemetryRateLimits();
    resetGa4TelemetryState();
  });

  it("returns 204 when GA4 env is unset without surfacing errors", async () => {
    const logs: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const app = telemetryApp();
      const response = await postTelemetry(app, {
        client_id: "client.test.1",
        events: [{ name: "page_view", params: { page_path: "/" } }],
      });
      assert.equal(response.status, 204);
      const text = await response.text();
      assert.equal(text, "");
      assert.ok(!text.includes(TEST_GA4_SECRET));
      assert.ok(logs.every((line) => !line.includes(TEST_GA4_SECRET)));
    } finally {
      console.info = originalInfo;
    }
  });

  it("drops non-allowlisted events", async () => {
    let forwardedEvents: string[] | undefined;
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.GA4_API_SECRET = TEST_GA4_SECRET;
    process.env.TELEMETRY_EVENT_ALLOWLIST = "page_view";

    const app = telemetryApp(async (payload) => {
      forwardedEvents = payload.events.map((e) => e.name);
    });

    await postTelemetry(app, {
      client_id: "client.test.2",
      events: [
        { name: "page_view", params: {} },
        { name: "cta_click", params: {} },
      ],
    });

    assert.deepEqual(forwardedEvents, ["page_view"]);
  });

  it("returns 400 for invalid client_id, body size, and nested params", async () => {
    const app = telemetryApp();
    const badClient = await postTelemetry(app, {
      client_id: "not valid!",
      events: [{ name: "page_view" }],
    });
    assert.equal(badClient.status, 400);

    const nested = await postTelemetry(app, {
      client_id: "ok.client",
      events: [{ name: "page_view", params: { nested: { a: 1 } } }],
    });
    assert.equal(nested.status, 400);

    const huge = "x".repeat(TELEMETRY_MAX_BODY_BYTES + 50);
    const bigBody = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "ok.client",
        events: [{ name: "page_view", params: { blob: huge } }],
      }),
    });
    assert.equal(bigBody.status, 400);
  });

  it("returns 429 after 60 requests per client_id within a minute", async () => {
    const app = telemetryApp();
    let lastStatus = 0;
    for (let i = 0; i < 61; i += 1) {
      const response = await postTelemetry(app, {
        client_id: "rate-limit-client",
        events: [{ name: "page_view" }],
      });
      lastStatus = response.status;
    }
    assert.equal(lastStatus, 429);
  });

  it("never returns the GA4 api secret to clients", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST456";
    process.env.GA4_API_SECRET = TEST_GA4_SECRET;

    let fetchUrl = "";
    const app = telemetryApp(async (payload, config, fetchImpl) => {
      const mockFetch: typeof fetch = async (input) => {
        fetchUrl = String(input);
        return new Response(null, { status: 204 });
      };
      await forwardTelemetryToGa4(payload, config ?? readGa4Config(), mockFetch);
    });

    const response = await postTelemetry(app, {
      client_id: "client.secret.test",
      events: [{ name: "page_view" }],
    });
    const body = await response.text();
    assert.equal(response.status, 204);
    assert.ok(fetchUrl.includes("api_secret="));
    assert.ok(!body.includes(TEST_GA4_SECRET));
  });

  it("attaches hashed user_id when a valid session bearer is present", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST789";
    process.env.GA4_API_SECRET = TEST_GA4_SECRET;
    const userId = "00000000-0000-4000-8000-000000000099";
    const email = "telemetry-user@example.com";
    const token = createSessionToken(userId, email);

    let capturedUserId: string | undefined;
    const app = telemetryApp(async (payload) => {
      capturedUserId = payload.user_id;
    });

    await postTelemetry(
      app,
      {
        client_id: "client.auth",
        events: [{ name: "login" }],
      },
      { Authorization: `Bearer ${token}` }
    );

    assert.ok(capturedUserId);
    assert.notEqual(capturedUserId, email);
    assert.notEqual(capturedUserId, userId);
    assert.equal(capturedUserId!.length, 64);
  });
});