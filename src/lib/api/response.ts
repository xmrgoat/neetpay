import { NextResponse } from "next/server";

const API_VERSION = "1.0";

interface ApiSuccessBody {
  data: unknown;
  message: string;
  error: null;
  status: number;
  version: string;
}

interface ApiErrorDetail {
  type: string;
  key: string;
  message: string;
}

interface ApiErrorBody {
  data: Record<string, never>;
  message: string;
  error: ApiErrorDetail;
  status: number;
  version: string;
}

/**
 * Returns a standardized success response.
 *
 * @example
 * ```ts
 * return apiSuccess({ trackId: "abc123" }, "Payment created");
 * // → { data: { trackId: "abc123" }, message: "Payment created", error: null, status: 200, version: "1.0" }
 * ```
 */
export function apiSuccess(
  data: unknown,
  message = "Success",
  status = 200
): NextResponse<ApiSuccessBody> {
  return NextResponse.json(
    {
      data,
      message,
      error: null,
      status,
      version: API_VERSION,
    },
    { status }
  );
}

/**
 * Returns a standardized error response.
 *
 * `errorKey` is a machine-readable slug (e.g. "invalid_currency").
 * If omitted, it is derived from the HTTP status code.
 *
 * @example
 * ```ts
 * return apiError(401, "Invalid API key", "auth_failed");
 * // → { data: {}, message: "Invalid API key", error: { type: "AuthError", key: "auth_failed", message: "Invalid API key" }, status: 401, version: "1.0" }
 * ```
 */
export function apiError(
  status: number,
  message: string,
  errorKey?: string,
  headers?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  const type = errorTypeFromStatus(status);
  const key = errorKey ?? errorKeyFromStatus(status);

  return NextResponse.json(
    {
      data: {},
      message,
      error: { type, key, message },
      status,
      version: API_VERSION,
    },
    { status, headers },
  );
}

// ── Internal helpers ────────────────────────────────────────────────────

function errorTypeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "ValidationError";
    case 401:
      return "AuthError";
    case 403:
      return "ForbiddenError";
    case 404:
      return "NotFoundError";
    case 409:
      return "ConflictError";
    case 422:
      return "UnprocessableError";
    case 429:
      return "RateLimitError";
    default:
      return status >= 500 ? "ServerError" : "ClientError";
  }
}

function errorKeyFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "unprocessable";
    case 429:
      return "rate_limited";
    default:
      return status >= 500 ? "server_error" : "unknown_error";
  }
}
