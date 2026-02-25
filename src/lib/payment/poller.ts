import { pollActivePayments, expirePayments } from "./engine";

/**
 * Run a single polling cycle for payments that need checking.
 * This is called by the cron endpoint.
 */
export async function runPollingCycle(): Promise<{
  checked: number;
  updated: number;
  expired: number;
}> {
  const [pollResult, expiredCount] = await Promise.all([
    pollActivePayments(),
    expirePayments(),
  ]);

  return {
    checked: pollResult.checked,
    updated: pollResult.updated,
    expired: expiredCount,
  };
}
