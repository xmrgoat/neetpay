import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-API-Key, Idempotency-Key",
  "Access-Control-Expose-Headers": "X-Request-ID, Retry-After",
  "Access-Control-Max-Age": "86400",
};

export function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  // Handle CORS preflight for API routes
  if (req.method === "OPTIONS" && req.nextUrl.pathname.startsWith("/api/v1")) {
    return new NextResponse(null, {
      status: 204,
      headers: { ...CORS_HEADERS, "X-Request-ID": requestId },
    });
  }

  const res = NextResponse.next();

  // Add X-Request-ID to all responses
  res.headers.set("X-Request-ID", requestId);

  // Add CORS headers to /api/v1/* responses
  if (req.nextUrl.pathname.startsWith("/api/v1")) {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      res.headers.set(key, value);
    }
  }

  return res;
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
