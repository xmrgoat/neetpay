interface GeoData {
  country: string | null;
  city: string | null;
}

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^localhost$/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

/**
 * Get geolocation from IP using ip-api.com (free, 45 req/min).
 */
export async function getGeoFromIp(ip: string): Promise<GeoData> {
  if (!ip || isPrivateIp(ip)) {
    return { country: null, city: null };
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,city`,
      { signal: AbortSignal.timeout(3000) },
    );

    if (!res.ok) return { country: null, city: null };

    const data = await res.json();
    return {
      country: data.country || null,
      city: data.city || null,
    };
  } catch {
    return { country: null, city: null };
  }
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}
