import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Auction } from '../types';
import type { TransactionStatusType } from '../components/trade/TransactionStatus';
import { useWalletStore } from '../stores/walletStore';
import { useWriteContractTx } from '../web3/hooks/useWriteContractTx';
import { executeMockTransaction } from '../utils/mockTransaction';
import { sleep, resolveRunMode } from '../utils/transaction';
import { handleWeb3Error } from '../web3/web3Errors';

/** 出价状态 — 与交易状态机保持一致 */
export type BidStatus = TransactionStatusType;

export interface AuctionBidOptions {
  /** 运行模式：mock（默认，Phase 3 联调）/ real（Phase 2 合约，预留） */
  mode?: 'mock' | 'real';
  /** mock 模式失败概率 0-1，默认 0（用于联调错误分支） */
  failureRate?: number;
  /** mock 模式失败原因 */
  failureReason?: string;
  /** real 模式合约地址（未配置时可通过环境变量 VITE_AUCTION_CONTRACT_ADDRESS 提供） */
  contractAddress?: string;
  /** real 模式合约 ABI */
  abi?: unknown[];
}

export type PlaceBidResult =
  | { ok: true; txHash: string; amount: number }
  | { ok: false; error: string };

export interface UseAuctionBidReturn {
  status: BidStatus;
  txHash: string | null;
  error: string | null;
  /** 最近一次成功出价金额 */
  lastBidAmount: number | null;
  isSubmitting: boolean;
  placeBid: (auction: Auction, bidAmount: number) => Promise<PlaceBidResult | null>;
  reset: () => void;
}

const PROCESSING: BidStatus[] = ['preparing', 'signing', 'pending', 'confirming'];

/**
 * 拍卖出价 Hook — 便士拍卖（Penny Auction）：
 * - 每次出价金额固定（bidAmount），非自由加价
 * - 出价前校验：钱包已连接、余额充足、拍卖状态为 LIVE
 * - mock 模式：使用 executeMockTransaction 驱动 6 态状态机
 * - real 模式：委托 useWriteContractTx 发起合约 placeBid（Phase 2 预留）
 * - 成功后返回 { txHash, amount }
 */
export function useAuctionBid(options: AuctionBidOptions = {}): UseAuctionBidReturn {
  const { mode: modeOverride, failureRate = 0, failureReason, contractAddress, abi } = options;
  const mode = resolveRunMode(modeOverride);

  const wallet = useWalletStore();
  const tx = useWriteContractTx();

  const [status, setStatus] = useState<BidStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBidAmount, setLastBidAmount] = useState<number | null>(null);

  // real 模式：把通用合约 hook 的状态镜像到本地（含中间态），供页面统一消费
  useEffect(() => {
    if (mode !== 'real') return;
    setStatus(tx.status);
    setTxHash(tx.txHash);
    setError(tx.error);
  }, [mode, tx.status, tx.txHash, tx.error]);

  const isSubmitting = PROCESSING.includes(status);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
    setLastBidAmount(null);
    tx.reset();
  }, [tx]);

  const placeBid = useCallback(
    async (auction: Auction, bidAmount: number): Promise<PlaceBidResult | null> => {
      // ===== 重入保护：交易进行中拒绝重复发起 =====
      if (isSubmitting) return null;
      // ===== 出价前校验 =====
      if (!wallet.isConnected) {
        setStatus('error');
        const msg = 'Please connect your wallet first';
        setError(msg);
        return { ok: false, error: msg };
      }
      if (auction.status !== 'LIVE') {
        const msg = auction.status === 'UPCOMING' ? 'Auction has not started yet' : 'Auction has ended';
        setStatus('error');
        setError(msg);
        return { ok: false, error: msg };
      }
      if (wallet.balanceMon < bidAmount) {
        setStatus('error');
        const msg = `Insufficient balance. You need ${bidAmount.toFixed(2)} MON to place this bid.`;
        setError(msg);
        return { ok: false, error: msg };
      }

      // ===== real 模式：委托给通用合约写入 hook =====
      if (mode === 'real') {
        const target =
          contractAddress || (import.meta.env?.VITE_AUCTION_CONTRACT_ADDRESS as string | undefined);
        if (!target) {
          setStatus('error');
          const msg = 'Auction contract is not configured for real mode';
          setError(msg);
          return { ok: false, error: msg };
        }
        // 转换为 wei（18 位小数）；Phase 2 接入 provider 后从链上数据读取实际金额
        const valueWei = BigInt(Math.round(bidAmount * 1e18));
        const hash = await tx.write({
          address: target as `0x${string}`,
          abi: abi || [],
          functionName: 'placeBid',
          args: [auction.id],
          value: valueWei,
        });
        if (hash) {
          setLastBidAmount(bidAmount);
          return { ok: true, txHash: hash, amount: bidAmount };
        }
        return { ok: false, error: tx.error ?? 'Bid transaction failed' };
      }

      // ===== mock 模式：驱动 6 态状态机 + mockTransaction =====
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
          const msg = result.error || 'Bid transaction failed';
          setError(msg);
          return { ok: false, error: msg };
        }

        setStatus('success');
        setLastBidAmount(bidAmount);
        return { ok: true, txHash: result.txHash, amount: bidAmount };
      } catch (e) {
        // 统一错误处理：用户拒绝 → 静默回 idle；其余 → error 展示可读文案
        const info = handleWeb3Error(e, 'Bid transaction failed');
        if (info.silent) {
          setStatus('idle');
          setError(null);
          return { ok: false, error: '' };
        } else {
          setStatus('error');
          setError(info.message);
          return { ok: false, error: info.message };
        }
      }
    },
    [mode, contractAddress, abi, failureRate, failureReason, tx, wallet.balanceMon, wallet.isConnected, isSubmitting],
  );

  return useMemo(
    () => ({ status, txHash, error, lastBidAmount, isSubmitting, placeBid, reset }),
    [status, txHash, error, lastBidAmount, isSubmitting, placeBid, reset],
  );
}
