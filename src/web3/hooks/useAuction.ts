import { useCallback } from 'react';
import { useWatchContractEvent } from 'wagmi';
import type { Hash } from 'viem';
import { kolAuctionAbi } from '../contracts';
import type { ToastLike } from '../web3Errors';
import { useReadContract } from './useReadContract';
import { useWriteContractTx } from './useWriteContractTx';
import type { TxStatus } from './useWriteContractTx';

/** KolAuction 状态枚举（AuctionStatus，uint8） */
export const AUCTION_STATUS = {
  ACTIVE: 0,
  SETTLED: 1,
  AWAITING_CONFIRMATION: 2,
  COMPLETED: 3,
  DISPUTED: 4,
  REFUNDED: 5,
} as const;

/** KolAuction.getAuction 返回的拍卖状态（AuctionStatus 枚举值为 uint8） */
export interface AuctionData {
  id: bigint;
  kol: `0x${string}`;
  passContract: `0x${string}`;
  fixedBidAmount: bigint;
  content: string;
  itemCategory: number;
  startTime: bigint;
  endTime: bigint;
  lastBidder: `0x${string}`;
  totalBids: bigint;
  totalVolume: bigint;
  status: number;
  settled: boolean;
  winner: `0x${string}`;
  winnerTotalSpent: bigint;
  fulfillmentDeadline: bigint;
  fulfillmentTime: bigint;
  autoConfirmDeadline: bigint;
  /** KOL 履约证据哈希（SP-2 与争议证据分离） */
  fulfillmentEvidenceHash: `0x${string}`;
  /** winner 争议证据哈希 */
  disputeEvidenceHash: `0x${string}`;
  /** 仲裁裁定理由哈希（可为零，optional） */
  arbitrationNote: `0x${string}`;
}

/** 写入交易的通用选项 */
export interface AuctionTxOptions {
  /** 交易成功确认后的回调 */
  onSuccess?: (txHash: Hash, receipt: unknown) => void;
  /** 自定义 toast */
  toast?: ToastLike;
}

