import { isRelativePlaintextObjectKey } from "./plaintext-object-keys.js";

export type R2Config = {
  accountId: string;
  bucket: string;
  parentAccessKeyId: string;
  parentSecretAccessKey: string;
  apiToken: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const parentAccessKeyId = process.env.R2_PARENT_ACCESS_KEY_ID?.trim();
  const parentSecretAccessKey = process.env.R2_PARENT_SECRET_ACCESS_KEY?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (
    !accountId ||
    !bucket ||
    !parentAccessKeyId ||
    !parentSecretAccessKey ||
    !apiToken
  ) {
    return null;
  }

  return {
    accountId,
    bucket,
    parentAccessKeyId,
    parentSecretAccessKey,
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

export type PlaintextObjectDeleteStatus = "deleted" | "not_found" | "failed";

export type PlaintextObjectDeleteResult = {
  key: string;
  status: PlaintextObjectDeleteStatus;
  reason?: string;
};

function userObjectPrefix(userId: string): string {
  return `users/${userId}/`;
}

async function createParentS3Client(config: R2Config) {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.parentAccessKeyId,
      secretAccessKey: config.parentSecretAccessKey,
    },
  });
}

export async function listPlaintextUserObjects(
  config: R2Config,
  userId: string
): Promise<string[]> {
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const client = await createParentS3Client(config);
  const prefix = userObjectPrefix(userId);
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of page.Contents ?? []) {
      if (!object.Key) {
        continue;
      }
      const relative = object.Key.slice(prefix.length);
      if (relative && isRelativePlaintextObjectKey(relative)) {
        keys.push(relative);
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys.sort();
}

type S3DeleteObjectsOutput = {
  Deleted?: Array<{ Key?: string }>;
  Errors?: Array<{ Key?: string; Code?: string; Message?: string }>;
};

export function mapDeleteObjectResults(
  relativeKeys: string[],
  objectKeys: string[],
  response: S3DeleteObjectsOutput
): PlaintextObjectDeleteResult[] {
  const deleted = new Set(
    (response.Deleted ?? [])
      .map((entry) => entry.Key)
      .filter((key): key is string => Boolean(key))
  );
  const errors = new Map<string, string>();
  for (const err of response.Errors ?? []) {
    if (err.Key) {
      errors.set(err.Key, err.Code ?? err.Message ?? "delete_failed");
    }
  }

  return relativeKeys.map((relativeKey, index) => {
    const fullKey = objectKeys[index]!;
    if (deleted.has(fullKey)) {
      return { key: relativeKey, status: "deleted" as const };
    }
    const reason = errors.get(fullKey);
    if (reason) {
      const code = reason.toLowerCase();
      if (code.includes("nosuchkey") || code.includes("not found")) {
        return { key: relativeKey, status: "not_found" as const };
      }
      return { key: relativeKey, status: "failed" as const, reason };
    }
    return { key: relativeKey, status: "not_found" as const };
  });
}

export async function deleteUserObjectsDetailed(
  config: R2Config,
  userId: string,
  relativeKeys: string[]
): Promise<PlaintextObjectDeleteResult[]> {
  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  const client = await createParentS3Client(config);
  const prefix = userObjectPrefix(userId);
  const objectKeys = relativeKeys.map((key) => `${prefix}${key}`);

  const response = await client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: objectKeys.map((Key) => ({ Key })),
        Quiet: false,
      },
    })
  );

  return mapDeleteObjectResults(relativeKeys, objectKeys, response);
}

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
      parentAccessKeyId: config.parentAccessKeyId,
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
