import {
  isCse1ObjectStorageKey,
  isRelativePlaintextObjectKey,
} from "./plaintext-object-keys.js";

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

export function relativePlaintextKeysFromObjectList(
  prefix: string,
  contents: Array<{ Key?: string }>
): string[] {
  const keys: string[] = [];
  for (const object of contents) {
    if (!object.Key || !object.Key.startsWith(prefix)) {
      continue;
    }
    const relative = object.Key.slice(prefix.length);
    if (
      relative &&
      !isCse1ObjectStorageKey(relative) &&
      isRelativePlaintextObjectKey(relative)
    ) {
      keys.push(relative);
    }
  }
  return keys;
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
    keys.push(
      ...relativePlaintextKeysFromObjectList(prefix, page.Contents ?? [])
    );
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

type DeleteObjectsExecutor = (
  fullKeys: string[]
) => Promise<S3DeleteObjectsOutput>;

type HeadObjectChecker = (
  fullKey: string
) => Promise<"exists" | "missing" | "error">;

export async function deleteUserObjectsWithPrecheck(
  relativeKeys: string[],
  prefix: string,
  deps: {
    headObject: HeadObjectChecker;
    deleteObjects: DeleteObjectsExecutor;
  }
): Promise<PlaintextObjectDeleteResult[]> {
  const precoded = new Map<string, PlaintextObjectDeleteResult>();
  const toDeleteRelative: string[] = [];
  const toDeleteFull: string[] = [];

  for (const relativeKey of relativeKeys) {
    const fullKey = `${prefix}${relativeKey}`;
    const state = await deps.headObject(fullKey);
    if (state === "missing") {
      precoded.set(relativeKey, { key: relativeKey, status: "not_found" });
      continue;
    }
    if (state === "error") {
      precoded.set(relativeKey, {
        key: relativeKey,
        status: "failed",
        reason: "head_failed",
      });
      continue;
    }
    toDeleteRelative.push(relativeKey);
    toDeleteFull.push(fullKey);
  }

  const deletedByKey = new Map<string, PlaintextObjectDeleteResult>();
  if (toDeleteFull.length > 0) {
    const response = await deps.deleteObjects(toDeleteFull);
    for (const entry of mapDeleteObjectResults(
      toDeleteRelative,
      toDeleteFull,
      response
    )) {
      deletedByKey.set(entry.key, entry);
    }
  }

  return relativeKeys.map(
    (key) =>
      precoded.get(key) ??
      deletedByKey.get(key) ?? {
        key,
        status: "failed",
        reason: "delete_missing_result",
      }
  );
}

function isS3NotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const name = (err as { name?: string }).name;
  if (name === "NotFound" || name === "NoSuchKey") {
    return true;
  }
  const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  return status === 404;
}

export async function deleteUserObjectsDetailed(
  config: R2Config,
  userId: string,
  relativeKeys: string[]
): Promise<PlaintextObjectDeleteResult[]> {
  const { DeleteObjectsCommand, HeadObjectCommand } = await import(
    "@aws-sdk/client-s3"
  );
  const client = await createParentS3Client(config);
  const prefix = userObjectPrefix(userId);

  return deleteUserObjectsWithPrecheck(relativeKeys, prefix, {
    headObject: async (fullKey) => {
      try {
        await client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: fullKey })
        );
        return "exists";
      } catch (err) {
        if (isS3NotFoundError(err)) {
          return "missing";
        }
        return "error";
      }
    },
    deleteObjects: async (fullKeys) => {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: {
            Objects: fullKeys.map((Key) => ({ Key })),
            Quiet: false,
          },
        })
      );
      return response;
    },
  });
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
