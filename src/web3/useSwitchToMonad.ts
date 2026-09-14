import { useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import type { EIP1193Provider } from 'viem';
import { monadTestnet, monadChainParams } from './config';
import { useToast } from '../hooks/useToast';

/**
 * useSwitchToMonad — 切到 Monad Testnet 的统一入口（OKX 兼容）。
 *
 * 背景：wagmi 的 switchChain 对 injected connector 内置 wallet_switchEthereumChain，
 * 仅在钱包返回 4902 时才兜底 addEthereumChain。但 OKX 等钱包对非主流链
 * （Monad）常返回 -32603 / "network not supported" 等非 4902 错误，
 * 兜底不触发 → 用户卡在"无法切换"。
 *
 * 这里显式两步走：
 *   1) 先 switchChain；
 *   2) 失败 → 直接向当前 connector provider 调 wallet_addEthereumChain
 *      （EIP-3085，OKX/MetaMask 均支持）→ 再 switchChain。
 */
export function useSwitchToMonad() {
  const { connector } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const { error: toastError } = useToast();

  const switchToMonad = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: monadTestnet.id });
      return;
    } catch (switchErr) {
      // 显式添加 Monad 网络（覆盖 OKX 非 4902 错误路径）
      try {
        const provider = (await connector?.getProvider()) as EIP1193Provider | undefined;
        if (!provider?.request) throw switchErr;

        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [monadChainParams],
        });
        await switchChainAsync({ chainId: monadTestnet.id });
      } catch (addErr) {
        const message =
          (addErr as Error)?.message ?? (switchErr as Error)?.message ?? 'Failed to switch network';
        toastError(`${message} — 若钱包弹窗未出现，请在钱包设置中手动添加 Monad Testnet（Chain ID 10143）`);
        throw addErr;
      }
    }
  }, [connector, switchChainAsync, toastError]);

  return { switchToMonad, isPending };
}
