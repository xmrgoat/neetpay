import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from "crypto";

/**
 * Local AES-256-GCM encryption — replaces AWS KMS.
 *
 * Env vars:
 *   SEED_ENCRYPTION_KEY  — passphrase used to derive the AES key
 *   ENCRYPTED_SEED       — base64 blob (salt:iv:tag:ciphertext)
 *
 * To generate ENCRYPTED_SEED, run:  npx ts-node scripts/encrypt-seed.ts
 */

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

function getEncryptionKey(): string {
  const key = process.env.SEED_ENCRYPTION_KEY;
  if (!key) throw new Error("SEED_ENCRYPTION_KEY environment variable is not set");
  return key;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN) as Buffer;
}

/**
 * Decrypt the master seed stored in ENCRYPTED_SEED env var.
 */
export async function decryptMasterSeed(): Promise<Buffer> {
  const blob = process.env.ENCRYPTED_SEED;
  if (!blob) {
    throw new Error("ENCRYPTED_SEED environment variable is not set");
  }

  const raw = Buffer.from(blob, "base64");

  // Layout: salt(16) | iv(12) | tag(16) | ciphertext(rest)
  const salt = raw.subarray(0, SALT_LEN);
  const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = raw.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(SALT_LEN + IV_LEN + TAG_LEN);

  const key = deriveKey(getEncryptionKey(), salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
}

/**
 * Encrypt a master seed for storage.
 * Returns a base64 blob to store as ENCRYPTED_SEED.
 */
export async function encryptMasterSeed(seed: Buffer): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(getEncryptionKey(), salt);

  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(seed), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: salt | iv | tag | ciphertext
  const blob = Buffer.concat([salt, iv, tag, encrypted]);
  return blob.toString("base64");
}
