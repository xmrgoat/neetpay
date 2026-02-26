import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
  isAddress,
  type PublicClient,
  type Chain,
} from "viem";
import {
  mainnet,
  polygon,
  bsc,
  arbitrum,
  base,
  optimism,
  avalanche,
} from "viem/chains";
import { deriveEvmAddress } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";

const CHAIN_CONFIG: Record<
  string,
  { chain: Chain; alchemyNetwork: string; confirmations: number; explorer: string }
> = {
  ethereum: {
    chain: mainnet,
    alchemyNetwork: "eth-mainnet",
    confirmations: 12,
    explorer: "https://etherscan.io/tx",
  },
  polygon: {
    chain: polygon,
    alchemyNetwork: "polygon-mainnet",
    confirmations: 30,
    explorer: "https://polygonscan.com/tx",
  },
  bsc: {
    chain: bsc,
    alchemyNetwork: "bnb-mainnet",
    confirmations: 15,
    explorer: "https://bscscan.com/tx",
  },
  arbitrum: {
    chain: arbitrum,
    alchemyNetwork: "arb-mainnet",
    confirmations: 12,
    explorer: "https://arbiscan.io/tx",
  },
  base: {
    chain: base,
    alchemyNetwork: "base-mainnet",
    confirmations: 12,
    explorer: "https://basescan.org/tx",
  },
  optimism: {
    chain: optimism,
    alchemyNetwork: "opt-mainnet",
    confirmations: 12,
    explorer: "https://optimistic.etherscan.io/tx",
  },
  avalanche: {
    chain: avalanche,
    alchemyNetwork: "avax-mainnet",
    confirmations: 12,
    explorer: "https://snowtrace.io/tx",
  },
};

const ERC20_ABI = [
  parseAbiItem("function decimals() view returns (uint8)"),
  parseAbiItem("function balanceOf(address owner) view returns (uint256)"),
  parseAbiItem("function transfer(address to, uint256 amount) returns (bool)"),
  parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ),
] as const;

function getAlchemyUrl(chainName: string): string {
  const config = CHAIN_CONFIG[chainName];
  if (!config) throw new Error(`Unsupported EVM chain: ${chainName}`);
  return `https://${config.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_KEY}`;
}

function getClient(chainName: string): PublicClient {
  const config = CHAIN_CONFIG[chainName];
  if (!config) throw new Error(`Unsupported EVM chain: ${chainName}`);

  return createPublicClient({
    chain: config.chain,
    transport: http(
      `https://${config.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_KEY}`
    ),
  });
}

export function createEvmProvider(chainName: string): ChainProvider {
  const config = CHAIN_CONFIG[chainName];
  if (!config) throw new Error(`Unsupported EVM chain: ${chainName}`);

  const client = getClient(chainName);

  return {
    chain: chainName,

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const { address } = await deriveEvmAddress(derivationIndex);
      return { address };
    },

    async checkPayment(
      address: string,
      expectedAmount?: number,
      tokenContract?: string
    ): Promise<PaymentCheck | null> {
      const addr = address as `0x${string}`;

      if (tokenContract) {
        // ERC-20 token: check Transfer events to this address
        const logs = await client.getLogs({
          address: tokenContract as `0x${string}`,
          event: parseAbiItem(
            "event Transfer(address indexed from, address indexed to, uint256 value)"
          ),
          args: { to: addr },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        if (logs.length === 0) return null;

        const latest = logs[logs.length - 1];
        const block = await client.getBlock({
          blockHash: latest.blockHash!,
        });
        const currentBlock = await client.getBlockNumber();

        // Get token decimals
        const decimals = await client.readContract({
          address: tokenContract as `0x${string}`,
          abi: [parseAbiItem("function decimals() view returns (uint8)")],
          functionName: "decimals",
        });

        const amount = parseFloat(
          formatUnits(latest.args.value as bigint, decimals as number)
        );
        const confirmations = Number(currentBlock - block.number);

        return {
          txHash: latest.transactionHash!,
          amount,
          confirmations,
          from: latest.args.from as string,
          timestamp: Number(block.timestamp),
          tokenContract,
        };
      } else {
        // Native ETH/MATIC/BNB: check balance
        const balance = await client.getBalance({ address: addr });
        if (balance === 0n) return null;

        // Get latest incoming transaction
        // Note: for production, use Alchemy's alchemy_getAssetTransfers
        const amount = parseFloat(formatEther(balance));

        return {
          txHash: "",
          amount,
          confirmations: config.confirmations, // assume confirmed if balance exists
          from: "unknown",
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    },

    async getConfirmations(txHash: string): Promise<number> {
      const receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      if (!receipt) return 0;

      const currentBlock = await client.getBlockNumber();
      return Number(currentBlock - receipt.blockNumber);
    },

    getRequiredConfirmations(): number {
      return config.confirmations;
    },

    validateAddress(address: string): boolean {
      return isAddress(address);
    },

    getExplorerUrl(txHash: string): string {
      return `${config.explorer}/${txHash}`;
    },

    async getBalance(address: string, tokenContract?: string): Promise<number> {
      const addr = address as `0x${string}`;

      if (tokenContract) {
        const tokenAddr = tokenContract as `0x${string}`;
        const [rawBalance, decimals] = await Promise.all([
          client.readContract({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [addr],
          }),
          client.readContract({
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: "decimals",
          }),
        ]);
        return parseFloat(formatUnits(rawBalance as bigint, decimals as number));
      }

      const rawBalance = await client.getBalance({ address: addr });
      return parseFloat(formatEther(rawBalance));
    },

    async send(params: {
      fromIndex: number;
      toAddress: string;
      amount: number;
      tokenContract?: string;
    }): Promise<{ txHash: string; fee: number }> {
      const { fromIndex, toAddress, amount, tokenContract } = params;
      const to = toAddress as `0x${string}`;

      const { account } = await deriveEvmAddress(fromIndex);

      const walletClient = createWalletClient({
        account,
        chain: config.chain,
        transport: http(getAlchemyUrl(chainName)),
      });

      let txHash: `0x${string}`;

      if (tokenContract) {
        const tokenAddr = tokenContract as `0x${string}`;
        const decimals = await client.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
        const rawAmount = parseUnits(amount.toString(), decimals as number);

        txHash = await walletClient.writeContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [to, rawAmount],
        });
      } else {
        txHash = await walletClient.sendTransaction({
          to,
          value: parseEther(amount.toString()),
        });
      }

      const receipt = await client.waitForTransactionReceipt({ hash: txHash });
      const fee = parseFloat(
        formatEther(receipt.gasUsed * receipt.effectiveGasPrice),
      );

      return { txHash, fee };
    },

    async estimateFee(
      toAddress: string,
      amount: number,
      tokenContract?: string,
    ): Promise<number> {
      const to = toAddress as `0x${string}`;
      let gasEstimate: bigint;

      if (tokenContract) {
        const tokenAddr = tokenContract as `0x${string}`;
        const decimals = await client.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
        const rawAmount = parseUnits(amount.toString(), decimals as number);

        gasEstimate = await client.estimateContractGas({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [to, rawAmount],
        });
      } else {
        gasEstimate = await client.estimateGas({
          to,
          value: parseEther(amount.toString()),
        });
      }

      const gasPrice = await client.getGasPrice();
      return parseFloat(formatEther(gasEstimate * gasPrice));
    },
  };
}
