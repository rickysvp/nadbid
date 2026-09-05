import { useEffect, useRef } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { useWalletStore, setBalanceLoader } from '../stores/walletStore';

/**
 * WalletStateSyncer — 将 wagmi 响应式状态镜像到 Zustand walletStore。
 *
 * 必须渲染在 <WagmiProvider> 内部。自身不渲染任何 UI（return null）。
 *
 * 同步规则：
 *   - wagmi status === 'connected'：写入真实 address / chainId / connector / balance，
 *     覆盖 mock 状态。
 *   - wagmi status === 'connecting' | 'reconnecting'：仅更新 status 和 isConnecting，
 *     不触碰 isConnected / address（避免连接闪烁）。
 *   - wagmi 从 connected→disconnected：重置 store 为未连接状态。
 *   - 从未连接过真实钱包时（wasWagmiConnected=false）：不干预 store，
 *     允许 mock connect() 独立工作。
 *
 * 余额：useBalance 查询原生代币（MON），chainId 变化时自动重新查询。
 * 未连接时 address 为 null，useBalance 自动跳过查询。
 */
export function WalletStateSyncer() {
  const { address, status, connector } = useAccount();
  const chainId = useChainId();
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address ?? undefined,
    chainId,
  });

  // 审计修复（P2-2）：把 wagmi 真实余额查询注册为 walletStore 的 balanceLoader，
  // 使 refreshBalance() 在 real 模式走链上真实查询（此前 loader 从未注册，
  // 本地 delta 推算 burn 方向错误、claim/refund 后余额不刷新）。
  useEffect(() => {
    if (!address) return;
    const loader = async () => {
      const r = await refetchBalance();
      if (!r.data) return 0;
      return parseFloat(formatUnits(r.data.value, r.data.decimals));
    };
    setBalanceLoader(loader);
    return () => setBalanceLoader(null);
  }, [address, refetchBalance]);

  /** 追踪是否曾通过 wagmi 真实连接过，用于断开时判断是否需要重置 */
  const wasWagmiConnected = useRef(false);

  // 同步账户状态（address / chainId / connector / status）
  useEffect(() => {
    if (status === 'connected' && address) {
      wasWagmiConnected.current = true;
      useWalletStore.getState()._setWagmiState({
        isConnected: true,
        address,
        chainId: chainId ?? null,
        status: 'connected',
        isConnecting: false,
        connectorId: connector?.uid ?? null,
        connectorName: connector?.name ?? null,
      });
    } else if (status === 'connecting') {
      useWalletStore.getState()._setWagmiState({
        status,
        isConnecting: true,
      });
    } else if (status === 'reconnecting') {
      // 重连中：仅更新状态标记，不触碰 isConnected / address
      // （避免刷新页面时从已连接闪变为未连接再恢复）
      useWalletStore.getState()._setReconnecting();
    } else if (status === 'disconnected' && wasWagmiConnected.current) {
      // wagmi 真实断开（从 connected → disconnected）：完整重置 store
      // 注意：reconnect 失败时 status 也会变为 disconnected，但 wasWagmiConnected 为 false，
      // 此时不重置 store，保留 mock 连接状态（如果有）
      wasWagmiConnected.current = false;
      useWalletStore.getState()._resetFromWagmi();
    }
  }, [address, status, connector, chainId]);

  // 同步原生代币余额
  useEffect(() => {
    if (balanceData && address) {
      useWalletStore.getState()._setWagmiState({
        balanceRaw: balanceData.value,
        balanceMon: parseFloat(formatUnits(balanceData.value, balanceData.decimals)),
      });
    }
  }, [balanceData, address]);

  return null;
}
