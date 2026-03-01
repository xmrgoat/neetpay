import { createEvmProvider } from "./evm-provider";
import { createSolanaProvider } from "./solana-provider";
import { createBitcoinProvider } from "./bitcoin-provider";
import { createTronProvider, USDT_TRC20 } from "./tron-provider";
import { createMoneroProvider } from "./monero-provider";
import { createLitecoinProvider } from "./litecoin-provider";
import { createDogecoinProvider } from "./dogecoin-provider";
import type { ChainRegistryEntry } from "./types";

// ERC-20 token contracts (Ethereum mainnet)
const ETH_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ETH_DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// Polygon token contracts
const POLY_USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const POLY_USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

// BSC token contracts
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

// Solana SPL token mints
const SOL_USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const SOL_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Lazy-initialize providers (created on first access)
let evmEthereum: ReturnType<typeof createEvmProvider>;
let evmPolygon: ReturnType<typeof createEvmProvider>;
let evmBsc: ReturnType<typeof createEvmProvider>;
let evmArbitrum: ReturnType<typeof createEvmProvider>;
let evmBase: ReturnType<typeof createEvmProvider>;
let evmOptimism: ReturnType<typeof createEvmProvider>;
let evmAvalanche: ReturnType<typeof createEvmProvider>;
let solana: ReturnType<typeof createSolanaProvider>;
let btc: ReturnType<typeof createBitcoinProvider>;
let tron: ReturnType<typeof createTronProvider>;
let monero: ReturnType<typeof createMoneroProvider>;
let ltc: ReturnType<typeof createLitecoinProvider>;
let doge: ReturnType<typeof createDogecoinProvider>;

function getEvmEthereum() {
  if (!evmEthereum) evmEthereum = createEvmProvider("ethereum");
  return evmEthereum;
}
function getEvmPolygon() {
  if (!evmPolygon) evmPolygon = createEvmProvider("polygon");
  return evmPolygon;
}
function getEvmBsc() {
  if (!evmBsc) evmBsc = createEvmProvider("bsc");
  return evmBsc;
}
function getEvmArbitrum() {
  if (!evmArbitrum) evmArbitrum = createEvmProvider("arbitrum");
  return evmArbitrum;
}
function getEvmBase() {
  if (!evmBase) evmBase = createEvmProvider("base");
  return evmBase;
}
function getEvmOptimism() {
  if (!evmOptimism) evmOptimism = createEvmProvider("optimism");
  return evmOptimism;
}
function getEvmAvalanche() {
  if (!evmAvalanche) evmAvalanche = createEvmProvider("avalanche");
  return evmAvalanche;
}
function getSolana() {
  if (!solana) solana = createSolanaProvider();
  return solana;
}
function getBtc() {
  if (!btc) btc = createBitcoinProvider();
  return btc;
}
function getTron() {
  if (!tron) tron = createTronProvider();
  return tron;
}
function getMonero() {
  if (!monero) monero = createMoneroProvider();
  return monero;
}
function getLtc() {
  if (!ltc) ltc = createLitecoinProvider();
  return ltc;
}
function getDoge() {
  if (!doge) doge = createDogecoinProvider();
  return doge;
}

/**
 * Complete registry of supported currencies.
 * Maps currency symbol to chain provider + metadata.
 */
