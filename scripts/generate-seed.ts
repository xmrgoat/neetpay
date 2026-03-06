/**
 * Generate a new BIP-39 mnemonic and encrypt it.
 *
 * Usage:
 *   SEED_ENCRYPTION_KEY="your-passphrase" npx tsx scripts/generate-seed.ts
 *   SEED_ENCRYPTION_KEY="your-passphrase" npx tsx scripts/generate-seed.ts --words 24
 *
 * Output:
 *   - Displays the mnemonic (BACK THIS UP!)
 *   - Displays the ENCRYPTED_SEED value to put in .env
 */

import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { createCipheriv, scryptSync, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;

function encrypt(mnemonic: string, passphrase: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(passphrase, salt, KEY_LEN) as Buffer;

  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(mnemonic, "utf-8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Layout: salt(16) | iv(12) | tag(16) | ciphertext(rest)
  const blob = Buffer.concat([salt, iv, tag, encrypted]);
  return blob.toString("base64");
}

function parseWordCount(): 12 | 24 {
  const idx = process.argv.indexOf("--words");
  if (idx === -1) return 12;

  const val = process.argv[idx + 1];
  if (val === "12") return 12;
  if (val === "24") return 24;

  console.error("Error: --words must be 12 or 24");
  process.exit(1);
}

function main() {
  const passphrase = process.env.SEED_ENCRYPTION_KEY;
  if (!passphrase) {
    console.error("Error: set SEED_ENCRYPTION_KEY env var first.");
    console.error("  SEED_ENCRYPTION_KEY=\"your-passphrase\" npx tsx scripts/generate-seed.ts");
    process.exit(1);
  }

  const wordCount = parseWordCount();
  // 128 bits = 12 words, 256 bits = 24 words
  const strength = wordCount === 12 ? 128 : 256;

  const mnemonic = generateMnemonic(wordlist, strength);

  if (!validateMnemonic(mnemonic, wordlist)) {
    console.error("Error: generated mnemonic failed validation. This should not happen.");
    process.exit(1);
  }

  const encrypted = encrypt(mnemonic, passphrase);

  console.log("");
  console.log("======================================");
  console.log("  NEW WALLET GENERATED");
  console.log("======================================");
  console.log("");
  console.log(`  Word count: ${wordCount}`);
  console.log("");
  console.log("  MNEMONIC (back this up securely!):");
  console.log("");
  console.log(`  ${mnemonic}`);
  console.log("");
  console.log("  WARNING: This mnemonic will NOT be shown again.");
  console.log("  Store it offline in a secure location.");
  console.log("");
  console.log("--------------------------------------");
  console.log("");
  console.log("  Add these to your .env:");
  console.log("");
  console.log(`  ENCRYPTED_SEED="${encrypted}"`);
  console.log(`  SEED_ENCRYPTION_KEY="${passphrase}"`);
  console.log("");
}

main();
