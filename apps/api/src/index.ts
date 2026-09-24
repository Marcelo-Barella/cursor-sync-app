import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { pingDatabase } from "./db/pool.js";
import { authRoutes } from "./routes/auth.js";
import { configsRoutes } from "./routes/configs.js";
import { loginRoutes } from "./routes/login.js";
import { storageRoutes } from "./routes/storage.js";
import { resolveCorsOrigin } from "./lib/cors.js";
import { assertJwtSecretConfigured, sessionExpiry } from "./lib/session.js";

try {
  assertJwtSecretConfigured();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", async (c) => {
  try {
    await pingDatabase();
    return c.json({ status: "ok" });
  } catch {
    return c.json({ status: "error" }, 503);
  }
});

app.route("/auth", authRoutes);
app.route("/configs", configsRoutes);
app.route("/v1/storage", storageRoutes);
app.route("/", loginRoutes);

const port = Number(process.env.PORT ?? 8100);

console.log(`API listening on :${port} (JWT expiry: ${sessionExpiry})`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
