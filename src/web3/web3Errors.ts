import type { ToastType } from '../types';

/**
 * Web3 错误处理工具 — 统一错误分类与展示策略。
 *
 * 供两类调用方共用（保证全应用对交易错误行为一致）：
 *   - 真实 wagmi hooks（useWriteContractTx / useSignMessage / useReadContract）：
 *     handleWeb3Error(error, toast) — 自动弹 toast，用户拒绝静默。
 *   - 业务交易 hooks（useAuctionBid / usePassMintBurn / useStaking / useClaim /
 *     useArbitrationVote）：handleWeb3Error(error, fallbackMessage) — 仅返回分类结果，
 *     由调用方自行决定展示（通常经 TradeConfirmationModal）。
 *
 * 错误分类：
 *   - USER_REJECTED（用户拒绝签名/交易）→ silent=true，调用方应「静默处理」：
 *     重置回 idle 状态、不展示错误弹窗，用户可重新发起或关闭。
 *   - NETWORK（网络 / 节点错误）→ retryable=true，配合 TradeConfirmationModal
 *     的 Retry 按钮提供重试选项。
 *   - INSUFFICIENT_FUNDS（余额不足 / gas 不足）→ 明确提示，不可重试。
 *   - CONTRACT（合约回滚）→ 展示合约返回的错误信息。
 *   - UNKNOWN（其他）→ 兜底展示原始错误或 fallback 文案。
 */

export type Web3ErrorCategory =
  | 'USER_REJECTED'
  | 'NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'CONTRACT'
  | 'UNKNOWN';

/** 兼容旧分类名（Phase 2 早期版本） */
export type Web3ErrorType =
  | 'user_rejected'
  | 'network_error'
  | 'contract_error'
  | 'insufficient_gas'
  | 'unknown';

export interface Web3ErrorInfo {
  /** 错误分类（新分类名） */
  category: Web3ErrorCategory;
  /** 兼容旧分类名（Phase 2 早期版本，按 category 映射） */
  type: Web3ErrorType;
  /** 面向用户的展示文案 */
  message: string;
  /** 原始错误对象（调试用） */
  raw: unknown;
  /** 是否应静默处理（用户拒绝交易时为 true，调用方应重置而非展示错误） */
  silent: boolean;
  /** 是否可重试（网络类错误为 true，展示 Retry 选项） */
  retryable: boolean;
}

const USER_REJECTED_PATTERNS: RegExp[] = [
  /user rejected/i,
  /user denied/i,
  /user cancelled/i,
  /user canceled/i,
  /rejected by user/i,
  /request rejected/i,
  /transaction.*rejected/i,
  /action rejected/i,
  /declined.*(request|transaction)/i,
  /err_user_rejected/i,
  /-32003/i, // MetaMask: user rejected
  /4001/i, // MetaMask: user rejected request
];

const NETWORK_PATTERNS: RegExp[] = [
  /network error/i,
  /network request failed/i,
  /fetch failed/i,
  /could not reach/i,
  /host unreachable/i,
  /timeout/i,
  /etimedout/i,
  /econnrefused/i,
  /connection refused/i,
  /unable to reach/i,
  /not connected to network/i,
  /rate limit/i,
  /-32603/i, // internal JSON-RPC error（常见于节点/网络层）
  /chain not added/i,
  /unrecognized chain/i,
  /underlying network changed/i,
];

const INSUFFICIENT_FUNDS_PATTERNS: RegExp[] = [
  /insufficient funds/i,
  /insufficient balance/i,
  /not enough funds/i,
  /insufficient.*for gas/i,
  /exceeds.*balance/i,
  /out of gas/i,
  /gas required exceeds/i,
  /intrinsic gas too low/i,
];

/** 提取可读的错误文本（Error.message / viem shortMessage / 字符串 / JSON 序列化） */
function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null) return String(error ?? '');
  const e = error as Record<string, unknown>;
  // viem 错误优先使用 shortMessage
  if (typeof e.shortMessage === 'string') return e.shortMessage;
  if (typeof e.message === 'string') return e.message;
  if (e.error && typeof e.error === 'object') {
    const inner = e.error as Record<string, unknown>;
    if (typeof inner.shortMessage === 'string') return inner.shortMessage;
    if (typeof inner.message === 'string') return inner.message;
  }
  if (typeof e.details === 'string') return e.details;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** 提取 viem/wagmi 错误码（用于补充消息模式识别） */
function extractErrorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.code === 'number') return e.code;
  if (e.error && typeof e.error === 'object') {
    const inner = e.error as Record<string, unknown>;
    if (typeof inner.code === 'number') return inner.code;
  }
  return undefined;
}

