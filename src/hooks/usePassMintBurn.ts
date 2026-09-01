import { useCallback, useMemo, useState } from 'react';
import type { TransactionStatusType } from '../components/trade/TransactionStatus';
import { useWalletStore } from '../stores/walletStore';
import { normalizeHandle, useKolHoldingsStore } from '../stores/kolHoldingsStore';
import { executeMockTransaction } from '../utils/mockTransaction';
import { curvePriceAt, supplyAfterBurn, supplyAfterMint } from '../utils/bondingCurve';
import { sleep, resolveRunMode } from '../utils/transaction';
import { handleWeb3Error } from '../web3/web3Errors';

/** 交易状态 — 复用统一 7 态状态机（与 useAuctionBid 一致） */
export type MintBurnStatus = TransactionStatusType;
/** 当前交易动作：mint / burn / 无 */
export type MintBurnAction = 'mint' | 'burn' | null;

export interface PassMintParams {
  /** KOL handle（无 @ 前缀） */
  kolHandle: string;
  /** Mint 数量（> 0） */
  mintAmount: number;
  /** 当前单位价格（MON）：总成本 = mintAmount × costPerPass */
  costPerPass: number;
  /** 当前债券曲线供应量：用于计算 Mint 后的新供应量 / 新价格 */
  currentSupply: number;
}

export interface PassBurnParams {
  /** KOL handle（无 @ 前缀） */
  kolHandle: string;
  /** Burn 数量（> 0 且 ≤ 当前持仓） */
  burnAmount: number;
  /** 当前单位价格（MON）：总返还 = burnAmount × pricePerPass */
  pricePerPass: number;
  /** 当前债券曲线供应量：用于计算 Burn 后的新供应量 / 新价格 */
  currentSupply: number;
}

export interface MintBurnResult {
  txHash: string;
  amount: number;
  /** 交易成功后的新供应量（供页面更新曲线图） */
  newSupply: number;
  /** 交易成功后的新价格（MON，供页面更新 Overview / 曲线图） */
  newPrice: number;
}

export interface UsePassMintBurnOptions {
  /** 运行模式：mock（默认，Phase 3 联调）/ real（Phase 2 合约，预留） */
  mode?: 'mock' | 'real';
  /** mock 模式失败概率 0-1，默认 0（用于联调错误分支） */
  failureRate?: number;
  /** mock 模式失败原因 */
  failureReason?: string;
}

export interface UsePassMintBurnReturn {
  status: MintBurnStatus;
  action: MintBurnAction;
  txHash: string | null;
  error: string | null;
  /** 最近一次成功交易数量 */
  amount: number;
  isSubmitting: boolean;
  mintPass: (params: PassMintParams) => Promise<MintBurnResult | null>;
  burnPass: (params: PassBurnParams) => Promise<MintBurnResult | null>;
  reset: () => void;
}

const PROCESSING: MintBurnStatus[] = ['preparing', 'signing', 'pending', 'confirming'];

/**
 * PASS Mint / Burn 交易 Hook：
 * - Mint：校验钱包已连接、数量 > 0、余额充足（totalCost = mintAmount × costPerPass）；
 *   成功后 addHolding 增加持仓、refreshBalance 扣减余额，并按债券曲线上调新价格。
 * - Burn：校验钱包已连接、数量 > 0、持仓充足（≤ 当前持仓）；成功后 removeHolding
 *   减少持仓、refreshBalance 返还 MON（负数 spentAmount = 流入），并按曲线下调新价格。
 * - mock 模式：通过 executeMockTransaction 驱动 7 态状态机；real 模式为 Phase 2 预留。
 * - 成功后返回 { txHash, amount, newSupply, newPrice }，供页面联动更新。
 */
export function usePassMintBurn(options: UsePassMintBurnOptions = {}): UsePassMintBurnReturn {
  const { mode: modeOverride, failureRate = 0, failureReason } = options;
  const mode = resolveRunMode(modeOverride);

  const wallet = useWalletStore();
  const kolHoldings = useKolHoldingsStore();

  const [status, setStatus] = useState<MintBurnStatus>('idle');
  const [action, setAction] = useState<MintBurnAction>(null);
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

  const mintPass = useCallback(
    async (params: PassMintParams): Promise<MintBurnResult | null> => {
      const { kolHandle, mintAmount, costPerPass, currentSupply } = params;

      // ===== Mint 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      if (!Number.isFinite(mintAmount) || mintAmount <= 0) {
        setStatus('error');
        setError('Mint amount must be greater than 0');
        return null;
      }
      const totalCost = mintAmount * costPerPass;
      if (wallet.balanceMon < totalCost) {
        setStatus('error');
        setError(
          `Insufficient balance. You need ${totalCost.toFixed(2)} MON to mint ${mintAmount} PASS.`,
        );
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Mint contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setAction('mint');
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：更新持仓 + 刷新余额 + 计算新曲线状态
      kolHoldings.addHolding(kolHandle, mintAmount);
      await wallet.refreshBalance(totalCost);
      const newSupply = supplyAfterMint(currentSupply, mintAmount);
      const newPrice = curvePriceAt(newSupply, currentSupply, costPerPass);
      setAmount(mintAmount);
      setStatus('success');
      return { txHash: result.txHash, amount: mintAmount, newSupply, newPrice };
    },
    [mode, runMockTransaction, wallet, kolHoldings],
  );

  const burnPass = useCallback(
    async (params: PassBurnParams): Promise<MintBurnResult | null> => {
      const { kolHandle, burnAmount, pricePerPass, currentSupply } = params;

      // ===== Burn 前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        setError('Please connect your wallet first');
        return null;
      }
      if (!Number.isFinite(burnAmount) || burnAmount <= 0) {
        setStatus('error');
        setError('Burn amount must be greater than 0');
        return null;
      }
      const currentHolding = kolHoldings.holdings[normalizeHandle(kolHandle)] ?? 0;
      if (burnAmount > currentHolding) {
        setStatus('error');
        setError(
          `Insufficient PASS holdings. You hold ${currentHolding} PASS, but tried to burn ${burnAmount}.`,
        );
        return null;
      }

      // ===== real 模式：Phase 2 合约预留 =====
      if (mode === 'real') {
        setStatus('error');
        setError('Burn contract is not configured for real mode yet');
        return null;
      }

      // ===== mock 模式：驱动状态机 + 交易 =====
      setAction('burn');
      const result = await runMockTransaction();
      if (!result) return null;

      // 交易成功：更新持仓 + 刷新余额（负数 spentAmount = 返还流入）+ 计算新曲线状态
      const totalReturn = burnAmount * pricePerPass;
      kolHoldings.removeHolding(kolHandle, burnAmount);
      await wallet.refreshBalance(-totalReturn);
      const newSupply = supplyAfterBurn(currentSupply, burnAmount);
      const newPrice = curvePriceAt(newSupply, currentSupply, pricePerPass);
      setAmount(burnAmount);
      setStatus('success');
      return { txHash: result.txHash, amount: burnAmount, newSupply, newPrice };
    },
    [mode, runMockTransaction, wallet, kolHoldings],
  );

  return useMemo(
    () => ({ status, action, txHash, error, amount, isSubmitting, mintPass, burnPass, reset }),
    [status, action, txHash, error, amount, isSubmitting, mintPass, burnPass, reset],
  );
}
