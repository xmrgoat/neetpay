import { mnemonicToAccount, HDKey } from "viem/accounts";
import { decryptMasterSeed } from "./kms";

let cachedSeed: Buffer | null = null;
let cachedMnemonic: string | null = null;

/**
 * Get the decrypted master seed, with in-memory caching.
 */
async function getMasterSeed(): Promise<Buffer> {
  if (cachedSeed) return cachedSeed;
  cachedSeed = await decryptMasterSeed();
  return cachedSeed;
}

/**
 * Get the mnemonic phrase from the seed.
 * For dev, falls back to DEV_MNEMONIC env var.
 */
export async function getMnemonic(): Promise<string> {
  if (cachedMnemonic) return cachedMnemonic;

  // Dev fallback — never use in production
  if (process.env.DEV_MNEMONIC) {
    cachedMnemonic = process.env.DEV_MNEMONIC;
    return cachedMnemonic;
  }

  const seed = await getMasterSeed();
  // The seed IS the mnemonic stored as UTF-8
  cachedMnemonic = seed.toString("utf-8").trim();
  return cachedMnemonic;
}

/**
 * Derive an EVM address from the master mnemonic.
 * BIP-44 path: m/44'/60'/0'/0/{index}
 */
export async function deriveEvmAddress(index: number) {
  const mnemonic = await getMnemonic();
  const account = mnemonicToAccount(mnemonic, {
    addressIndex: index,
  });
  return {
    address: account.address,
    account,
  };
}

/**
 * Get the HD key for custom derivation paths (BTC, etc.)
 */
export async function getHDKey(): Promise<HDKey> {
  const mnemonic = await getMnemonic();
  // viem re-exports HDKey from @scure/bip32
  const { hdKeyToAccount } = await import("viem/accounts");
  const { HDKey: HDKeyClass } = await import("@scure/bip32");
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const seed = mnemonicToSeedSync(mnemonic);
  return HDKeyClass.fromMasterSeed(seed) as unknown as HDKey;
}

/**
 * Clear cached seed from memory (for cleanup).
 */
export function clearCachedSeed(): void {
  if (cachedSeed) {
    cachedSeed.fill(0);
    cachedSeed = null;
  }
  cachedMnemonic = null;
}
