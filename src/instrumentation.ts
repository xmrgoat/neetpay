export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("@/lib/env-check");
    validateEnvironment();

    // Start internal cron scheduler (self-hosted — no Vercel cron needed)
    if (process.env.ENABLE_CRON !== "false") {
      startCronScheduler();
    }
  }
}

function startCronScheduler() {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    console.warn("[cron] CRON_SECRET not set — skipping internal cron scheduler");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  async function callCron(path: string) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      if (!res.ok) {
        console.error(`[cron] ${path} failed: ${res.status}`);
      }
    } catch (err) {
      console.error(`[cron] ${path} error:`, err instanceof Error ? err.message : err);
    }
  }

  // Check payments (BTC/TRON/XMR/LTC/DOGE) — every 30s
  setInterval(() => callCron("/api/cron/check-payments"), 30_000);

  // Expire timed-out payments — every 60s
  setInterval(() => callCron("/api/cron/expire-payments"), 60_000);

  // Forward confirmed payments to merchant wallets — every 120s
  setInterval(() => callCron("/api/cron/forward-payments"), 120_000);

  // Retry failed webhooks — every 30s
  setInterval(() => callCron("/api/cron/retry-webhooks"), 30_000);

  // Update price cache — every 5 minutes
  setInterval(() => callCron("/api/cron/update-prices"), 300_000);

  console.log("[cron] Internal scheduler started (check: 30s, expire: 60s, forward: 120s, retry: 30s, prices: 5m)");
}
