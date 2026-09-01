import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { useWalletStore } from '../../stores/walletStore';

export interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  /** 连接成功后的回调（可选，用于继续出价等后续流程） */
  onConnected?: () => void;
}

/**
 * 钱包连接引导弹窗 — 未连接钱包时点击出价触发。
 * 视觉与 TradeConfirmationModal 保持一致（深色弹窗 + 绿色 CTA）。
 */
export function ConnectModal({ open, onClose, onConnected }: ConnectModalProps) {
  const { isConnected, connect } = useWalletStore();
  const { success, error: toastError } = useToast();

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleConnect = async () => {
    try {
      await connect();
      success('Wallet connected successfully!');
      onClose();
      onConnected?.();
    } catch {
      toastError('Failed to connect wallet. Please try again.');
    }
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
            onClick={onClose}
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
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
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

              <Button variant="default" fullWidth onClick={handleConnect} disabled={isConnected}>
                {isConnected ? 'Connected' : 'Connect Wallet'}
              </Button>

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
