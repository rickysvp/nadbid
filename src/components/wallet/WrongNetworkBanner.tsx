import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSwitchChain } from 'wagmi';
import { AlertTriangle, X, Loader2, Globe } from 'lucide-react';
import { useWalletStore } from '../../stores/walletStore';
import { useToast } from '../../hooks/useToast';
import { supportedChains, monadTestnet } from '../../web3/config';

/**
 * WrongNetworkBanner — 网络错误横幅。
 *
 * 当钱包已连接但 chainId 不是 Monad Testnet 时显示。
 * 提供一键切换到 Monad Testnet 的按钮，可手动关闭（本地 state）。
 * 未连接钱包时不渲染。
 */
interface WrongNetworkBannerProps {
  /** 额外 className（用于定位/间距） */
  className?: string;
  /** 切换成功后的回调 */
  onSwitched?: (chainId: number) => void;
}

export function WrongNetworkBanner({ className = '', onSwitched }: WrongNetworkBannerProps) {
  const { isConnected, chainId } = useWalletStore();
  const { switchChain, isPending } = useSwitchChain();
  const { error: toastError } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const isWrongNetwork = isConnected && chainId !== null && chainId !== monadTestnet.id;
  const visible = isWrongNetwork && !dismissed;

  const currentChain = chainId ? supportedChains.find((c) => c.id === chainId) : undefined;
  const currentChainName = currentChain?.name ?? (chainId ? `Chain #${chainId}` : 'Unknown');

  const handleSwitch = () => {
    if (isPending) return;
    switchChain(
      { chainId: monadTestnet.id },
      {
        onSuccess: () => {
          setDismissed(false);
          onSwitched?.(monadTestnet.id);
        },
        onError: (err) => {
          toastError(err.message ?? 'Failed to switch network');
        },
      },
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className={`overflow-hidden ${className}`}
        >
          <div className="flex items-center gap-4 px-5 py-3.5 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-red-400">
                Wrong Network
              </div>
              <div className="text-[11px] text-red-400/60 font-mono">
                Currently on {currentChainName} — NADBID requires Monad Testnet
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwitch}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[12px] transition-all flex-shrink-0 ${
                isPending
                  ? 'bg-[#3ec470]/50 text-black/50 cursor-not-allowed'
                  : 'bg-[#3ec470] text-black hover:bg-[#4ade80]'
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Switching…
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Switch to Monad
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
