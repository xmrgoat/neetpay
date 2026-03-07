const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "neetpay_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // Also set as cookie so server components / middleware can read it.
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getMerchantId(): string | null {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.merchant_id || null;
  } catch {
    return null;
  }
}

export async function getMerchant() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network errors on logout.
    }
  }
  clearToken();
  window.location.href = "/login";
}

export async function requestMagicLink(email: string): Promise<{ ok: boolean; session_code?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/v1/auth/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || "Something went wrong" };
    }

    const data = await res.json();
    return { ok: true, session_code: data.session_code };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function verifyMagicLink(
  token: string,
  email: string
): Promise<{ ok: boolean; jwt?: string; merchant_id?: string; is_new?: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${API_URL}/v1/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || "Invalid or expired link" };
    }

    const data = await res.json();
    setToken(data.token);
    return { ok: true, jwt: data.token, merchant_id: data.merchant_id, is_new: data.is_new };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

/** Poll for cross-device magic link authentication. */
export async function pollMagicLink(
  sessionCode: string
): Promise<{ status: "pending" | "authenticated"; token?: string; merchant_id?: string; is_new?: boolean }> {
  try {
    const res = await fetch(
      `${API_URL}/v1/auth/poll?session_code=${encodeURIComponent(sessionCode)}`
    );
    if (!res.ok) return { status: "pending" };
    return res.json();
  } catch {
    return { status: "pending" };
  }
}

/** Helper for authenticated fetch calls to the backend API. */
export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}