export const CHAIN_REGISTRY: Record<string, ChainRegistryEntry> = {
  // Native coins
  ETH: {
    chain: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    native: true,
    network: "mainnet",
    get provider() { return getEvmEthereum(); },
  },
  BTC: {
    chain: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    native: true,
    network: "mainnet",
    get provider() { return getBtc(); },
  },
  SOL: {
    chain: "solana",
    name: "Solana",
    symbol: "SOL",
    native: true,
    network: "mainnet",
    get provider() { return getSolana(); },
  },
  XMR: {
    chain: "monero",
    name: "Monero",
    symbol: "XMR",
    native: true,
    network: "mainnet",
    get provider() { return getMonero(); },
  },
  TRX: {
    chain: "tron",
    name: "Tron",
    symbol: "TRX",
    native: true,
    network: "mainnet",
    get provider() { return getTron(); },
  },
  BNB: {
    chain: "bsc",
    name: "BNB",
    symbol: "BNB",
    native: true,
    network: "mainnet",
    get provider() { return getEvmBsc(); },
  },
  MATIC: {
    chain: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    native: true,
    network: "mainnet",
    get provider() { return getEvmPolygon(); },
  },
  ARB: {
    chain: "arbitrum",
    name: "Arbitrum",
    symbol: "ARB",
    native: true,
    network: "mainnet",
    get provider() { return getEvmArbitrum(); },
  },
  OP: {
    chain: "optimism",
    name: "Optimism",
    symbol: "OP",
    native: true,
    network: "mainnet",
    get provider() { return getEvmOptimism(); },
  },
  AVAX: {
    chain: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    native: true,
    network: "mainnet",
    get provider() { return getEvmAvalanche(); },
  },
  LTC: {
    chain: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    native: true,
    network: "mainnet",
    get provider() { return getLtc(); },
  },
  DOGE: {
    chain: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    native: true,
    network: "mainnet",
    get provider() { return getDoge(); },
  },

  // USDT on multiple chains
  "USDT-ERC20": {
    chain: "ethereum",
    name: "Tether (ERC-20)",
    symbol: "USDT",
    native: false,
    tokenContract: ETH_USDT,
    network: "mainnet",
    get provider() { return getEvmEthereum(); },
  },
  "USDT-TRC20": {
    chain: "tron",
    name: "Tether (TRC-20)",
    symbol: "USDT",
    native: false,
    tokenContract: USDT_TRC20,
    network: "mainnet",
    get provider() { return getTron(); },
  },
  "USDT-POLYGON": {
    chain: "polygon",
    name: "Tether (Polygon)",
    symbol: "USDT",
    native: false,
    tokenContract: POLY_USDT,
    network: "mainnet",
    get provider() { return getEvmPolygon(); },
  },
  "USDT-BSC": {
    chain: "bsc",
    name: "Tether (BSC)",
    symbol: "USDT",
    native: false,
    tokenContract: BSC_USDT,
    network: "mainnet",
    get provider() { return getEvmBsc(); },
  },
  "USDT-SOL": {
    chain: "solana",
    name: "Tether (Solana)",
    symbol: "USDT",
    native: false,
    tokenContract: SOL_USDT,
    network: "mainnet",
    get provider() { return getSolana(); },
  },

  // USDC on multiple chains
  "USDC-ERC20": {
    chain: "ethereum",
    name: "USD Coin (ERC-20)",
    symbol: "USDC",
    native: false,
    tokenContract: ETH_USDC,
    network: "mainnet",
    get provider() { return getEvmEthereum(); },
  },
  "USDC-POLYGON": {
    chain: "polygon",
    name: "USD Coin (Polygon)",
    symbol: "USDC",
    native: false,
    tokenContract: POLY_USDC,
    network: "mainnet",
    get provider() { return getEvmPolygon(); },
  },
  "USDC-BSC": {
    chain: "bsc",
    name: "USD Coin (BSC)",
    symbol: "USDC",
    native: false,
    tokenContract: BSC_USDC,
    network: "mainnet",
    get provider() { return getEvmBsc(); },
  },
  "USDC-SOL": {
    chain: "solana",
    name: "USD Coin (Solana)",
    symbol: "USDC",
    native: false,
    tokenContract: SOL_USDC,
    network: "mainnet",
    get provider() { return getSolana(); },
  },

  // DAI
  "DAI-ERC20": {
    chain: "ethereum",
    name: "Dai (ERC-20)",
    symbol: "DAI",
    native: false,
    tokenContract: ETH_DAI,
    network: "mainnet",
    get provider() { return getEvmEthereum(); },
  },
};

/**
 * Get a chain registry entry by currency key.
 */
export function getChainEntry(currencyKey: string): ChainRegistryEntry | undefined {
  return CHAIN_REGISTRY[currencyKey];
}

/**
 * Get all supported currencies as a flat list.
 */
export function getSupportedCurrencies(): Array<{
  key: string;
  symbol: string;
  name: string;
  chain: string;
  network: string;
  native: boolean;
}> {
  return Object.entries(CHAIN_REGISTRY).map(([key, entry]) => ({
    key,
    symbol: entry.symbol,
    name: entry.name,
    chain: entry.chain,
    network: entry.network,
    native: entry.native,
  }));
}

/**
 * Get currencies grouped by base symbol (e.g., USDT → multiple chains).
 */
export function getCurrenciesBySymbol(): Record<
  string,
  Array<{ key: string; chain: string; name: string; native: boolean }>
> {
  const grouped: Record<
    string,
    Array<{ key: string; chain: string; name: string; native: boolean }>
  > = {};

  for (const [key, entry] of Object.entries(CHAIN_REGISTRY)) {
    if (!grouped[entry.symbol]) {
      grouped[entry.symbol] = [];
    }
    grouped[entry.symbol].push({
      key,
      chain: entry.chain,
      name: entry.name,
      native: entry.native,
    });
  }

  return grouped;
}
