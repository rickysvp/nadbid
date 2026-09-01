/**
 * Mock 交易工具 — 模拟链上交易全流程（准备 → 签名 → 提交 → 确认）
 * 仅用于 Phase 3 前端开发与联调，不涉及真实钱包或链上交互。
 */
import { sleep } from './transaction';

export interface MockTransactionOptions {
  /** 准备阶段延迟（ms），默认 500 */
  prepareDelay?: number;
  /** 签名阶段延迟（ms），默认 1000 */
  signDelay?: number;
  /** 确认阶段延迟（ms），默认 2000 */
  confirmDelay?: number;
  /** 失败概率，范围 0-1，默认 0（永不失败） */
  failureRate?: number;
  /** 失败时返回的错误信息 */
  failureReason?: string;
}

export interface MockTransactionResult {
  /** 模拟交易哈希 */
  txHash: string;
  /** 是否成功 */
  success: boolean;
  /** 失败时的错误信息 */
  error?: string;
}

/** 生成 0x 前缀 + 64 位随机十六进制字符的模拟交易哈希 */
export function generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * 执行模拟交易，依次经历准备、签名、提交、确认四个阶段。
 * 按 failureRate 概率在签名或确认阶段返回失败结果。
 */
export async function executeMockTransaction(
  options: MockTransactionOptions = {},
): Promise<MockTransactionResult> {
  const {
    prepareDelay = 500,
    signDelay = 1000,
    confirmDelay = 2000,
    failureRate = 0,
    failureReason,
  } = options;

  const txHash = generateMockTxHash();
  const errorMessage = failureReason || 'Mock transaction failed';

  // 预先决定本次交易是否失败，以及失败发生的阶段
  const willFail = Math.random() < failureRate;
  const failAtSign = willFail && Math.random() < 0.5;

  // 阶段 1：准备
  await sleep(prepareDelay);

  // 阶段 2：签名（可能在此失败）
  await sleep(signDelay);
  if (failAtSign) {
    return { txHash, success: false, error: errorMessage };
  }

  // 阶段 3：提交（瞬时，交易已上链等待确认）
  // 阶段 4：确认（可能在此失败）
  await sleep(confirmDelay);
  if (willFail && !failAtSign) {
    return { txHash, success: false, error: errorMessage };
  }

  return { txHash, success: true };
}
