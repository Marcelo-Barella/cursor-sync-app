import { readToken } from "./auth";

export const AUTH_STATE_CHANGED_EVENT = "cursor-sync-auth-state-changed";

let memoryToken: string | null = null;
let memoryEmail: string | null = null;

export function getMemorySessionToken(): string | null {
  return memoryToken;
}

export function getMemorySessionEmail(): string | null {
  return memoryEmail;
}

export function syncMemorySessionFromStorage(): void {
  memoryToken = readToken();
  if (!memoryToken) {
    memoryEmail = null;
  }
}

export function setMemorySession(token: string, email: string | null): void {
  memoryToken = token;
  memoryEmail = email;
  notifyAuthStateChanged();
}

export function clearMemorySession(): void {
  memoryToken = null;
  memoryEmail = null;
  notifyAuthStateChanged();
}

export function notifyAuthStateChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}
