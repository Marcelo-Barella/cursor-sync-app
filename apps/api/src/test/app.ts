import { Hono } from "hono";
import { authRoutes } from "../routes/auth.js";

export const app = new Hono();

app.route("/auth", authRoutes);
