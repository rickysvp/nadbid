import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { TransactionStatus } from './TransactionStatus';
import type { TransactionStatusType } from './TransactionStatus';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

export interface TradeDetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface TradeConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  details?: TradeDetailItem[];
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  status: TransactionStatusType;
  txHash?: string;
  error?: string;
  /** 预留：链 ID，透传给 TransactionStatus */
  chainId?: number;
}

const PROCESSING_STATUSES: TransactionStatusType[] = [
  'preparing',
  'signing',
  'pending',
  'confirming',
];

/** 截断交易哈希为 0x1234...abcd 形式 */
function shortenHash(hash: string): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * 通用交易确认弹窗 — 完全受控组件。
 * 支持 idle（确认详情）、处理中（状态展示）、success、error 四种内容分支。
 */
export function TradeConfirmationModal({
  open,
  onClose,
  title,
  description,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  status,
  txHash,
  error,
  chainId,
}: TradeConfirmationModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const prevStatusRef = useRef<TransactionStatusType>(status);
  const isProcessing = PROCESSING_STATUSES.includes(status);

  // 状态变化时触发 Toast 通知（用 ref 避免重复触发）
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === status) return;

    if (status === 'pending') {
      toastSuccess('Transaction submitted');
    } else if (status === 'success') {
      toastSuccess('Transaction confirmed');
    } else if (status === 'error') {
      toastError(error || 'Transaction failed');
    }

    prevStatusRef.current = status;
  }, [status, error, toastSuccess, toastError]);

  // ESC 键关闭：仅 idle / success / error 状态生效
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isProcessing, onClose]);

  const handleOverlayClick = () => {
    // 仅 idle 状态允许点击遮罩关闭
    if (status === 'idle') {
      onClose();
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
            {/* ===== idle：确认详情 ===== */}
            {status === 'idle' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  {description && (
                    <p className="mt-1.5 text-sm text-gray-400">{description}</p>
                  )}
                </div>

                {details && details.length > 0 && (
                  <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
                    {details.map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <span className="text-xs text-gray-400">{d.label}</span>
                        <span
                          className={cn(
                            'font-mono text-sm',
                            d.highlight ? 'font-bold text-[#3ec470]' : 'text-white',
                          )}
                        >
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={onClose}>
                    {cancelText}
                  </Button>
                  <Button variant="default" fullWidth onClick={onConfirm}>
                    {confirmText}
                  </Button>
                </div>
              </div>
            )}

            {/* ===== 处理中：状态展示 ===== */}
            {isProcessing && (
              <div className="flex flex-col items-center py-4">
                <TransactionStatus
                  status={status}
                  txHash={txHash}
                  error={error}
                  chainId={chainId}
                />
              </div>
            )}

            {/* ===== success ===== */}
            {status === 'success' && (
              <div className="flex flex-col items-center gap-4 py-2">
                <CheckCircle className="h-14 w-14 text-[#3ec470]" />
                <h2 className="text-lg font-bold text-white">Transaction Confirmed!</h2>
                {txHash && (
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {shortenHash(txHash)}
                  </a>
                )}
                <Button variant="default" fullWidth onClick={onClose} className="mt-2">
                  Done
                </Button>
              </div>
            )}

            {/* ===== error ===== */}
            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 py-2">
                <XCircle className="h-14 w-14 text-red-400" />
                <h2 className="text-lg font-bold text-white">Transaction Failed</h2>
                {error && (
                  <p className="max-w-full break-words text-center font-mono text-xs text-red-400/90">
                    {error}
                  </p>
                )}
                <div className="flex w-full gap-3 mt-2">
                  <Button variant="secondary" fullWidth onClick={onClose}>
                    Close
                  </Button>
                  <Button variant="default" fullWidth onClick={onConfirm}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
