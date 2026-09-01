import { useCallback, useMemo, useState } from 'react';
import type { TransactionStatusType } from '../components/trade/TransactionStatus';
import { useWalletStore } from '../stores/walletStore';
import { normalizeHandle, useKolHoldingsStore } from '../stores/kolHoldingsStore';
import { executeMockTransaction } from '../utils/mockTransaction';
import { sleep, resolveRunMode } from '../utils/transaction';
import { handleWeb3Error } from '../web3/web3Errors';

/** 质押交易状态 — 复用统一 7 态状态机（与 usePassMintBurn / useAuctionBid 一致） */
export type StakingStatus = TransactionStatusType;
/** 当前交易动作：stake / unstake / 无 */
export type StakingAction = 'stake' | 'unstake' | null;

export interface StakeParams {
  /** KOL handle（无 @ 前缀，与持仓 store key 一致） */
  kolHandle: string;
  /** KOL 显示名（用于错误信息） */
  kolName?: string;
  /** 质押数量（> 0 且 ≤ 可用持仓） */
  amount: number;
  /** 可用（未质押）持仓：校验「可用持仓足够」 */
  maxAmount: number;
}

export interface UnstakeParams {
  /** 质押仓位 ID（页面用于定位 staked 行） */
  positionId: string;
  /** KOL handle（无 @ 前缀） */
  kolHandle: string;
  /** KOL 显示名 */
  kolName?: string;
  /** 解押数量（> 0 且 ≤ 已质押数量） */
  amount: number;
  /** 该仓位已质押总数量：校验「质押数量足够」 */
  stakedAmount: number;
  /** 解锁期是否已过（PENDING 激活中 / UNLOCKING 未到期 → false 拦截） */
  unlockPassed: boolean;
}

export interface StakingResult {
  txHash: string;
  action: Exclude<StakingAction, null>;
  amount: number;
  kolHandle: string;
  /** 本次操作的质押仓位 ID（仅 unstake 返回，供页面定位行） */
  positionId?: string;
}

export interface UseStakingOptions {
  /** 运行模式：mock（默认，Phase 3 联调）/ real（Phase 2 合约，预留） */
  mode?: 'mock' | 'real';
  /** mock 模式失败概率 0-1，默认 0（用于联调错误分支） */
  failureRate?: number;
  /** mock 模式失败原因 */
  failureReason?: string;
}

export interface UseStakingReturn {
  status: StakingStatus;
  action: StakingAction;
  txHash: string | null;
  error: string | null;
  /** 最近一次成功交易数量 */
  amount: number;
  isSubmitting: boolean;
  stake: (params: StakeParams) => Promise<StakingResult | null>;
  unstake: (params: UnstakeParams) => Promise<StakingResult | null>;
  reset: () => void;
}

const PROCESSING: StakingStatus[] = ['preparing', 'signing', 'pending', 'confirming'];

/**
 * KOL PASS 质押（Stake）/ 解押（Unstake）交易 Hook：
 * - Stake：校验钱包已连接、数量 > 0、可用持仓足够（≤ maxAmount）；成功后
 *   removeHolding 减少可用持仓、refreshBalance 刷新余额（质押不消耗 MON）。
 * - Unstake：校验钱包已连接、数量 > 0、已质押数量足够（≤ stakedAmount）、解锁期已过
 *   （unlockPassed）；成功后 addHolding 返还可用持仓、refreshBalance 刷新余额。
 * - mock 模式：通过 executeMockTransaction 驱动 7 态状态机；real 模式为 Phase 2 预留。
 * - 成功后返回 { txHash, action, amount, kolHandle }，供页面把数据在
 *   「可质押 / 已质押」两张列表间移动。
 */
export function useStaking(options: UseStakingOptions = {}): UseStakingReturn {
  const { mode: modeOverride, failureRate = 0, failureReason } = options;
  const mode = resolveRunMode(modeOverride);

  const wallet = useWalletStore();
  const kolHoldings = useKolHoldingsStore();

  const [status, setStatus] = useState<StakingStatus>('idle');
  const [action, setAction] = useState<StakingAction>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);

  const isSubmitting = PROCESSING.includes(status);

  const reset = useCallback(() => {
    setStatus('idle');
    setAction(null);
    setTxHash(null);
    setError(null);
    setAmount(0);
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
        setError(result.error || 'Transaction failed');
        return null;
      }
      return result;
    } catch (e) {
      // 统一错误处理：用户拒绝 → 静默回 idle；其余 → error 展示可读文案
      const info = handleWeb3Error(e, 'Transaction failed');
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

  const stake = useCallback(
    async (params: StakeParams): Promise<StakingResult | null> => {
      const { kolHandle, kolName, amount: qty, maxAmount } = params;

      // ===== 重入保护：交易进行中拒绝重复发起 =====
      if (isSubmitting) return null;
      // ===== Stake 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        setStatus('error');
        setError('Stake amount must be greater than 0');
        return null;
      }
      if (qty > maxAmount) {
        setStatus('error');
        setError(
          `Insufficient available PASS. You have ${maxAmount} PASS available to stake${kolName ? ` for ${kolName}` : ''}, but tried to stake ${qty}.`,
        );
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Stake contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setAction('stake');
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：可用持仓减少（已质押 PASS 不再可重复质押）+ 刷新余额
      kolHoldings.removeHolding(normalizeHandle(kolHandle), qty);
      await wallet.refreshBalance(0);
      setAmount(qty);
      setStatus('success');
      return { txHash: result.txHash, action: 'stake', amount: qty, kolHandle: normalizeHandle(kolHandle) };
    },
    [mode, runMockTransaction, wallet, kolHoldings],
  );

  const unstake = useCallback(
    async (params: UnstakeParams): Promise<StakingResult | null> => {
      const { positionId, kolHandle, kolName, amount: qty, stakedAmount, unlockPassed } = params;

      // ===== 重入保护：交易进行中拒绝重复发起 =====
      if (isSubmitting) return null;
      // ===== Unstake 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        setStatus('error');
        setError('Unstake amount must be greater than 0');
        return null;
      }
      if (qty > stakedAmount) {
        setStatus('error');
        setError(
          `Insufficient staked PASS. You have ${stakedAmount} PASS staked${kolName ? ` for ${kolName}` : ''}, but tried to unstake ${qty}.`,
        );
        return null;
      }
      if (!unlockPassed) {
        setStatus('error');
        setError(
          'This position is still in its unlock period. Please wait until the unlock timer passes before unstaking.',
        );
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Unstake contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setAction('unstake');
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：可用持仓增加（解押返还 PASS）+ 刷新余额
      kolHoldings.addHolding(normalizeHandle(kolHandle), qty);
      await wallet.refreshBalance(0);
      setAmount(qty);
      setStatus('success');
      return {
        txHash: result.txHash,
        action: 'unstake',
        amount: qty,
        kolHandle: normalizeHandle(kolHandle),
        positionId,
      };
    },
    [mode, runMockTransaction, wallet, kolHoldings, isSubmitting],
  );

  return useMemo(
    () => ({ status, action, txHash, error, amount, isSubmitting, stake, unstake, reset }),
    [status, action, txHash, error, amount, isSubmitting, stake, unstake, reset],
  );
}
