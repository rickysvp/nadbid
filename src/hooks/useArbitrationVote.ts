import { useCallback, useMemo, useState } from 'react';
import type { Dispute } from '../types';
import type { TransactionStatusType } from '../components/trade/TransactionStatus';
import { useWalletStore } from '../stores/walletStore';
import { normalizeHandle, useKolHoldingsStore } from '../stores/kolHoldingsStore';
import { executeMockTransaction } from '../utils/mockTransaction';
import { mockDisputes } from '../data/mockStaking';
import { sleep, resolveRunMode } from '../utils/transaction';
import { handleWeb3Error } from '../web3/web3Errors';

/** 仲裁投票类型：SLASH 惩罚 / RELEASE 放行 */
export type ArbitrationVoteType = 'SLASH' | 'RELEASE';
/** 投票交易状态 — 复用统一 7 态状态机（与 useStaking / useClaim / useAuctionBid 一致） */
export type ArbitrationVoteStatus = TransactionStatusType;

export interface UseArbitrationVoteOptions {
  /** 运行模式：mock（默认，Phase 3 联调）/ real（Phase 2 合约，预留） */
  mode?: 'mock' | 'real';
  /** mock 模式失败概率 0-1，默认 0（用于联调错误分支） */
  failureRate?: number;
  /** mock 模式失败原因 */
  failureReason?: string;
}

export interface VoteResult {
  txHash: string;
  disputeId: string;
  voteType: ArbitrationVoteType;
}

export interface UseArbitrationVoteReturn {
  /** 争议列表（mock 数据源，投票成功后自动更新投票比例 / 用户投票状态） */
  disputes: Dispute[];
  status: ArbitrationVoteStatus;
  /** 当前进行中的投票类型（SLASH / RELEASE / 无） */
  voteType: ArbitrationVoteType | null;
  txHash: string | null;
  error: string | null;
  /** 当前进行中的争议 ID */
  disputeId: string | null;
  isSubmitting: boolean;
  /** 对指定争议投出 SLASH / RELEASE 一票（完整校验链 + mock 交易） */
  vote: (disputeId: string, voteType: ArbitrationVoteType) => Promise<VoteResult | null>;
  reset: () => void;
}

const PROCESSING: ArbitrationVoteStatus[] = ['preparing', 'signing', 'pending', 'confirming'];

/**
 * 仲裁投票（Arbitration Vote）交易 Hook：
 * - 争议由持有相关 PASS 的用户投票决定结果（SLASH 惩罚 / RELEASE 放行）。
 * - 每个用户对同一争议只能投一票（已有 userVote 时拦截）。
 * - 完整校验链：① 钱包已连接 → ② 持有相关 PASS（有投票权，读 kolHoldingsStore）→
 *   ③ 争议状态为投票中（VOTING）→ ④ 投票截止时间未到 → ⑤ 未投过票。
 * - mock 模式：通过 executeMockTransaction 驱动 7 态状态机；real 模式为 Phase 2 预留。
 * - 成功后：该争议投票比例更新（SLASH 增 votesFor / RELEASE 增 votesAgainst，权重 =
 *   用户投票权重 votingPower）、用户投票状态写入 userVote、refreshBalance 刷新余额
 *   （投票不消耗 MON），不引入乐观扣减。
 * - 失败时设置 error；用户拒绝交易时由页面调用 reset() 静默重置。
 * - 返回 { txHash, disputeId, voteType }，供页面联动更新投票条与状态。
 */
export function useArbitrationVote(options: UseArbitrationVoteOptions = {}): UseArbitrationVoteReturn {
  const { mode: modeOverride, failureRate = 0, failureReason } = options;
  const mode = resolveRunMode(modeOverride);

  const wallet = useWalletStore();

  const [disputes, setDisputes] = useState<Dispute[]>(() =>
    mockDisputes.map((d) => ({ ...d, userVote: d.userVote ?? null })),
  );
  const [status, setStatus] = useState<ArbitrationVoteStatus>('idle');
  const [voteType, setVoteType] = useState<ArbitrationVoteType | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);

  const isSubmitting = PROCESSING.includes(status);

  const reset = useCallback(() => {
    setStatus('idle');
    setVoteType(null);
    setTxHash(null);
    setError(null);
    setDisputeId(null);
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
        setError(result.error || 'Vote transaction failed');
        return null;
      }
      return result;
    } catch (e) {
      // 统一错误处理：用户拒绝 → 静默回 idle；其余 → error 展示可读文案
      const info = handleWeb3Error(e, 'Vote transaction failed');
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

  const vote = useCallback(
    async (targetId: string, targetVoteType: ArbitrationVoteType): Promise<VoteResult | null> => {
      // ===== 重入保护：交易进行中拒绝重复发起 =====
      if (isSubmitting) return null;
      // ===== 定位争议 =====
      const dispute = disputes.find((d) => d.id === targetId);

      // ===== 投票前完整校验链 =====
      // ① 钱包已连接
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      if (!dispute) {
        setStatus('error');
        setError('Dispute not found');
        return null;
      }
      // ③ 争议状态为投票中（VOTING）
      if (dispute.status !== 'VOTING') {
        setStatus('error');
        setError('This dispute is not open for voting');
        return null;
      }
      // ④ 投票截止时间未到
      if (Date.now() >= dispute.votingEndsAt) {
        setStatus('error');
        setError('Voting for this dispute has ended');
        return null;
      }
      // ⑤ 未投过票（每用户每争议只能投一票）
      if (dispute.userVote) {
        setStatus('error');
        setError(`You have already voted on this dispute`);
        return null;
      }
      // ② 持有相关 PASS（有投票权，读 kolHoldingsStore 实时持仓）
      const holding =
        useKolHoldingsStore.getState().holdings[normalizeHandle(dispute.auction.kol.handle)] ?? 0;
      if (holding <= 0) {
        setStatus('error');
        setError('You need to hold the related PASS to vote on this dispute');
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Arbitration vote contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setDisputeId(targetId);
      setVoteType(targetVoteType);
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：更新该争议投票比例（按用户投票权重）+ 用户投票状态 + 刷新余额
      const power = Math.max(1, dispute.votingPower);
      setDisputes((prev) =>
        prev.map((d) => {
          if (d.id !== targetId) return d;
          return {
            ...d,
            votesFor: d.votesFor + (targetVoteType === 'SLASH' ? power : 0),
            votesAgainst: d.votesAgainst + (targetVoteType === 'RELEASE' ? power : 0),
            userVote: targetVoteType,
          };
        }),
      );
      await wallet.refreshBalance(0);
      setStatus('success');
      return { txHash: result.txHash, disputeId: targetId, voteType: targetVoteType };
    },
    [wallet, mode, runMockTransaction, disputes, isSubmitting],
  );

  return useMemo(
    () => ({
      disputes,
      status,
      voteType,
      txHash,
      error,
      disputeId,
      isSubmitting,
      vote,
      reset,
    }),
    [disputes, status, voteType, txHash, error, disputeId, isSubmitting, vote, reset],
  );
}
