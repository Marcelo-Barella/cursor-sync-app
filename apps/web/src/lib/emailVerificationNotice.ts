const STORAGE_KEY = "cursor-sync:email-verification-notice";

export type EmailVerificationNotice = {
  sent: boolean;
  warning?: string;
};

export function saveEmailVerificationNotice(notice: EmailVerificationNotice): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice));
}

export function readEmailVerificationNotice(): EmailVerificationNotice | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as EmailVerificationNotice;
    if (typeof parsed.sent !== "boolean") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearEmailVerificationNotice(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
