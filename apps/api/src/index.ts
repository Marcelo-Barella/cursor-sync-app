import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { pool } from "./db/pool.js";
import { authRoutes } from "./routes/auth.js";
import { sessionExpiry } from "./lib/session.js";

const app = new Hono();

app.get("/health", async (c) => {
  try {
    await pool.query("SELECT 1");
    return c.json({ status: "ok" });
  } catch {
    return c.json({ status: "error" }, 503);
  }
});

app.route("/auth", authRoutes);

const port = Number(process.env.PORT ?? 8100);

console.log(`API listening on :${port} (JWT expiry: ${sessionExpiry})`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
