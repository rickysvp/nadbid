import { useEffect } from 'react';
import { useSwitchChain } from 'wagmi';
import { Globe, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { supportedChains, monadTestnet } from '../../web3/config';

/**
 * NetworkSwitcher — 网络切换组件。
 *
 * 从 walletStore 读取当前 chainId（由 WalletStateSyncer 同步），
 * 使用 wagmi useSwitchChain 执行真实链切换。
 *
 * 两种模式：
 * - compact: 仅显示当前网络名称 + 错误警告 + 一键切换按钮（用于 ConnectButton 下拉、WrongNetworkBanner）
 * - full:    显示所有支持链的列表，可点击切换（用于 AccountCard / WalletPage）
 */
type NetworkSwitcherMode = 'compact' | 'full';
type NetworkSwitcherTheme = 'dark' | 'light';

interface NetworkSwitcherProps {
  /** compact = 单行显示+切换按钮；full = 链列表 */
  mode?: NetworkSwitcherMode;
  /** 颜色主题，compact 模式下用于适配不同背景 */
  theme?: NetworkSwitcherTheme;
  /** 切换成功后的回调 */
  onSwitched?: (chainId: number) => void;
}

export function NetworkSwitcher({
  mode = 'compact',
  theme = 'dark',
  onSwitched,
}: NetworkSwitcherProps) {
  const { chainId } = useWalletStore();
  const { switchChain, isPending, error } = useSwitchChain();
  const { error: toastError } = useToast();

  const isDark = theme === 'dark';
  const isWrongNetwork = chainId !== null && chainId !== monadTestnet.id;
  const currentChain = chainId ? supportedChains.find((c) => c.id === chainId) : undefined;
  const currentChainName = currentChain?.name ?? (chainId ? `Chain #${chainId}` : 'Unknown');

  // 切换失败时 toast 提示
  useEffect(() => {
    if (error) {
      toastError(error.message ?? 'Failed to switch network');
    }
  }, [error, toastError]);

  const handleSwitch = (targetId: number = monadTestnet.id) => {
    if (isPending || chainId === targetId) return;
    switchChain(
      { chainId: targetId },
      {
        onSuccess: () => onSwitched?.(targetId),
      },
    );
  };

  /* ==================== compact 模式 ==================== */
  if (mode === 'compact') {
    return (
      <div className="w-full">
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border',
            isWrongNetwork
              ? 'bg-red-500/10 border-red-500/30'
              : isDark
                ? 'bg-white/[0.03] border-white/[0.06]'
                : 'bg-black/[0.03] border-black/[0.08]',
          )}
        >
          {isWrongNetwork ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-[#3ec470] flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'text-[9px] font-bold uppercase tracking-widest mb-0.5',
                isDark ? 'text-white/40' : 'text-black/40',
              )}
            >
              {isWrongNetwork ? 'Wrong Network' : 'Network'}
            </div>
            <div
              className={cn(
                'text-[13px] font-bold truncate',
                isWrongNetwork ? 'text-red-400' : isDark ? 'text-white' : 'text-black',
              )}
            >
              {currentChainName}
            </div>
          </div>
        </div>

        {/* 一键切换到 Monad Testnet */}
        {isWrongNetwork && (
          <button
            type="button"
            onClick={() => handleSwitch(monadTestnet.id)}
            disabled={isPending}
            className={cn(
              'mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-[12px] transition-all',
              isPending
                ? 'bg-[#3ec470]/50 text-black/50 cursor-not-allowed'
                : 'bg-[#3ec470] text-black hover:bg-[#4ade80]',
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Switching…
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                Switch to Monad Testnet
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  /* ==================== full 模式：链列表 ==================== */
  return (
    <div className="w-full">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-3">
        Network
      </div>
      <div className="space-y-2">
        {supportedChains.map((chain) => {
          const isActive = chainId === chain.id;
          const isSwitching = isPending && !isActive;
          const isTarget = chain.id === monadTestnet.id;
          return (
            <button
              key={chain.id}
              type="button"
              onClick={() => handleSwitch(chain.id)}
              disabled={isActive || isPending}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                isActive
                  ? 'bg-[#3ec470]/10 border-[#3ec470]/40'
                  : isPending
                    ? 'opacity-50 cursor-not-allowed bg-white/[0.02] border-white/[0.06]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]',
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  isActive
                    ? 'bg-[#3ec470]/20'
                    : 'bg-white/[0.05]',
                )}
              >
                {isActive && !isSwitching ? (
                  <Check className="w-4 h-4 text-[#3ec470]" />
                ) : isSwitching ? (
                  <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 text-white/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-[14px] font-bold',
                      isActive ? 'text-[#3ec470]' : 'text-white',
                    )}
                  >
                    {chain.name}
                  </span>
                  {isTarget && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#3ec470] bg-[#3ec470]/10 px-1.5 py-0.5 rounded border border-[#3ec470]/20">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/40 font-mono">
                  Chain ID: {chain.id} · {chain.nativeCurrency.symbol}
                </div>
              </div>
              {isActive && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3ec470]">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          {error.message ?? 'Failed to switch network'}
        </div>
      )}
    </div>
  );
}
