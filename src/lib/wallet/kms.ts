import { KMSClient, DecryptCommand, EncryptCommand } from "@aws-sdk/client-kms";

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const kmsKeyId = process.env.AWS_KMS_KEY_ID;

/**
 * Decrypt the master seed using AWS KMS envelope encryption.
 * The encrypted seed is stored as base64 in ENCRYPTED_MASTER_SEED env var.
 */
export async function decryptMasterSeed(): Promise<Buffer> {
  const encryptedSeed = process.env.ENCRYPTED_MASTER_SEED;
  if (!encryptedSeed) {
    throw new Error("ENCRYPTED_MASTER_SEED environment variable is not set");
  }

  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedSeed, "base64"),
    KeyId: kmsKeyId,
  });

  const response = await kmsClient.send(command);
  if (!response.Plaintext) {
    throw new Error("KMS decryption returned empty plaintext");
  }

  return Buffer.from(response.Plaintext);
}

/**
 * Encrypt a master seed for storage.
 * Used during initial setup to generate the ENCRYPTED_MASTER_SEED value.
 */
export async function encryptMasterSeed(seed: Buffer): Promise<string> {
  if (!kmsKeyId) {
    throw new Error("AWS_KMS_KEY_ID environment variable is not set");
  }

  const command = new EncryptCommand({
    KeyId: kmsKeyId,
    Plaintext: seed,
  });

  const response = await kmsClient.send(command);
  if (!response.CiphertextBlob) {
    throw new Error("KMS encryption returned empty ciphertext");
  }

  return Buffer.from(response.CiphertextBlob).toString("base64");
}
