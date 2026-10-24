export type ResendConfig = {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
};

export function readResendConfig(): ResendConfig {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim(),
    fromName: process.env.RESEND_FROM_NAME?.trim(),
  };
}

export function isResendConfigured(config: ResendConfig = readResendConfig()): boolean {
  return Boolean(config.apiKey && config.fromEmail);
}

export type SendVerificationEmailResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "send_failed" };

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  config?: ResendConfig;
}): Promise<SendVerificationEmailResult> {
  const config = params.config ?? readResendConfig();
  if (!isResendConfigured(config)) {
    console.error(
      "Email verification send skipped: RESEND_API_KEY and RESEND_FROM_EMAIL must be set"
    );
    return { ok: false, reason: "misconfigured" };
  }

  const from = config.fromName
    ? `${config.fromName} <${config.fromEmail}>`
    : config.fromEmail!;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: "Verify your Cursor Sync email",
      html: `<p>Confirm your email address for Cursor Sync.</p>
<p><a href="${params.verifyUrl}">Verify email</a></p>
<p>If the button does not work, copy this link:</p>
<p>${params.verifyUrl}</p>`,
    }),
  });

  if (!response.ok) {
    console.error(`Resend API returned ${response.status} for verification email`);
    return { ok: false, reason: "send_failed" };
  }

  return { ok: true };
}
