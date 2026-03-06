/**
 * Validates critical environment variables at startup.
 * Throws with a clear message if anything is missing.
 * Call this from instrumentation.ts or a server component.
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  // Critical — app won't function without these
  const critical = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "FIELD_ENCRYPTION_KEY",
  ];

  // Optional but recommended
  const recommended = [
    "ALCHEMY_API_KEY",
    "CRON_SECRET",
  ];

  // Check critical
  for (const key of critical) {
    if (!process.env[key]) errors.push(`Missing critical env: ${key}`);
  }

  // Check wallet (warn if DEV_MNEMONIC is being used in production)
  if (!process.env.ENCRYPTED_SEED && !process.env.DEV_MNEMONIC) {
    errors.push("Missing wallet config: set ENCRYPTED_SEED or DEV_MNEMONIC");
  }
  if (process.env.NODE_ENV === "production" && process.env.DEV_MNEMONIC) {
    errors.push("SECURITY: DEV_MNEMONIC must not be used in production! Use ENCRYPTED_SEED instead.");
  }
  if (process.env.ENCRYPTED_SEED && !process.env.SEED_ENCRYPTION_KEY) {
    errors.push("Missing SEED_ENCRYPTION_KEY (required to decrypt ENCRYPTED_SEED)");
  }

  // Warn for recommended
  for (const key of recommended) {
    if (!process.env[key]) {
      console.warn(`[env] Warning: ${key} is not set`);
    }
  }

  if (errors.length > 0) {
    const msg = [
      "",
      "======================================",
      "  ENVIRONMENT CONFIGURATION ERROR     ",
      "======================================",
      "",
      ...errors.map(e => `  x ${e}`),
      "",
      "Fix the above and restart the server.",
      "",
    ].join("\n");
    throw new Error(msg);
  }

  console.log("[env] Environment validated");
}
