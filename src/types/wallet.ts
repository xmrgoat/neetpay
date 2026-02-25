export type WalletTxType = "deposit" | "withdrawal" | "received";
export type WalletTxStatus = "pending" | "confirmed" | "failed";

export interface WalletAsset {
  /** Registry key (e.g., "ETH", "USDT-ERC20") */
  key: string;
  /** Display symbol (e.g., "ETH", "USDT") */
  symbol: string;
  /** Full name (e.g., "Ethereum", "Tether (ERC-20)") */
  name: string;
  /** Chain identifier (e.g., "ethereum", "tron") */
  chain: string;
  /** Whether this is a native coin or token */
  native: boolean;
  /** Crypto balance */
  balance: number;
  /** USD price per unit */
  priceUsd: number;
  /** 24h price change percentage */
  change24h: number;
  /** Total USD value (balance * priceUsd) */
  valueUsd: number;
}

export interface WalletBalance {
  /** Total USD value across all assets */
  totalUsd: number;
  /** 24h change in USD */
  change24hUsd: number;
  /** 24h change percentage */
  change24hPercent: number;
  /** Individual asset holdings */
  assets: WalletAsset[];
}

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  /** Registry key (e.g., "ETH", "USDT-TRC20") */
  currencyKey: string;
  /** Display symbol */
  symbol: string;
  /** Chain identifier */
  chain: string;
  /** Amount in crypto */
  amount: number;
  /** USD value at time of transaction */
  valueUsd: number;
  /** Transaction status */
  status: WalletTxStatus;
  /** On-chain transaction hash */
  txHash: string | null;
  /** Sender or recipient address */
  address: string | null;
  /** Number of confirmations */
  confirmations: number;
  /** Required confirmations */
  requiredConfs: number;
  /** Block explorer URL */
  explorerUrl: string | null;
  createdAt: string;
}

export interface WalletDepositInfo {
  address: string;
  memo?: string;
  chain: string;
  currencyKey: string;
  symbol: string;
}

export interface WalletWithdrawRequest {
  currencyKey: string;
  address: string;
  amount: number;
}

export interface WalletWithdrawResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}
