import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";
const RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const REQUIRED_CONFIRMATIONS = 32;

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

function getAssociatedTokenAddress(
  walletAddress: PublicKey,
  mintAddress: PublicKey,
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

function createSplTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0);
  data.writeBigUInt64LE(amount, 1);
  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

function createAtaIdempotentInstruction(
  payer: PublicKey,
  ata: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([1]),
  });
}

function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

/**
 * Derive a Solana keypair from the master seed + index.
 * Uses BIP-44 path: m/44'/501'/index'/0'
 */
async function deriveKeypair(index: number): Promise<Keypair> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  // Solana BIP-44 derivation
  const derived = hdKey.derive(`m/44'/501'/${index}'/0'`);
  if (!derived.privateKey) {
    throw new Error("Failed to derive Solana private key");
  }

  return Keypair.fromSeed(derived.privateKey);
}

export function createSolanaProvider(): ChainProvider {
  const connection = getConnection();

  return {
    chain: "solana",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const keypair = await deriveKeypair(derivationIndex);
      return { address: keypair.publicKey.toBase58() };
    },

    async checkPayment(
      address: string,
      expectedAmount?: number,
      tokenContract?: string
    ): Promise<PaymentCheck | null> {
      const pubkey = new PublicKey(address);

      if (tokenContract) {
        // SPL token — check token account balance
        const tokenPubkey = new PublicKey(tokenContract);
        const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
          mint: tokenPubkey,
        });

        if (tokenAccounts.value.length === 0) return null;

        // Get recent signatures for the token account
        const signatures = await connection.getSignaturesForAddress(
          tokenAccounts.value[0].pubkey,
          { limit: 1 }
        );

        if (signatures.length === 0) return null;

        const sig = signatures[0];
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) return null;

        // Parse token transfer amount from transaction
        const preBalance =
          tx.meta?.preTokenBalances?.find(
            (b) => b.owner === address
          )?.uiTokenAmount.uiAmount || 0;
        const postBalance =
          tx.meta?.postTokenBalances?.find(
            (b) => b.owner === address
          )?.uiTokenAmount.uiAmount || 0;

        const amount = postBalance - preBalance;
        if (amount <= 0) return null;

        return {
          txHash: sig.signature,
          amount,
          confirmations: sig.confirmationStatus === "finalized" ? REQUIRED_CONFIRMATIONS : 0,
          from: "unknown",
          timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
          tokenContract,
        };
      } else {
        // Native SOL
        const balance = await connection.getBalance(pubkey);
        if (balance === 0) return null;

        const signatures = await connection.getSignaturesForAddress(pubkey, {
          limit: 1,
        });

        if (signatures.length === 0) return null;

        const sig = signatures[0];
        return {
          txHash: sig.signature,
          amount: balance / LAMPORTS_PER_SOL,
          confirmations: sig.confirmationStatus === "finalized" ? REQUIRED_CONFIRMATIONS : 0,
          from: "unknown",
          timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
        };
      }
    },

    async getConfirmations(txHash: string): Promise<number> {
      const status = await connection.getSignatureStatus(txHash);
      if (!status.value) return 0;

      if (status.value.confirmationStatus === "finalized") {
        return REQUIRED_CONFIRMATIONS;
      }
      return status.value.confirmations || 0;
    },

    getRequiredConfirmations(): number {
      return REQUIRED_CONFIRMATIONS;
    },

    validateAddress(address: string): boolean {
      try {
        new PublicKey(address);
        return true;
      } catch {
        return false;
      }
    },

    getExplorerUrl(txHash: string): string {
      return `https://solscan.io/tx/${txHash}`;
    },

    async getBalance(address: string, tokenContract?: string): Promise<number> {
      const pubkey = new PublicKey(address);

      if (tokenContract) {
        const mintPubkey = new PublicKey(tokenContract);
        const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
          mint: mintPubkey,
        });
        if (tokenAccounts.value.length === 0) return 0;

        const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
        const mintData = mintInfo.value?.data;
        let decimals = 9;
        if (mintData && "parsed" in mintData) {
          decimals = mintData.parsed?.info?.decimals ?? 9;
        }

        const accountData = tokenAccounts.value[0].account.data;
        const rawData = accountData instanceof Buffer ? accountData : Buffer.from(accountData);
        const rawAmount = rawData.readBigUInt64LE(64);
        return Number(rawAmount) / Math.pow(10, decimals);
      }

      const lamports = await connection.getBalance(pubkey);
      return lamports / LAMPORTS_PER_SOL;
    },

    async send(params: {
      fromIndex: number;
      toAddress: string;
      amount: number;
      tokenContract?: string;
    }): Promise<{ txHash: string; fee: number }> {
      const keypair = await deriveKeypair(params.fromIndex);
      const toPubkey = new PublicKey(params.toAddress);
      const transaction = new Transaction();

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = keypair.publicKey;

      if (params.tokenContract) {
        const mintPubkey = new PublicKey(params.tokenContract);
        const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
        const mintData = mintInfo.value?.data;
        let decimals = 9;
        if (mintData && "parsed" in mintData) {
          decimals = mintData.parsed?.info?.decimals ?? 9;
        }

        const tokenAmount = BigInt(Math.round(params.amount * Math.pow(10, decimals)));
        const sourceAta = getAssociatedTokenAddress(keypair.publicKey, mintPubkey);
        const destAta = getAssociatedTokenAddress(toPubkey, mintPubkey);

        transaction.add(createAtaIdempotentInstruction(keypair.publicKey, destAta, toPubkey, mintPubkey));
        transaction.add(createSplTransferInstruction(sourceAta, destAta, keypair.publicKey, tokenAmount));
      } else {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey,
            lamports: Math.round(params.amount * LAMPORTS_PER_SOL),
          }),
        );
      }

      transaction.sign(keypair);
      const txHash = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(
        { signature: txHash, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      const txResult = await connection.getTransaction(txHash, {
        maxSupportedTransactionVersion: 0,
      });
      const fee = (txResult?.meta?.fee ?? 5000) / LAMPORTS_PER_SOL;

      return { txHash, fee };
    },

    async estimateFee(
      _toAddress: string,
      _amount: number,
      tokenContract?: string,
    ): Promise<number> {
      // SPL token transfers cost more due to ATA creation
      return tokenContract ? 0.00001 : 0.000005;
    },
  };
}
