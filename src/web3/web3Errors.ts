import type { ToastType } from '../types';

/**
 * Web3 错误处理工具 — 将 wagmi/viem 原始错误转换为用户友好消息。
 *
 * 错误分类：
 *   - UserRejectedError: 用户在钱包弹窗中拒绝签名/交易
 *   - NetworkError: 网络/RPC 错误、链未添加、链切换失败
 *   - ContractError: 合约执行 revert（含自定义错误）
 *   - InsufficientGasError: gas 不足
 *   - UnknownError: 其他未分类错误
 */

// ============================================================================
// 错误类型定义
// ============================================================================

export type Web3ErrorType =
  | 'user_rejected'
  | 'network_error'
  | 'contract_error'
  | 'insufficient_gas'
  | 'unknown';

export interface Web3ErrorInfo {
  type: Web3ErrorType;
  /** 用户友好的错误消息（英文，与全站 UI 语言一致） */
  message: string;
  /** 原始错误对象（调试用） */
  raw: unknown;
  /** 是否应静默处理（如用户拒绝不应弹错误 toast） */
  silent: boolean;
}

// ============================================================================
// 常见错误码
// ============================================================================

/** EIP-1193 用户拒绝 */
const USER_REJECTED_CODES = new Set([4001, -32000, -32603]);

/** viem 常见错误消息片段 */
const CONTRACT_REVERT_PATTERNS = [
  'reverted',
  'revert',
  'execution reverted',
  'transaction reverted',
];

const INSUFFICIENT_GAS_PATTERNS = [
  'insufficient funds',
  'gas required exceeds',
  'out of gas',
  'intrinsic gas too low',
];

const NETWORK_ERROR_PATTERNS = [
  'chain not added',
  'unrecognized chain',
  'network error',
  'failed to fetch',
  'could not detect network',
  'underlying network changed',
];

// ============================================================================
// 错误分类与消息格式化
// ============================================================================

/**
 * 从原始错误中提取 viem/wagmi 错误码。
 * viem 错误通常有 .code（number）或 .error.code。
 */
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

/**
 * 从原始错误中提取可读消息字符串。
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return 'Unknown error';
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
  return 'Unknown error';
}

/**
 * 分类原始 Web3 错误并生成用户友好消息。
 */
export function classifyWeb3Error(error: unknown): Web3ErrorInfo {
  const code = extractErrorCode(error);
  const rawMessage = extractErrorMessage(error).toLowerCase();

  // 1. 用户拒绝
  if (code !== undefined && USER_REJECTED_CODES.has(code)) {
    return {
      type: 'user_rejected',
      message: 'Transaction rejected by user.',
      raw: error,
      silent: true,
    };
  }
  if (rawMessage.includes('user rejected') || rawMessage.includes('user denied')) {
    return {
      type: 'user_rejected',
      message: 'Transaction rejected by user.',
      raw: error,
      silent: true,
    };
  }

  // 2. 网络错误
  if (NETWORK_ERROR_PATTERNS.some((p) => rawMessage.includes(p))) {
    let message = 'Network error. Please check your connection and try again.';
    if (rawMessage.includes('chain not added') || rawMessage.includes('unrecognized chain')) {
      message = 'This network is not added to your wallet. Please add it and try again.';
    }
    return { type: 'network_error', message, raw: error, silent: false };
  }

  // 3. Gas 不足
  if (INSUFFICIENT_GAS_PATTERNS.some((p) => rawMessage.includes(p))) {
    return {
      type: 'insufficient_gas',
      message: 'Insufficient funds for gas. Please check your balance and try again.',
      raw: error,
      silent: false,
    };
  }

  // 4. 合约 revert
  if (CONTRACT_REVERT_PATTERNS.some((p) => rawMessage.includes(p))) {
    // 尝试提取 revert reason
    const fullMessage = extractErrorMessage(error);
    const reasonMatch = fullMessage.match(/reverted(?: with reason)?:?\s*(.+)/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : null;
    return {
      type: 'contract_error',
      message: reason
        ? `Transaction failed: ${reason}`
        : 'Transaction failed. The contract reverted without a reason.',
      raw: error,
      silent: false,
    };
  }

  // 5. 未知错误
  return {
    type: 'unknown',
    message: `Something went wrong: ${extractErrorMessage(error)}`,
    raw: error,
    silent: false,
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
 * 一键处理 Web3 错误并触发 toast。
 * 用户拒绝时静默（不弹错误 toast），其他错误显示详细消息。
 *
 * @example
 * try {
 *   await writeContractAsync(...);
 * } catch (err) {
 *   handleWeb3Error(err, toast);
 * }
 */
export function handleWeb3Error(error: unknown, toast: ToastLike): Web3ErrorInfo {
  const info = classifyWeb3Error(error);
  if (!info.silent) {
    toast.error(info.message);
  }
  // 开发环境下输出原始错误便于调试
  if (import.meta.env.DEV) {
    console.warn('[web3 error]', info.type, info.raw);
  }
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
