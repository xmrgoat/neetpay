export interface PaymentCheck {
  txHash: string;
  amount: number;
  confirmations: number;
  from: string;
  timestamp: number;
  tokenContract?: string;
}

export interface GeneratedAddress {
  address: string;
  memo?: string;
}

export interface ChainProvider {
  /** Chain identifier (ethereum, bitcoin, solana, tron, monero) */
  chain: string;

  /** Generate a unique deposit address for a payment */
  generateAddress(derivationIndex: number): Promise<GeneratedAddress>;

  /** Check if a payment was received at the given address */
  checkPayment(
    address: string,
    expectedAmount?: number,
    tokenContract?: string
  ): Promise<PaymentCheck | null>;

  /** Get current confirmation count for a transaction */
  getConfirmations(txHash: string): Promise<number>;

  /** Minimum confirmations required for this chain */
  getRequiredConfirmations(): number;

  /** Validate an address format */
  validateAddress(address: string): boolean;

  /** Get block explorer URL for a transaction */
  getExplorerUrl(txHash: string): string;

  /** Get balance of an address (in human-readable units) */
  getBalance?(address: string, tokenContract?: string): Promise<number>;

  /** Send crypto from a derived wallet */
  send?(params: {
    fromIndex: number;
    toAddress: string;
    amount: number;
    tokenContract?: string;
  }): Promise<{ txHash: string; fee: number }>;

  /** Estimate transaction fee (in native currency units) */
  estimateFee?(toAddress: string, amount: number, tokenContract?: string): Promise<number>;
}

export interface ChainRegistryEntry {
  chain: string;
  name: string;
  symbol: string;
  native: boolean;
  tokenContract?: string;
  network: string;
  provider: ChainProvider;
}
