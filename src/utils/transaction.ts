/**
 * 交易共享工具 — 被 5 个业务交易 hook（useAuctionBid / usePassMintBurn /
 * useStaking / useClaim / useArbitrationVote）与 useWriteContractTx 共用，
 * 消除各 hook 内部重复定义。
 */

/** 延迟辅助（ms） */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 解析交易运行模式：显式入参 > 环境变量 VITE_AUCTION_MODE > 默认 mock。
 * real 模式为 Phase 2 合约接入预留；当前 Phase 3 全部走 mock。
 */
export function resolveRunMode(override?: 'mock' | 'real'): 'mock' | 'real' {
  if (override) return override;
  const env = (import.meta.env?.VITE_AUCTION_MODE as string | undefined)?.toLowerCase();
  return env === 'real' ? 'real' : 'mock';
}
