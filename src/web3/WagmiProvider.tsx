import { useEffect } from 'react';
import { WagmiProvider as WagmiConfigProvider } from 'wagmi';
import { reconnect } from '@wagmi/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { wagmiConfig } from './config';

/**
 * 全局 Web3 Provider — 组合 wagmi 配置与 React Query 客户端。
 *
 * 嵌套顺序（由外向内）：
 *   WagmiConfigProvider → QueryClientProvider → ReconnectController → children
 *
 * 注意：wagmi hooks 内部依赖 @tanstack/react-query，
 * 因此 QueryClientProvider 必须位于 WagmiConfigProvider 内部。
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

interface WagmiProviderProps {
  children: ReactNode;
}

/**
 * ReconnectController — 应用挂载时自动重连上次连接的钱包。
 *
 * 必须渲染在 <WagmiConfigProvider> 内部。
 *
 * 实现要点：
 *   - useEffect 空依赖数组，仅在 mount 时调用一次，防止无限循环
 *   - reconnect(wagmiConfig) 尝试重连所有已授权的 connector（MetaMask 等）
 *   - 重连成功后，useAccount status 变为 'reconnecting' → 'connected'，
 *     WalletStateSyncer 自动同步状态到 walletStore
 *   - 重连失败（无已授权 connector / 钱包扩展未安装）静默失败，不报错
 *   - 不渲染任何 UI
 */
function ReconnectController() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reconnect(wagmiConfig);
      } catch {
        // 重连失败是正常情况（无已授权 connector、钱包未安装等），静默处理
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return (
    <WagmiConfigProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ReconnectController />
        {children}
      </QueryClientProvider>
    </WagmiConfigProvider>
  );
}
