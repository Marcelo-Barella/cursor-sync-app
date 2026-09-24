import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolveCorsOrigin } from "../lib/cors.js";
import { authRoutes } from "../routes/auth.js";
import { loginRoutes } from "../routes/login.js";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.route("/auth", authRoutes);
app.route("/", loginRoutes);
