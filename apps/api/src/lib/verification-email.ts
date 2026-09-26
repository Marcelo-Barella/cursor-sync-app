import type { Pool } from "pg";
import {
  generateEmailVerificationToken,
  insertEmailVerificationToken,
} from "./email-verification.js";
import { buildEmailVerificationLink } from "./public-web-origin.js";
import { sendVerificationEmail } from "./resend.js";

export type VerificationEmailOutcome = {
  sent: boolean;
  warning?: string;
};

export async function issueAndSendVerificationEmail(
  pool: Pool,
  userId: string,
  email: string
): Promise<VerificationEmailOutcome> {
  const rawToken = generateEmailVerificationToken();
  await insertEmailVerificationToken(pool, userId, rawToken);

  const verifyUrl = buildEmailVerificationLink(rawToken);
  if (!verifyUrl) {
    console.error(
      "Email verification link not built: set PUBLIC_WEB_ORIGIN or WEB_ORIGIN"
    );
    return {
      sent: false,
      warning: "Verification email is not configured (missing website origin).",
    };
  }

  const result = await sendVerificationEmail({ to: email, verifyUrl });
  if (result.ok) {
    return { sent: true };
  }

  if (result.reason === "misconfigured") {
    return {
      sent: false,
      warning: "Verification email is not configured on the server.",
    };
  }

  return {
    sent: false,
    warning: "We could not send the verification email. Try again later.",
  };
}
