import { useCallback, useMemo, useState } from 'react';
import type { ClaimRecord, PendingReward } from '../types';
import type { TransactionStatusType } from '../components/trade/TransactionStatus';
import { useWalletStore } from '../stores/walletStore';
import { executeMockTransaction } from '../utils/mockTransaction';
import { mockClaimHistory, mockPendingRewards } from '../data/mockStaking';
import { sleep, resolveRunMode } from '../utils/transaction';
import { handleWeb3Error } from '../web3/web3Errors';

/** 领取交易状态 — 复用统一 7 态状态机（与 useStaking / usePassMintBurn / useAuctionBid 一致） */
export type ClaimStatus = TransactionStatusType;
/** 当前交易动作：claim（单项）/ claimAll（批量）/ 无 */
export type ClaimAction = 'claim' | 'claimAll' | null;

export interface ClaimResult {
  txHash: string;
  action: Exclude<ClaimAction, null>;
  /** 本次领取的奖励列表（供页面联动展示 / 更新） */
  rewards: PendingReward[];
  /** 本次领取总额（MON） */
  totalAmount: number;
}

export interface UseClaimOptions {
  /** 运行模式：mock（默认，Phase 3 联调）/ real（Phase 2 合约，预留） */
  mode?: 'mock' | 'real';
  /** mock 模式失败概率 0-1，默认 0（用于联调错误分支） */
  failureRate?: number;
  /** mock 模式失败原因 */
  failureReason?: string;
}

export interface UseClaimReturn {
  status: ClaimStatus;
  action: ClaimAction;
  txHash: string | null;
  error: string | null;
  /** 最近一次成功领取金额（MON） */
  amount: number;
  /** 最近一次成功领取的奖励数量 */
  claimedCount: number;
  isSubmitting: boolean;
  /** 待领取奖励列表（可领取状态，来源 mockPendingRewards） */
  pendingRewards: PendingReward[];
  /** 领取历史（最新在前，来源 mockClaimHistory，成功后追加） */
  history: ClaimRecord[];
  /** 单项领取：校验后执行一笔 mock 交易，成功后移除该奖励并写入历史 */
  claim: (rewardId: string) => Promise<ClaimResult | null>;
  /** 批量领取：默认领取全部待领取奖励（单笔交易），可传 rewardIds 指定子集 */
  claimAll: (rewardIds?: string[]) => Promise<ClaimResult | null>;
  reset: () => void;
}

const PROCESSING: ClaimStatus[] = ['preparing', 'signing', 'pending', 'confirming'];

/** 奖励是否可领取：状态为 CLAIMABLE（缺省视为可领取）且数额 > 0 */
function isClaimableReward(reward: PendingReward): boolean {
  if (reward.status && reward.status !== 'CLAIMABLE') return false;
  return Number.isFinite(reward.amount) && reward.amount > 0;
}

/** 生成领取历史事件的展示文案（按奖励类型区分） */
function claimEventLabel(reward: PendingReward): string {
  switch (reward.type) {
    case 'STAKING':
      return `Claimed Staking Rewards (${reward.title})`;
    case 'REFUND':
      return `Auction Refund: ${reward.title}`;
    case 'ROYALTY':
      return `Claimed Royalty (${reward.title})`;
    case 'REFERRAL':
      return `Claimed Referral Bonus (${reward.title})`;
    default:
      return `Claimed Rewards (${reward.title})`;
  }
}

/**
 * 领取奖励（Claim / Claim All）交易 Hook：
 * - 领取来源：待领取奖励列表（Staking 收益、拍卖退款等），状态须为 CLAIMABLE 且数额 > 0。
 * - 单项 claim(rewardId)：领取单个奖励；批量 claimAll(rewardIds?)：单笔交易领取全部
 *   （未传 rewardIds 时取全部 pending）。
 * - 校验链：钱包已连接 → 奖励存在且状态 CLAIMABLE → 数额 > 0。
 * - mock 模式：通过 executeMockTransaction 驱动 7 态状态机；real 模式为 Phase 2 预留。
 * - 成功后：奖励状态置为 CLAIMED（从 pending 移除）、写入领取历史（SETTLED）、
 *   refreshBalance 计入领取入账（负数 spentAmount = 资金流入），不引入乐观扣减。
 * - 返回 { txHash, action, rewards, totalAmount }，供页面联动更新列表与历史。
 */
