export type R2Config = {
  accountId: string;
  bucket: string;
  apiToken: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!accountId || !bucket || !apiToken) {
    return null;
  }

  return {
    accountId,
    bucket,
    apiToken,
  };
}

type CloudflareTempCredentialResponse = {
  success: boolean;
  result?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  };
  errors?: Array<{ message?: string }>;
};

export type MintedCredentials = {
  endpoint: string;
  bucket: string;
  region: "auto";
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiresAt: string;
};

export async function mintTempCredentials(
  config: R2Config,
  userId: string,
  ttlSeconds: number
): Promise<MintedCredentials> {
  const prefix = `users/${userId}/`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/temp-access-credentials`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucket: config.bucket,
      permission: "object-read-write",
      ttlSeconds,
      prefixes: [prefix],
    }),
  });

  const payload = (await response.json()) as CloudflareTempCredentialResponse;

  if (!response.ok || !payload.success || !payload.result) {
    const message =
      payload.errors?.[0]?.message ?? "Failed to mint R2 credentials";
    throw new Error(message);
  }

  const { accessKeyId, secretAccessKey, sessionToken } = payload.result;

  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    throw new Error("Incomplete R2 credential response");
  }

  return {
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    bucket: config.bucket,
    region: "auto",
    prefix,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}
