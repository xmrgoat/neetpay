import { db } from "@/lib/db";
import { getGeoFromIp } from "./geo";

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
        ip: params.ip || null,
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
