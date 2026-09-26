const RESEND_COOLDOWN_MS = 60_000;
const lastSentByUserId = new Map<string, number>();

export function canResendVerification(userId: string, now = Date.now()): boolean {
  const last = lastSentByUserId.get(userId);
  if (last === undefined) {
    return true;
  }
  return now - last >= RESEND_COOLDOWN_MS;
}

export function markVerificationResent(userId: string, now = Date.now()): void {
  lastSentByUserId.set(userId, now);
}

export function resetResendRateLimit(): void {
  lastSentByUserId.clear();
}