export function useClaim(options: UseClaimOptions = {}): UseClaimReturn {
  const { mode: modeOverride, failureRate = 0, failureReason } = options;
  const mode = resolveRunMode(modeOverride);

  const wallet = useWalletStore();

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [action, setAction] = useState<ClaimAction>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [claimedCount, setClaimedCount] = useState<number>(0);

  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>(() =>
    mockPendingRewards.map((r) => ({ ...r, status: r.status ?? 'CLAIMABLE' })),
  );
  const [history, setHistory] = useState<ClaimRecord[]>(() => [...mockClaimHistory]);

  const isSubmitting = PROCESSING.includes(status);

  const reset = useCallback(() => {
    setStatus('idle');
    setAction(null);
    setTxHash(null);
    setError(null);
    setAmount(0);
    setClaimedCount(0);
  }, []);

  /** mock 模式统一交易执行：准备 → 签名 → 提交 → 确认（含失败判定） */
  const runMockTransaction = useCallback(async () => {
    setStatus('preparing');
    setTxHash(null);
    setError(null);

    try {
      // 阶段 1：准备
      await sleep(400);
      // 阶段 2：签名
      setStatus('signing');
      await sleep(700);
      // 阶段 3：提交（瞬时，交易已上链等待确认）
      setStatus('pending');

      // 阶段 4：确认（mockTransaction 产出权威结果，含失败判定）
      const result = await executeMockTransaction({
        prepareDelay: 0,
        signDelay: 0,
        confirmDelay: 0,
        failureRate,
        failureReason,
      });

      setStatus('confirming');
      setTxHash(result.txHash);
      await sleep(1100);

      if (!result.success) {
        setStatus('error');
        setError(result.error || 'Claim transaction failed');
        return null;
      }
      return result;
    } catch (e) {
      // 统一错误处理：用户拒绝 → 静默回 idle；其余 → error 展示可读文案
      const info = handleWeb3Error(e, 'Claim transaction failed');
      if (info.silent) {
        setStatus('idle');
        setError(null);
      } else {
        setStatus('error');
        setError(info.message);
      }
      return null;
    }
  }, [failureRate, failureReason]);

  /** 交易成功：把领取的奖励从 pending 移除（状态置为 CLAIMED）、写入历史（共用同一 txHash） */
  const settleRewards = useCallback((rewards: PendingReward[], tx: string) => {
    const claimedIds = new Set(rewards.map((r) => r.id));
    const now = Date.now();
    const newRecords: ClaimRecord[] = rewards.map((r, i) => ({
      id: `claim-${now}-${i}`,
      status: 'SETTLED',
      event: claimEventLabel(r),
      type: r.type,
      amount: r.amount,
      timestamp: now,
      txHash: tx,
    }));
    setPendingRewards((prev) => prev.filter((r) => !claimedIds.has(r.id)));
    setHistory((prev) => [...newRecords, ...prev]);
  }, []);

  const claim = useCallback(
    async (rewardId: string): Promise<ClaimResult | null> => {
      // ===== Claim 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      const reward = pendingRewards.find((r) => r.id === rewardId);
      if (!reward) {
        setStatus('error');
        setError('Reward not found or already claimed');
        return null;
      }
      if (!isClaimableReward(reward)) {
        setStatus('error');
        setError(`Reward "${reward.title}" is not claimable yet`);
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Claim contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setAction('claim');
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：从 pending 移除 → 写入历史 → 刷新余额（领取为资金流入）
      settleRewards([reward], result.txHash);
      await wallet.refreshBalance(-reward.amount);
      setAmount(reward.amount);
      setClaimedCount(1);
      setStatus('success');
      return { txHash: result.txHash, action: 'claim', rewards: [reward], totalAmount: reward.amount };
    },
    [wallet, mode, runMockTransaction, settleRewards, pendingRewards],
  );

  const claimAll = useCallback(
    async (rewardIds?: string[]): Promise<ClaimResult | null> => {
      // ===== Claim All 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      const targets =
        rewardIds && rewardIds.length > 0
          ? pendingRewards.filter((r) => rewardIds.includes(r.id))
          : pendingRewards;
      if (targets.length === 0) {
        setStatus('error');
        setError('No rewards available to claim');
        return null;
      }
      const invalid = targets.find((r) => !isClaimableReward(r));
      if (invalid) {
        setStatus('error');
        setError(`Reward "${invalid.title}" is not claimable yet`);
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Claim contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易（单笔批量领取） =====
      setAction('claimAll');
      const result = await runMockTransaction();
      if (!result) return null;

      const totalAmount = targets.reduce((sum, r) => sum + r.amount, 0);
      settleRewards(targets, result.txHash);
      await wallet.refreshBalance(-totalAmount);
      setAmount(totalAmount);
      setClaimedCount(targets.length);
      setStatus('success');
      return { txHash: result.txHash, action: 'claimAll', rewards: targets, totalAmount };
    },
    [wallet, mode, runMockTransaction, settleRewards, pendingRewards],
  );

  return useMemo(
    () => ({
      status,
      action,
      txHash,
      error,
      amount,
      claimedCount,
      isSubmitting,
      pendingRewards,
      history,
      claim,
      claimAll,
      reset,
    }),
    [
      status,
      action,
      txHash,
      error,
      amount,
      claimedCount,
      isSubmitting,
      pendingRewards,
      history,
      claim,
      claimAll,
      reset,
    ],
  );
}
