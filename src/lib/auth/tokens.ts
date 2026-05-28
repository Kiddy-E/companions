import crypto from "crypto";
import { db } from "@/lib/db";

export const ALL_SCOPES = [
  "pets:read",
  "pets:write",
  "events:read",
  "events:write",
  "vaccines:read",
  "vaccines:write",
] as const;

export type Scope = (typeof ALL_SCOPES)[number];

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createApiToken(
  userId: string,
  name: string,
  scopes: Scope[],
  expiresAt?: Date
): Promise<{ token: string; prefix: string }> {
  const rawToken = `cmp_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawToken.substring(0, 12);
  const tokenHash = hashToken(rawToken);

  await db.apiToken.create({
    data: { userId, name, tokenHash, prefix, scopes, expiresAt },
  });

  return { token: rawToken, prefix };
}

export async function verifyApiToken(
  rawToken: string
): Promise<{ userId: string; scopes: string[] } | null> {
  const tokenHash = hashToken(rawToken);
  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!apiToken) return null;
  if (apiToken.revokedAt) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  // Update lastUsedAt without blocking response
  db.apiToken
    .update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { userId: apiToken.userId, scopes: apiToken.scopes };
}

export function hasScope(scopes: string[], required: Scope): boolean {
  return scopes.includes(required);
}
