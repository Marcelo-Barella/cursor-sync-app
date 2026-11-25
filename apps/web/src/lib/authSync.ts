export const AUTH_BROADCAST_CHANNEL = "cursor-sync-auth";

export const AUTH_LOGOUT_BROADCAST_KEY = "cursor-sync-auth-logout-broadcast";

export type AuthBroadcastMessage =
  | { type: "logout"; nonce: string }
  | { type: "login"; nonce: string };

export type AuthCrossTabNavigate = (
  path: string,
  options?: { replace?: boolean }
) => void;

const TAB_INSTANCE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

let lastHandledNonce: string | null = null;
let registeredNavigate: AuthCrossTabNavigate | null = null;

export function registerAuthCrossTabNavigate(
  navigate: AuthCrossTabNavigate | null
): void {
  registeredNavigate = navigate;
}

function createNonce(): string {
  return `${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function parseBroadcastPayload(raw: string | null): AuthBroadcastMessage | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthBroadcastMessage;
    if (
      parsed &&
      (parsed.type === "logout" || parsed.type === "login") &&
      typeof parsed.nonce === "string"
    ) {
      return parsed;
    }
  } catch {
    const legacy = raw.trim();
    if (/^\d+$/.test(legacy)) {
      return { type: "logout", nonce: legacy };
    }
  }
  return null;
}

function shouldHandleMessage(message: AuthBroadcastMessage): boolean {
  if (message.nonce === lastHandledNonce) {
    return false;
  }
  lastHandledNonce = message.nonce;
  return true;
}

function emitMessage(message: AuthBroadcastMessage): void {
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.postMessage({ ...message, sourceTabId: TAB_INSTANCE_ID });
      channel.close();
    } catch {
      // ignore
    }
  }
}

function writeLocalStorageBroadcast(
  message: AuthBroadcastMessage,
  storage: Storage
): void {
  storage.setItem(AUTH_LOGOUT_BROADCAST_KEY, JSON.stringify(message));
  storage.removeItem(AUTH_LOGOUT_BROADCAST_KEY);
}

export function broadcastAuthLogout(storage?: Storage): void {
  const message: AuthBroadcastMessage = { type: "logout", nonce: createNonce() };
  emitMessage(message);
  const target =
    storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (target) {
    writeLocalStorageBroadcast(message, target);
  }
}

export function broadcastAuthLogin(storage?: Storage): void {
  const message: AuthBroadcastMessage = { type: "login", nonce: createNonce() };
  emitMessage(message);
  const target =
    storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  if (target) {
    writeLocalStorageBroadcast(message, target);
  }
}

export type AuthSyncListener = (event: AuthBroadcastMessage) => void;

export function subscribeToAuthSync(listener: AuthSyncListener): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleMessage = (message: AuthBroadcastMessage, sourceTabId?: string) => {
    if (sourceTabId === TAB_INSTANCE_ID) {
      return;
    }
    if (!shouldHandleMessage(message)) {
      return;
    }
    listener(message);
  };

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.addEventListener("message", (event: MessageEvent) => {
        const data = event.data as AuthBroadcastMessage & { sourceTabId?: string };
        if (!data || (data.type !== "logout" && data.type !== "login")) {
          return;
        }
        handleMessage(data, data.sourceTabId);
      });
    } catch {
      channel = null;
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_LOGOUT_BROADCAST_KEY || event.newValue === null) {
      return;
    }
    const message = parseBroadcastPayload(event.newValue);
    if (message) {
      handleMessage(message);
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

export function redirectAfterRemoteLogout(): void {
  if (registeredNavigate) {
    registeredNavigate("/sign-in", { replace: true });
    return;
  }
  if (typeof window !== "undefined") {
    window.location.replace("/sign-in");
  }
}

export function resetAuthSyncDedupeForTests(): void {
  lastHandledNonce = null;
}