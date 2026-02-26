import { db } from "@/lib/db";
import { getChainEntry, CHAIN_REGISTRY } from "@/lib/chains/registry";

export interface WalletBalanceWithPrice {
  currency: string;
  chain: string;
  amount: number;
  usdPrice: number | null;
  change24h: number | null;
  usdValue: number | null;
}

export interface EnrichedTransaction {
  id: string;
  type: string;
  currency: string;
  currencyKey: string;
  symbol: string;
  chain: string;
  amount: number;
  valueUsd: number;
  fee: number | null;
  txHash: string | null;
  address: string | null;
  explorerUrl: string | null;
  confirmations: number;
  requiredConfs: number;
  status: string;
  createdAt: string;
}

export interface TransactionHistoryResult {
  transactions: EnrichedTransaction[];
  total: number;
}

/**
 * Credit balance when payment received or deposit confirmed.
 */
export async function creditBalance(
  userId: string,
  currency: string,
  chain: string,
  amount: number,
): Promise<void> {
  await db.walletBalance.upsert({
    where: { userId_currency_chain: { userId, currency, chain } },
    create: { userId, currency, chain, amount },
    update: { amount: { increment: amount } },
  });
}

/**
 * Debit balance on withdrawal.
 */
export async function debitBalance(
  userId: string,
  currency: string,
  chain: string,
  amount: number,
): Promise<void> {
  const balance = await db.walletBalance.findUnique({
    where: { userId_currency_chain: { userId, currency, chain } },
  });

  if (!balance || balance.amount < amount) {
    throw new Error(
      `Insufficient ${currency} balance on ${chain}. ` +
        `Available: ${balance?.amount ?? 0}, requested: ${amount}`,
    );
  }

  await db.walletBalance.update({
    where: { userId_currency_chain: { userId, currency, chain } },
    data: { amount: { decrement: amount } },
  });
}

/**
 * Get all balances for a user, joined with price data.
 */
export async function getBalances(
  userId: string,
): Promise<WalletBalanceWithPrice[]> {
  const balances = await db.walletBalance.findMany({ where: { userId } });

  const symbols = [...new Set(balances.map((b) => b.currency))];
  const prices = await db.priceCache.findMany({
    where: { symbol: { in: symbols } },
  });
  const priceMap = new Map(prices.map((p) => [p.symbol, p]));

  return balances.map((b) => {
    const price = priceMap.get(b.currency);
    return {
      currency: b.currency,
      chain: b.chain,
      amount: b.amount,
      usdPrice: price?.usdPrice ?? null,
      change24h: price?.change24h ?? null,
      usdValue: price ? b.amount * price.usdPrice : null,
    };
  });
}

/**
 * Get or generate a deposit address.
 */
