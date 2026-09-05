import { http, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import type { Chain } from 'viem';
import { contractAddresses, registryAbi, factoryAbi } from './contracts';

/**
 * Monad 测试网链配置
 * Chain ID: 10143
 * RPC: 默认 https://testnet-rpc.monad.xyz，可被 VITE_MONAD_RPC_URL 覆盖（审计修复 P2-7：
 * 此前 .env 声明了该变量但 wagmi 从未读取，修改 env 无效）。
 * Explorer: https://testnet.monadexplorer.com
 */
const monadRpcUrl =
  import.meta.env.VITE_MONAD_RPC_URL?.trim() || 'https://testnet-rpc.monad.xyz';

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [monadRpcUrl] },
    public: { http: [monadRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const satisfies Chain;

/** 应用支持的链列表（审计修复：仅 Monad Testnet。移除 Sepolia 后钱包不再提供切到其他链的入口，
 *  错误网络态只会在钱包侧手动连接其他链时出现，WalletGuard 会阻断业务渲染） */
export const supportedChains = [monadTestnet] as const;

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
