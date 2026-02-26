/**
 * Encrypt a BIP-39 mnemonic for use as ENCRYPTED_SEED env var.
 *
 * Usage:
 *   SEED_ENCRYPTION_KEY="your-passphrase" npx tsx scripts/encrypt-seed.ts "word1 word2 ... word12"
 *
 * Output: base64 blob to paste into .env as ENCRYPTED_SEED
 */

import { createCipheriv, scryptSync, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;

function main() {
  const passphrase = process.env.SEED_ENCRYPTION_KEY;
  if (!passphrase) {
    console.error("Error: set SEED_ENCRYPTION_KEY env var first");
    process.exit(1);
  }

  const mnemonic = process.argv[2];
  if (!mnemonic) {
    console.error("Usage: SEED_ENCRYPTION_KEY=xxx npx tsx scripts/encrypt-seed.ts \"your mnemonic words\"");
    process.exit(1);
  }

  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(passphrase, salt, KEY_LEN) as Buffer;

  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(mnemonic, "utf-8")), cipher.final()]);
  const tag = cipher.getAuthTag();

  const blob = Buffer.concat([salt, iv, tag, encrypted]);
  const b64 = blob.toString("base64");

  console.log("\n✓ Encrypted seed generated.\n");
  console.log("Add this to your .env:\n");
  console.log(`ENCRYPTED_SEED="${b64}"`);
  console.log(`SEED_ENCRYPTION_KEY="${passphrase}"`);
  console.log();
}

main();
