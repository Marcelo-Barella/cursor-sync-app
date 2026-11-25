import { serve } from "@hono/node-server";
import { createApp } from "./create-app.js";
import { logCorsStartup } from "./lib/cors.js";
import { assertJwtSecretConfigured, sessionExpiry } from "./lib/session.js";

try {
  assertJwtSecretConfigured();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

logCorsStartup();

const app = createApp();

const port = Number(process.env.PORT ?? 8100);

console.log(`API listening on :${port} (JWT expiry: ${sessionExpiry})`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
