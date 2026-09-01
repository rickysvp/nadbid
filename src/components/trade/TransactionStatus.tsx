import { motion } from 'motion/react';
import {
  Clock,
  Loader2,
  Wallet,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';

/** 交易状态类型 — 7 种状态，与组件名区分避免冲突 */
export type TransactionStatusType =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error';

export interface TransactionStatusProps {
  status: TransactionStatusType;
  txHash?: string;
  error?: string;
  /** 预留：链 ID，当前浏览器链接固定使用 testnet.monadexplorer.com */
  chainId?: number;
}

interface StatusConfig {
  icon: typeof Clock;
  label: string;
  textClass: string;
  iconClass?: string;
  spin?: boolean;
}

const statusConfig: Record<TransactionStatusType, StatusConfig> = {
  idle: {
    icon: Clock,
    label: 'Idle',
    textClass: 'text-gray-400',
  },
  preparing: {
    icon: Loader2,
    label: 'Preparing...',
    textClass: 'text-blue-400',
    spin: true,
  },
  signing: {
    icon: Wallet,
    label: 'Waiting for signature...',
    textClass: 'text-amber-400',
  },
  pending: {
    icon: Send,
    label: 'Transaction submitted...',
    textClass: 'text-blue-400',
  },
  confirming: {
    icon: Loader2,
    label: 'Confirming...',
    textClass: 'text-blue-400',
    spin: true,
  },
  success: {
    icon: CheckCircle,
    label: 'Confirmed',
    textClass: 'text-[#3ec470]',
  },
  error: {
    icon: XCircle,
    label: 'Failed',
    textClass: 'text-red-400',
  },
};

/** 截断交易哈希为 0x1234...abcd 形式 */
function shortenTxHash(hash: string): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * 交易状态显示组件 — 深色小卡片，展示当前交易阶段、图标与文字。
 * success 时显示区块浏览器链接，error 时显示错误信息。
 */
export function TransactionStatus({
  status,
  txHash,
  error,
}: TransactionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      key={status}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={cn(
            'h-5 w-5',
            config.textClass,
            config.spin && 'animate-spin',
          )}
        />
        <span className={cn('text-sm font-medium', config.textClass)}>
          {config.label}
        </span>
      </div>

      {status === 'success' && txHash && (
        <a
          href={`https://testnet.monadexplorer.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
        >
          {shortenTxHash(txHash)}
        </a>
      )}

      {status === 'error' && error && (
        <p className="max-w-full break-words text-center font-mono text-xs text-red-400/90">
          {error}
        </p>
      )}
    </motion.div>
  );
}