/** 分类名 → 旧分类名映射（兼容 Phase 2 早期消费方） */
function categoryToLegacyType(category: Web3ErrorCategory): Web3ErrorType {
  switch (category) {
    case 'USER_REJECTED':
      return 'user_rejected';
    case 'NETWORK':
      return 'network_error';
    case 'INSUFFICIENT_FUNDS':
      return 'insufficient_gas';
    case 'CONTRACT':
      return 'contract_error';
    default:
      return 'unknown';
  }
}

/**
 * 纯分类：把任意异常归类为 Web3ErrorInfo。
 * @param fallbackMessage 无法识别时的兜底文案
 */
export function classifyWeb3Error(
  error: unknown,
  fallbackMessage = 'Transaction failed',
): Web3ErrorInfo {
  const text = errorText(error);
  const code = extractErrorCode(error);
  const rawMessage = text.toLowerCase();

  const isUserRejected =
    USER_REJECTED_PATTERNS.some((re) => re.test(text)) ||
    (code !== undefined && (code === 4001 || code === -32003));
  if (isUserRejected) {
    return {
      category: 'USER_REJECTED',
      type: 'user_rejected',
      message: 'Transaction rejected by user',
      raw: error,
      silent: true,
      retryable: false,
    };
  }
  if (NETWORK_PATTERNS.some((re) => re.test(text)) || rawMessage.includes('failed to fetch')) {
    return {
      category: 'NETWORK',
      type: 'network_error',
      message: 'Network error. Please check your connection and retry.',
      raw: error,
      silent: false,
      retryable: true,
    };
  }
  if (INSUFFICIENT_FUNDS_PATTERNS.some((re) => re.test(text))) {
    return {
      category: 'INSUFFICIENT_FUNDS',
      type: 'insufficient_gas',
      message: 'Insufficient funds for this transaction.',
      raw: error,
      silent: false,
      retryable: false,
    };
  }
  // 合约回滚（revert）与未知错误：展示可读信息，必要时回退到 fallback
  const isContractRevert = /revert|reverted|execution reverted|call exception/i.test(text);
  return {
    category: isContractRevert ? 'CONTRACT' : 'UNKNOWN',
    type: categoryToLegacyType(isContractRevert ? 'CONTRACT' : 'UNKNOWN'),
    message: text || fallbackMessage,
    raw: error,
    silent: false,
    retryable: isContractRevert,
  };
}

// ============================================================================
// Toast 集成辅助
// ============================================================================

export interface ToastLike {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

/**
 * 一键处理 Web3 错误。支持两种调用形态：
 *   1. handleWeb3Error(error, toast) — 自动弹 toast（真实 wagmi hooks 使用）；
 *      用户拒绝时静默（不弹错误 toast）。
 *   2. handleWeb3Error(error, fallbackMessage?) — 仅返回分类结果（业务交易 hooks 使用），
 *      由调用方自行决定展示。
 * 两种形态都返回 Web3ErrorInfo，调用方可读取 silent/retryable 决定后续行为。
 *
 * @example
 * // 形态 1：自动弹 toast
 * try { await writeContractAsync(...) } catch (err) { handleWeb3Error(err, toast); }
 * // 形态 2：返回分类结果，自行展示
 * const info = handleWeb3Error(e, 'Bid transaction failed');
 * if (info.silent) { /* 静默重置 *&#47; }
 */
export function handleWeb3Error(error: unknown, toast: ToastLike): Web3ErrorInfo;
export function handleWeb3Error(error: unknown, fallbackMessage?: string): Web3ErrorInfo;
export function handleWeb3Error(
  error: unknown,
  arg?: ToastLike | string,
): Web3ErrorInfo {
  const info = classifyWeb3Error(error);
  // 形态 1：第二参数为 toast-like 对象（含 error 方法）→ 自动弹 toast
  if (arg && typeof arg === 'object' && typeof (arg as ToastLike).error === 'function') {
    const toast = arg as ToastLike;
    if (!info.silent) {
      toast.error(info.message);
    }
    // 开发环境下输出原始错误便于调试
    if (import.meta.env.DEV) {
      console.warn('[web3 error]', info.type, info.raw);
    }
  }
  // 形态 2：第二参数为字符串 → 作为 fallback 文案已由 classifyWeb3Error 处理
  return info;
}

/**
 * 获取错误对应的 toast 类型（用于自定义处理）。
 */
export function getErrorToastType(type: Web3ErrorType): ToastType {
  switch (type) {
    case 'user_rejected':
      return 'info';
    case 'network_error':
      return 'warning';
    case 'contract_error':
    case 'insufficient_gas':
    case 'unknown':
      return 'error';
  }
}
