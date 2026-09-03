import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnect } from 'wagmi';
import type { Connector } from 'wagmi';
import { Wallet, X, QrCode, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  /** 连接成功后的回调（可选，用于继续出价等后续流程） */
  onConnected?: () => void;
}

/**
 * 钱包连接引导弹窗 — 未连接钱包时点击出价 / 质押 / 领取等触发。
 *
 * 使用真实 wagmi useConnect 渲染 connectors（MetaMask injected + WalletConnect），
 * 连接成功后调用 onClose / onConnected，状态由 WalletStateSyncer 自动同步到 walletStore。
 * 视觉与 TradeConfirmationModal 保持一致（深色弹窗 + 绿色 CTA）。
 */
export function ConnectModal({ open, onClose, onConnected }: ConnectModalProps) {
  const { connectors, connectAsync, isPending, error, reset } = useConnect();
  const { error: toastError } = useToast();
  const [connectingUid, setConnectingUid] = useState<string | null>(null);

  // 打开弹窗时清除上一次的连接错误状态
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // ESC 关闭（连接中不允许）
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isPending, onClose]);

  const handleConnect = async (connector: Connector) => {
    if (isPending) return;
    setConnectingUid(connector.uid);
    try {
      await connectAsync({ connector });
      onClose();
      onConnected?.();
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900/95 p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              disabled={isPending}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#3ec470]/20 bg-[#3ec470]/10">
                <Wallet className="h-7 w-7 text-[#3ec470]" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">Connect Your Wallet</h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Connect your wallet to start bidding on this auction.
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-left">
                  {error.message ?? 'Connection failed'}
                </div>
              )}

              {/* 钱包选择列表（真实 wagmi connectors） */}
              <div className="w-full space-y-2.5">
                {connectors.map((connector) => {
                  const isConnecting = isPending && connectingUid === connector.uid;
                  const isWalletConnect = connector.type === 'walletConnect';
                  return (
                    <button
                      key={connector.uid}
                      type="button"
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-white/[0.03] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/[0.08] hover:border-[#3ec470]/40"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#3ec470]/10 border border-[#3ec470]/20 flex items-center justify-center flex-shrink-0">
                        {isConnecting ? (
                          <Loader2 className="w-4.5 h-4.5 text-[#3ec470] animate-spin" />
                        ) : isWalletConnect ? (
                          <QrCode className="w-4.5 h-4.5 text-[#3ec470]" />
                        ) : (
                          <Wallet className="w-4.5 h-4.5 text-[#3ec470]" />
                        )}
                      </div>
                      <span className="flex-1 text-left font-bold text-sm text-white">
                        {connector.name}
                      </span>
                      {isConnecting && (
                        <span className="text-[10px] text-[#3ec470] font-bold uppercase tracking-wider">
                          Connecting…
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
