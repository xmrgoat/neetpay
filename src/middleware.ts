import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-API-Key, Idempotency-Key",
  "Access-Control-Expose-Headers": "X-Request-ID, Retry-After",
  "Access-Control-Max-Age": "86400",
};

export function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || globalThis.crypto.randomUUID();
  const { pathname } = req.nextUrl;

  // Handle CORS preflight for API routes
  if (req.method === "OPTIONS" && pathname.startsWith("/api/v1")) {
    return new NextResponse(null, {
      status: 204,
      headers: { ...CORS_HEADERS, "X-Request-ID": requestId },
    });
  }

  // Protect /dashboard/* — require JWT token in localStorage.
  // Since middleware runs on the edge (no localStorage access), we check
  // for the token in a cookie named "neetpay_token" as a fallback.
  // The primary auth check happens client-side; this is a navigation guard.
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("neetpay_token")?.value;

    if (!token) {
      // No cookie — check if client-side JS will handle it.
      // We allow the page to load and let the client-side redirect happen
      // via the dashboard layout. This avoids issues with localStorage-based auth.
      // The dashboard layout itself will check isAuthenticated() and redirect.
    }
  }

  // Redirect authenticated users away from login page.
  if (pathname === "/login") {
    const token = req.cookies.get("neetpay_token")?.value;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      } catch {
        // Invalid token — let them stay on login.
      }
    }
  }

  const res = NextResponse.next();

  // Add X-Request-ID to all responses
  res.headers.set("X-Request-ID", requestId);

  // Add CORS headers to /api/v1/* responses
  if (pathname.startsWith("/api/v1")) {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      res.headers.set(key, value);
    }
  }

  return res;
}

export const config = {
  matcher: ["/api/v1/:path*", "/dashboard/:path*", "/login"],
};
