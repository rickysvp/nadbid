import { http, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import type { AddEthereumChainParameter, Chain, EIP1193Provider } from 'viem';

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

/**
 * Monad Testnet 网络参数（EIP-3085 wallet_addEthereumChain）。
 * OKX 等钱包对非主流链的 wallet_switchEthereumChain 常返回非标准错误，
 * 切网失败时前端显式调用 addEthereumChain 添加网络后再切换。
 */
export const monadChainParams: AddEthereumChainParameter = {
  chainId: `0x${(10143).toString(16)}`,
  chainName: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: [monadRpcUrl],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

/** 应用支持的链列表（审计修复：仅 Monad Testnet。移除 Sepolia 后钱包不再提供切到其他链的入口，
 *  错误网络态只会在钱包侧手动连接其他链时出现，WalletGuard 会阻断业务渲染） */
export const supportedChains = [monadTestnet] as const;

/**
 * wagmi 全局配置
 * - Connectors: MetaMask (injected) + OKX Wallet (injected) + WalletConnect
 * - OKX 浏览器扩展注入 window.okxwallet（EIP-1193）。wagmi 无内置 OKX target，
 *   这里运行时检测：仅当扩展已安装时才注册 connector（未安装不展示按钮，
 *   也避免 wagmi target fallback 到 window.ethereum 误连 MetaMask）。
 * - OKX 手机 App 走 WalletConnect（扫码），无需额外配置。
 * - Transports: HTTP for each supported chain
 */
const okxProvider: EIP1193Provider | undefined =
  typeof window !== 'undefined'
    ? (window as unknown as { okxwallet?: EIP1193Provider }).okxwallet
    : undefined;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  // 关闭 EIP-6963 自动发现：否则已显式注册的 MetaMask/OKX 会被再自动发现一次，
  // 弹窗出现重复 MetaMask 项且连接互相竞争（CONNECTING 卡死）。
  multiInjectedProviderDiscovery: false,
  connectors: [
    injected({ target: 'metaMask' }),
    ...(okxProvider
      ? [
          injected({
            target: () => ({ id: 'okx', name: 'OKX Wallet', provider: okxProvider }),
          }),
        ]
      : []),
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
