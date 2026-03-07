import { cookies } from "next/headers";

interface JwtPayload {
  merchant_id: string;
  email: string;
  exp: number;
  iat: number;
}

interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

/**
 * Server-side auth check — reads the JWT from the `neetpay_token` cookie,
 * decodes the payload, and returns a session-like object compatible with
 * the existing dashboard pages.
 *
 * Note: This does NOT verify the JWT signature (that's the backend's job).
 * It only extracts the claims for server-side rendering. The actual auth
 * verification happens when the frontend calls the Rust backend.
 */
export async function auth(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("neetpay_token")?.value;

  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as JwtPayload;

    // Check expiry.
    if (payload.exp * 1000 < Date.now()) return null;

    return {
      user: {
        id: payload.merchant_id,
        email: payload.email,
        name: null,
      },
    };
  } catch {
    return null;
  }
}