export async function getDepositAddress(
  userId: string,
  currency: string,
  chain: string,
): Promise<{ address: string }> {
  const currencyKey = buildCurrencyKey(currency, chain);
  const entry = getChainEntry(currencyKey);
  if (!entry) {
    throw new Error(`Unsupported currency/chain: ${currency}/${chain}`);
  }

  // Reuse existing address owned by this user (not linked to a payment)
  const existing = await db.walletAddress.findFirst({
    where: { userId, chain, paymentId: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return { address: existing.address };
  }

  // Generate new address — use global derivation index to avoid collisions
  const lastAddress = await db.walletAddress.findFirst({
    where: { chain },
    orderBy: { derivationIndex: "desc" },
  });
  const derivationIndex = (lastAddress?.derivationIndex ?? -1) + 1;

  const { address } = await entry.provider.generateAddress(derivationIndex);

  await db.walletAddress.create({
    data: { userId, chain, address, derivationIndex },
  });

  return { address };
}

/**
 * Withdraw crypto to an external address.
 */
export async function withdraw(
  userId: string,
  currency: string,
  chain: string,
  toAddress: string,
  amount: number,
): Promise<{ txHash: string; fee: number }> {
  const currencyKey = buildCurrencyKey(currency, chain);
  const entry = getChainEntry(currencyKey);
  if (!entry) {
    throw new Error(`Unsupported currency/chain: ${currency}/${chain}`);
  }

  if (!entry.provider.validateAddress(toAddress)) {
    throw new Error(`Invalid ${chain} address: ${toAddress}`);
  }

  // Check balance
  const balance = await db.walletBalance.findUnique({
    where: { userId_currency_chain: { userId, currency, chain } },
  });

  if (!balance || balance.amount < amount) {
    throw new Error(
      `Insufficient ${currency} balance. Available: ${balance?.amount ?? 0}, requested: ${amount}`,
    );
  }

  if (!entry.provider.send) {
    throw new Error(`Send not supported for ${chain}`);
  }

  // Find all wallet addresses belonging to this user on this chain
  const userAddresses = await db.walletAddress.findMany({
    where: { userId, chain },
    orderBy: { derivationIndex: "asc" },
  });

  if (userAddresses.length === 0) {
    throw new Error(`No wallet address found for user on chain: ${chain}`);
  }

  // Send from the first (primary) address — for account-model chains (EVM, SOL, TRX)
  // this is the only address needed. For UTXO chains the provider handles UTXO aggregation.
  const primaryAddr = userAddresses[0];

  const result = await entry.provider.send({
    fromIndex: primaryAddr.derivationIndex,
    toAddress,
    amount,
    tokenContract: entry.tokenContract,
  });

  // Debit balance
  await debitBalance(userId, currency, chain, amount);

  // Record transaction
  await db.walletTransaction.create({
    data: {
      userId,
      type: "withdrawal",
      currency,
      chain,
      amount,
      fee: result.fee,
      txHash: result.txHash,
      toAddress,
      status: "confirmed",
    },
  });

  return result;
}

/**
 * Get paginated transaction history, enriched with computed fields
 * (symbol, explorerUrl, valueUsd) that the frontend expects.
 */
export async function getTransactionHistory(
  userId: string,
  opts?: { page?: number; limit?: number; type?: string },
): Promise<TransactionHistoryResult> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (opts?.type) where.type = opts.type;

  const [rawTxs, total] = await Promise.all([
    db.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.walletTransaction.count({ where }),
  ]);

  // Fetch prices for all currencies in this batch
  const symbols = [...new Set(rawTxs.map((tx) => tx.currency))];
  const prices = await db.priceCache.findMany({
    where: { symbol: { in: symbols } },
  });
  const priceMap = new Map(prices.map((p) => [p.symbol, p.usdPrice]));

  const transactions: EnrichedTransaction[] = rawTxs.map((tx) => {
    const currencyKey = buildCurrencyKey(tx.currency, tx.chain);
    const registryEntry = CHAIN_REGISTRY[currencyKey];
    const usdPrice = priceMap.get(tx.currency) ?? 0;

    return {
      id: tx.id,
      type: tx.type,
      currency: tx.currency,
      currencyKey,
      symbol: registryEntry?.symbol ?? tx.currency,
      chain: tx.chain,
      amount: tx.amount,
      valueUsd: tx.amount * usdPrice,
      fee: tx.fee,
      txHash: tx.txHash,
      address: tx.type === "withdrawal" ? tx.toAddress : tx.fromAddress,
      explorerUrl: tx.txHash && registryEntry
        ? registryEntry.provider.getExplorerUrl(tx.txHash)
        : null,
      confirmations: tx.status === "confirmed" ? (registryEntry?.provider.getRequiredConfirmations() ?? 1) : 0,
      requiredConfs: registryEntry?.provider.getRequiredConfirmations() ?? 1,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
    };
  });

  return { transactions, total };
}

/**
 * Build a registry key from currency symbol + chain name.
 */
function buildCurrencyKey(currency: string, chain: string): string {
  const nativeMap: Record<string, string> = {
    ETH: "ethereum",
    BTC: "bitcoin",
    SOL: "solana",
    XMR: "monero",
    TRX: "tron",
    BNB: "bsc",
    MATIC: "polygon",
    ARB: "arbitrum",
    OP: "optimism",
    AVAX: "avalanche",
    LTC: "litecoin",
    DOGE: "dogecoin",
  };

  if (nativeMap[currency] === chain) {
    return currency;
  }

  const chainSuffix: Record<string, string> = {
    ethereum: "ERC20",
    polygon: "POLYGON",
    bsc: "BSC",
    solana: "SOL",
    tron: "TRC20",
    arbitrum: "ARB",
    optimism: "OP",
    avalanche: "AVAX",
  };

  const suffix = chainSuffix[chain] || "";
  return `${currency}-${suffix}`;
}
