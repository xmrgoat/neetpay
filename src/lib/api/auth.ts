// @ts-nocheck
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export type AuthResult = {
  userId: string;
  authMethod: "api_key" | "session";
  keyType?: "secret" | "publishable";
  scopes?: string[];
} | null;

/**
 * Validates an incoming request against API key or session auth.
 *
 * Resolution order:
 * 1. X-API-Key header
 * 2. Authorization: Bearer <key> header
 * 3. NextAuth session fallback
 *
 * On valid API key, updates lastUsed timestamp (fire-and-forget).
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthResult> {
  // 1. Check X-API-Key header
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) {
    return resolveApiKey(xApiKey);
  }

  // 2. Check Authorization: Bearer header
  const authorization = req.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      return resolveApiKey(match[1]);
    }
  }

  // 3. Fall back to NextAuth session
  try {
    const session = await auth();
    if (session?.user?.id) {
      return { userId: session.user.id, authMethod: "session" };
    }
  } catch {
    // Session resolution failed — treat as unauthenticated
  }

  return null;
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function resolveApiKey(key: string): Promise<AuthResult> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  const hash = hashApiKey(trimmed);
  const record = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true, type: true, scopes: true, expiresAt: true },
  });

  if (!record) return null;

  if (record.expiresAt && record.expiresAt < new Date()) {
    return null; // Key has expired
  }

  // Fire-and-forget lastUsed update
  db.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsed: new Date() },
    })
    .catch(() => {});

  return {
    userId: record.userId,
    authMethod: "api_key",
    keyType: (record.type as "secret" | "publishable") ?? "secret",
    scopes: record.scopes,
  };
}

export function assertScope(authResult: AuthResult, requiredScope: string): boolean {
  if (!authResult) return false;
  if (!authResult.scopes) return true; // session auth, no scope restriction
  return authResult.scopes.includes(requiredScope);
}