export interface UseAuctionResult {
  // ---- 链上读取 ----
  /** 完整拍卖状态（含固定出价金额、结束时间、结算/履约/争议状态等） */
  auctionData: AuctionData | undefined;
  /** 指定账户累计出价金额 */
  cumulativeBid: bigint | undefined;
  /** 指定账户出价次数 */
  bidCount: bigint | undefined;
  /** 最后出价人（当前领先者）的累计出价金额 */
  lastBidderCumulative: bigint | undefined;
  /** 最后出价人（当前领先者）的出价次数 */
  lastBidderBidCount: bigint | undefined;
  /** KOL 待领取的 80% 收益（仅 COMPLETED 后可领；平台 20% 已自动入国库） */
  pendingKol: bigint | undefined;
  /** 当前账户可领的退款额（0 = 不可领或已领） */
  refundable: bigint | undefined;
  /** KOL 是否已违约（超时未提交履约） */
  kolBreached: boolean | undefined;
  // ---- 链上写入 ----
  /**
   * placeBid(opts)：以固定价出价。
   * value 默认取链上 auctionData.fixedBidAmount；调用方也可通过 opts.value 显式传入。
   */
  placeBid: (opts?: { value?: bigint } & AuctionTxOptions) => Promise<Hash | null>;
  /** settle()：结束拍卖（20% 平台费自动入国库 + 锁定 80% + 固化 winner） */
  settle: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** submitFulfillment(evidenceHash)：KOL 提交履约证据 */
  submitFulfillment: (evidenceHash: `0x${string}`, opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** confirmFulfillment()：中标者确认已履约 */
  confirmFulfillment: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** autoConfirm()：窗口超时后任何人可触发自动确认 */
  autoConfirm: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** dispute(evidenceHash)：中标者在窗口内发起争议 */
  dispute: (evidenceHash: `0x${string}`, opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** resolveDispute(kolWon, reasonHash?)：仲裁角色裁定（reasonHash 为裁定理由哈希，可传 0x0） */
  resolveDispute: (kolWon: boolean, reasonHash: `0x${string}`, opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** claimRefund()：违约退款领取 */
  claimRefund: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  /** claimKol()：KOL 领取 80% 收益（仅 COMPLETED） */
  claimKol: (opts?: AuctionTxOptions) => Promise<Hash | null>;
  // ---- 交易状态（所有写入共享同一状态机） ----
  status: TxStatus;
  txHash: Hash | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
  /** 手动刷新拍卖状态 */
  refetchAuction: () => void;
  /** 拍卖合约地址未配置 */
  isAddressMissing: boolean;
}

/**
 * useAuction — 单个 KOL 拍卖合约读写封装。
 * 订阅 BidPlaced / AuctionSettled / FulfillmentSubmitted / FulfillmentConfirmed /
 * DisputeRaised / DisputeResolved / RefundClaimed 事件，任一变化自动 refetch。
 *
 * @param auctionAddress KolAuction 合约地址（来自 Registry.getKol().auctionContracts，动态获取）
 * @param account 可选，用于查询该账户的累计出价 / 出价次数 / 可退金额
 *
 * @example
 * const { auctionData, placeBid, submitFulfillment, confirmFulfillment } = useAuction(auctionAddress, address);
 */
export function useAuction(
  auctionAddress: `0x${string}` | undefined,
  account?: `0x${string}` | undefined,
): UseAuctionResult {
  const zeroAddr = '0x0000000000000000000000000000000000000000' as `0x${string}`;
  const auctionRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getAuction',
  });
  const cumulativeRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getCumulativeBid',
    args: [account ?? zeroAddr],
    query: { enabled: account !== undefined },
  });
  const bidCountRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'getBidCount',
    args: [account ?? zeroAddr],
    query: { enabled: account !== undefined },
  });
  // 最后出价人（当前领先者）的累计数据：无论是否本人，前端都可展示高价值信息
  const lastBidderCumulativeRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'lastBidderCumulative',
  });
  const lastBidderBidCountRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'lastBidderBidCount',
  });
  const pendingKolRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'pendingKol',
  });
  const refundableRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'refundable',
    args: [account ?? zeroAddr],
    query: { enabled: account !== undefined },
  });
  const kolBreachedRes = useReadContract({
    address: auctionAddress,
    abi: kolAuctionAbi,
    functionName: 'kolBreached',
  });

  const { write, status, txHash, error, isLoading, isSuccess, reset } = useWriteContractTx();

  // 事件驱动：任何相关事件都会刷新全部读取
  const refetchAll = useCallback(() => {
    auctionRes.refetch();
    cumulativeRes.refetch();
    bidCountRes.refetch();
    lastBidderCumulativeRes.refetch();
    lastBidderBidCountRes.refetch();
    pendingKolRes.refetch();
    refundableRes.refetch();
    kolBreachedRes.refetch();
  }, [
    auctionRes, cumulativeRes, bidCountRes,
    lastBidderCumulativeRes, lastBidderBidCountRes,
    pendingKolRes, refundableRes, kolBreachedRes,
  ]);

  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'BidPlaced',
    enabled: auctionAddress !== undefined,
    onLogs: () => {
      refetchAll();
      setTimeout(refetchAll, 1500); // Monad 测试网 RPC 索引延迟兜底
    },
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'AuctionSettled',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'FulfillmentSubmitted',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'FulfillmentConfirmed',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'DisputeRaised',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'DisputeResolved',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });
  useWatchContractEvent({
    address: auctionAddress,
    abi: kolAuctionAbi,
    eventName: 'RefundClaimed',
    enabled: auctionAddress !== undefined,
    onLogs: refetchAll,
  });

  const placeBid = useCallback(
    (opts: { value?: bigint } & AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      const { value, onSuccess, toast } = opts;
      const fixedBid = value ?? (auctionRes.data as AuctionData | undefined)?.fixedBidAmount;
      if (fixedBid === undefined) return Promise.resolve(null); // 尚未读到固定价，由调用方重试
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'placeBid',
        args: [],
        value: fixedBid,
        onSuccess,
        toast,
      });
    },
    [write, auctionAddress, auctionRes.data],
  );

  const settle = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'settle',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const submitFulfillment = useCallback(
    (evidenceHash: `0x${string}`, opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'submitFulfillment',
        args: [evidenceHash],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const confirmFulfillment = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'confirmFulfillment',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const autoConfirm = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'autoConfirm',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const dispute = useCallback(
    (evidenceHash: `0x${string}`, opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'dispute',
        args: [evidenceHash],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const resolveDispute = useCallback(
    (kolWon: boolean, reasonHash: `0x${string}`, opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'resolveDispute',
        args: [kolWon, reasonHash],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const claimRefund = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'claimRefund',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  const claimKol = useCallback(
    (opts: AuctionTxOptions = {}): Promise<Hash | null> => {
      if (!auctionAddress) return Promise.resolve(null);
      return write({
        address: auctionAddress,
        abi: kolAuctionAbi,
        functionName: 'claimKol',
        args: [],
        onSuccess: opts.onSuccess,
        toast: opts.toast,
      });
    },
    [write, auctionAddress],
  );

  return {
    auctionData: auctionRes.data as AuctionData | undefined,
    cumulativeBid: cumulativeRes.data as bigint | undefined,
    bidCount: bidCountRes.data as bigint | undefined,
    lastBidderCumulative: lastBidderCumulativeRes.data as bigint | undefined,
    lastBidderBidCount: lastBidderBidCountRes.data as bigint | undefined,
    pendingKol: pendingKolRes.data as bigint | undefined,
    refundable: refundableRes.data as bigint | undefined,
    kolBreached: kolBreachedRes.data as boolean | undefined,
    placeBid,
    settle,
    submitFulfillment,
    confirmFulfillment,
    autoConfirm,
    dispute,
    resolveDispute,
    claimRefund,
    claimKol,
    status,
    txHash,
    error,
    isLoading,
    isSuccess,
    reset,
    refetchAuction: auctionRes.refetch,
    isAddressMissing: auctionAddress === undefined,
  };
}
