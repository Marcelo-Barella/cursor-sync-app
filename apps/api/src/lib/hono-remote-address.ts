import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { normalizeIpAddress } from "./client-ip.js";

type NodeIncomingEnv = {
  server?: { incoming?: { socket?: { remoteAddress?: string } } };
  incoming?: { socket?: { remoteAddress?: string } };
};

export function remoteAddressFromHonoContext(c: Context): string | null {
  const env = c.env as NodeIncomingEnv;
  const fromBindings =
    env?.server?.incoming?.socket?.remoteAddress ??
    env?.incoming?.socket?.remoteAddress;
  if (fromBindings) {
    return normalizeIpAddress(fromBindings);
  }

  try {
    return normalizeIpAddress(getConnInfo(c).remote.address);
  } catch {
    return null;
  }
}
