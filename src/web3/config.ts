import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import type { Chain } from 'viem';

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
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
      showQrModal: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});
