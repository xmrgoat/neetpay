export function validateEnvironment(): void {
  const errors: string[] = [];

  const critical = [
    "DATABASE_URL",
    "AUTH_SECRET",
  ];

  for (const key of critical) {
    if (!process.env[key]) errors.push(`Missing critical env: ${key}`);
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
