import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { X, Wallet, QrCode, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

/**
 * ConnectModal — 钱包连接弹窗。
 *
 * 受控组件：通过 open / onClose 控制显隐。
 * 使用 wagmi useConnect 动态渲染 connectors（MetaMask injected + WalletConnect），
 * 连接成功后调用 onClose，WalletStateSyncer 自动同步状态到 walletStore。
 * 连接失败通过 useToast 提示错误。
 */
interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const { connectors, connectAsync, isPending, error, reset } = useConnect();
  const { error: toastError } = useToast();
  const [connectingUid, setConnectingUid] = useState<string | null>(null);

  // 打开弹窗时清除上一次的连接错误状态
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, isPending, onClose]);

  const handleConnect = async (connector: Connector) => {
    if (isPending) return;
    setConnectingUid(connector.uid);
    try {
      await connectAsync({ connector });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      toastError(message);
    } finally {
      setConnectingUid(null);
    }
  };

  const handleOverlayClick = () => {
    if (!isPending) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm bg-[#161616] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="font-display text-xl font-black text-white tracking-tight">
                Connect Wallet
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  isPending
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/40 hover:text-white hover:bg-white/10',
                )}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-white/50 text-sm mb-5 leading-relaxed">
                Select a wallet to connect to NADBID. Your wallet will be used for
                bidding, minting, staking, and claiming rewards on Monad.
              </p>

              {/* Error banner */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                  {error.message ?? 'Connection failed'}
                </div>
              )}

              {/* Wallet options */}
              <div className="space-y-3">
                {connectors.map((connector) => {
                  const isConnecting = isPending && connectingUid === connector.uid;
                  const isWalletConnect = connector.type === 'walletConnect';
                  return (
                    <button
                      key={connector.uid}
                      type="button"
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all',
                        isPending
                          ? 'opacity-50 cursor-not-allowed border-white/[0.06] bg-white/[0.02]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#3ec470]/40',
                      )}
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-[#3ec470]/10 border border-[#3ec470]/20 flex items-center justify-center flex-shrink-0">
                        {isConnecting ? (
                          <Loader2 className="w-5 h-5 text-[#3ec470] animate-spin" />
                        ) : isWalletConnect ? (
                          <QrCode className="w-5 h-5 text-[#3ec470]" />
                        ) : (
                          <Wallet className="w-5 h-5 text-[#3ec470]" />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 text-left">
                        <span className="font-bold text-sm text-white block">
                          {connector.name}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                          {isWalletConnect ? 'Scan QR code' : 'Browser extension'}
                        </span>
                      </div>

                      {/* Connecting indicator */}
                      {isConnecting && (
                        <span className="text-[10px] text-[#3ec470] font-bold uppercase tracking-wider">
                          Connecting…
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer note */}
              <p className="mt-5 text-[10px] text-white/30 text-center font-mono">
                By connecting, you agree to NADBID&apos;s Terms of Service
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
