export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("@/lib/env-check");
    validateEnvironment();
    // Cron jobs are now handled by the Rust backend workers.
  }
}
