/**
 * In-memory sliding-window rate limiter.
 * No external dependencies — uses a Map of timestamp arrays.
 * Expired entries are pruned on every call + periodic sweep.
 */

interface RateLimitOptions {
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets for the oldest request. */
  resetAt: number;
}

type Limiter = (identifier: string) => RateLimitResult;

/** Interval between full sweeps of stale entries (60 s). */
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Creates a rate limiter function bound to the given options.
 *
 * @example
 * ```ts
 * const limit = rateLimit({ maxRequests: 100, windowMs: 60_000 });
 * const result = limit(userId);
 * if (!result.success) return apiError(429, "Rate limit exceeded");
 * ```
 */
export function rateLimit(options: RateLimitOptions): Limiter {
  const { maxRequests, windowMs } = options;
  const store = new Map<string, number[]>();

  // Periodic sweep: drop keys whose newest timestamp is older than the window
  const interval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of store) {
      // Filter in-window timestamps
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Let the process exit even if the interval is still active
  if (typeof interval === "object" && "unref" in interval) {
    interval.unref();
  }

  return function check(identifier: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Get existing timestamps and prune expired ones
    const existing = store.get(identifier) ?? [];
    const valid = existing.filter((t) => t > cutoff);

    if (valid.length >= maxRequests) {
      // Denied — window is full
      const oldestInWindow = valid[0];
      return {
        success: false,
        remaining: 0,
        resetAt: oldestInWindow + windowMs,
      };
    }

    // Allowed — record this request
    valid.push(now);
    store.set(identifier, valid);

    return {
      success: true,
      remaining: maxRequests - valid.length,
      resetAt: valid[0] + windowMs,
    };
  };
}

// ── Pre-configured limiters ─────────────────────────────────────────────

/** 100 req/min for authenticated (API key or session) requests. */
export const authenticatedLimiter = rateLimit({
  maxRequests: 100,
  windowMs: 60_000,
});

/** 60 req/min for unauthenticated / IP-based requests. */
export const unauthenticatedLimiter = rateLimit({
  maxRequests: 60,
  windowMs: 60_000,
});
