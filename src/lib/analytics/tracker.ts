import { db } from "@/lib/db";
import { getGeoFromIp } from "./geo";

function truncateIp(ip: string): string {
  // IPv4: remove last octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  // IPv6: remove last 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  }
  return ip;
}

interface TrackEventParams {
  userId: string;
  type: "payment_view" | "payment_created" | "payment_paid" | "link_click";
  paymentId?: string;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Track an analytics event. Fire-and-forget — never throws.
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const geo = params.ip ? await getGeoFromIp(params.ip) : { country: null, city: null };

    await db.analyticsEvent.create({
      data: {
        userId: params.userId,
        type: params.type,
        paymentId: params.paymentId,
        ip: params.ip ? truncateIp(params.ip) : null,
        country: geo.country,
        city: geo.city,
        userAgent: params.userAgent || null,
        referrer: params.referrer || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[analytics] Failed to track event:", err);
  }
}
