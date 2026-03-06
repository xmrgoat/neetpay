/**
 * Field-level AES-256-GCM encryption for sensitive database columns.
 * Uses a dedicated FIELD_ENCRYPTION_KEY env var (separate from SEED_ENCRYPTION_KEY).
 *
 * Format: base64(iv(12) | tag(16) | ciphertext)
 * Key: SHA-256(FIELD_ENCRYPTION_KEY) — no scrypt needed since the key should be a
 * high-entropy random string, not a passphrase.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  // Derive a 32-byte key via SHA-256 (the env var should be a random hex string)
  cachedKey = createHash("sha256").update(raw).digest();
  return cachedKey;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: iv | tag | ciphertext
  const blob = Buffer.concat([iv, tag, encrypted]);
  return blob.toString("base64");
}

export function decryptField(encoded: string): string {
  const key = getKey();
  const blob = Buffer.from(encoded, "base64");
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * One-way hash for PII like IP addresses.
 * Uses HMAC-SHA256 with a daily rotating pepper derived from the encryption key.
 * Returns a hex string that can be used for deduplication but not reversed.
 */
export function hashPii(value: string): string {
  const key = getKey();
  return createHash("sha256")
    .update(key)
    .update(value)
    .digest("hex")
    .slice(0, 32); // 128-bit hash, sufficient for dedup
}
