import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import type { Chain } from 'viem';
import { contractAddresses, registryAbi, factoryAbi } from './contracts';

/**
 * Monad 测试网链配置
 * Chain ID: 10143
 * RPC: https://testnet-rpc.monad.xyz
 * Explorer: https://testnet.monadexplorer.com
 */
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const satisfies Chain;

/** 应用支持的链列表（默认链为 Monad Testnet） */
export const supportedChains = [monadTestnet, sepolia] as const;

/**
 * wagmi 全局配置
 * - Connectors: MetaMask (injected) + WalletConnect
 * - Transports: HTTP for each supported chain
 */
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c111313e8062592e9151a86a383f2994',
      showQrModal: true,
      // 排除不支持 Monad 链的钱包（Phantom）
      qrModalOptions: {
        explorerExcludedWalletIds: [
          'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
        ],
      },
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// ============================================================================
// 合约调用配置 — 供 wagmi useReadContract / useWriteContract 直接使用。
// address 从 contractAddresses（环境变量）读取，未部署时为 undefined。
// ============================================================================

/** NadbidRegistry 合约调用配置 */
export const registryConfig = {
  address: contractAddresses.registry,
  abi: registryAbi,
} as const;

/** NadbidFactory 合约调用配置 */
export const factoryConfig = {
  address: contractAddresses.factory,
  abi: factoryAbi,
} as const;
